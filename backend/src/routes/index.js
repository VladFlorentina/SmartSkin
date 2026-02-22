import express from 'express';
import rateLimit from 'express-rate-limit';
import { supabase } from '../config/supabase.js';
import { getProductByBarcode, saveToHistory, getUserHistory, addManualProduct } from '../controllers/productController.js';
import { sendMessage } from '../controllers/aiController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Rate limiter strict pentru AI chat (consuma credite Gemini)
const chatLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10, // Max 10 mesaje AI per minut per IP
    message: { error: 'Prea multe mesaje catre AI. Asteapta un minut.' }
});

// Rate limiter pentru OCR (consuma credite Gemini)
const ocrLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5, // Max 5 scanari OCR per minut per IP
    message: { error: 'Prea multe cereri OCR. Asteapta un minut.' }
});

// ========== Product Routes ==========

/**
 * @swagger
 * /products/{barcode}:
 *   get:
 *     summary: Cauta un produs dupa codul de bare
 *     description: |
 *       Cauta produsul in cache-ul comunitar (Supabase), apoi in Open Beauty Facts.
 *       Daca nu gaseste ingrediente, returneaza `needsOcr: true` pentru a solicita OCR.
 *     tags: [Produse]
 *     parameters:
 *       - in: path
 *         name: barcode
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 8
 *         description: Codul de bare EAN-13/UPC al produsului
 *         example: "5010724527481"
 *     responses:
 *       200:
 *         description: Produs gasit cu analiza toxicitate SAU flag needsOcr
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ProductResponse'
 *                 - $ref: '#/components/schemas/NeedsOcrResponse'
 *       400:
 *         description: Format cod de bare invalid
 *       500:
 *         description: Eroare server
 */
router.get('/products/:barcode', getProductByBarcode);

/**
 * @swagger
 * /products/manual:
 *   post:
 *     summary: Adauga produs manual cu OCR (fotografie eticheta)
 *     description: |
 *       Trimite o fotografie (base64) a etichetei cu ingrediente.
 *       Google Gemini AI extrage ingredientele via OCR, apoi se ruleaza analiza de toxicitate.
 *       Produsul este salvat in cache-ul comunitar pentru utilizatorii viitori.
 *     tags: [Produse]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [barcode, imageBase64]
 *             properties:
 *               barcode:
 *                 type: string
 *                 example: "5010724527481"
 *               imageBase64:
 *                 type: string
 *                 description: Imagine fotografie in format base64 (max 10MB)
 *               mimeType:
 *                 type: string
 *                 default: "image/jpeg"
 *                 enum: [image/jpeg, image/png, image/webp]
 *               productName:
 *                 type: string
 *                 example: "Sampon Batiste"
 *               productBrand:
 *                 type: string
 *                 example: "Batiste"
 *     responses:
 *       200:
 *         description: Produs adaugat si analizat cu succes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductResponse'
 *       400:
 *         description: Date invalide (imagine prea mare, format gresit, etc.)
 *       429:
 *         description: Rate limit depasit (max 5 OCR/minut)
 *       500:
 *         description: Eroare OCR sau server
 */
router.post('/products/manual', ocrLimiter, addManualProduct);

// ========== History Routes (require auth) ==========

/**
 * @swagger
 * /history:
 *   post:
 *     summary: Salveaza un produs scanat in istoricul personal
 *     description: Necesita autentificare. Salveaza barcode-ul si metadata in tabelul scanned_products.
 *     tags: [Istoric]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [barcode]
 *             properties:
 *               barcode:
 *                 type: string
 *               name:
 *                 type: string
 *               brand:
 *                 type: string
 *               safetyScore:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Salvat cu succes
 *       401:
 *         description: Neautentificat
 *   get:
 *     summary: Returneaza istoricul personal de scanari
 *     description: Necesita autentificare. Returneaza ultimele 50 produse scanate.
 *     tags: [Istoric]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de produse scanate
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 history:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       barcode:
 *                         type: string
 *                       name:
 *                         type: string
 *                       brand:
 *                         type: string
 *                       safetyScore:
 *                         type: integer
 *                       scanned_at:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Neautentificat
 */
router.post('/history', authMiddleware, saveToHistory);
router.get('/history', authMiddleware, getUserHistory);

// ========== AI Chatbot Routes (protejat cu auth + rate limit) ==========

/**
 * @swagger
 * /chat:
 *   post:
 *     summary: Trimite un mesaj catre CosmetiBot (AI Assistant)
 *     description: |
 *       Chatbot bazat pe Google Gemini 2.5 Flash. Raspunde la intrebari despre
 *       produse cosmetice, ingrediente, si recomandari personalizate.
 *       Necesita autentificare + rate limitat la 10 mesaje/minut.
 *     tags: [AI Chatbot]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message:
 *                 type: string
 *                 example: "De ce acest produs nu este bun pentru tenul sensibil?"
 *               product:
 *                 type: object
 *                 description: Context produs (optional, pentru intrebari specifice)
 *                 properties:
 *                   name:
 *                     type: string
 *                   ingredients_list:
 *                     type: string
 *                   analysis:
 *                     type: object
 *     responses:
 *       200:
 *         description: Raspuns de la AI
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 response:
 *                   type: string
 *                   description: Raspunsul generat de AI in limba romana
 *       401:
 *         description: Neautentificat
 *       429:
 *         description: Rate limit depasit (max 10 mesaje/minut)
 */
router.post('/chat', chatLimiter, authMiddleware, sendMessage);

// ========== Test Endpoint ==========

/**
 * @swagger
 * /test-ingredient:
 *   get:
 *     summary: Testeaza cautarea unui ingredient in baza de date CosIng
 *     description: Endpoint de test/debug. Cauta un ingredient dupa nume (partial match).
 *     tags: [Debug]
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *           default: GLYCERIN
 *         description: Numele ingredientului de cautat
 *     responses:
 *       200:
 *         description: Rezultate cautare
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 query:
 *                   type: string
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/IngredientBreakdown'
 *                 count:
 *                   type: integer
 */
router.get('/test-ingredient', async (req, res) => {
    const { name = 'GLYCERIN' } = req.query;

    try {
        const { data, error } = await supabase
            .from('ingredients')
            .select('inci_name, score, description, "Restriction", "Function"')
            .ilike('inci_name', `%${name}%`)
            .limit(5);

        res.json({
            success: !error,
            query: name,
            results: data || [],
            count: data?.length || 0,
            error: error?.message || null
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ========== Health Check ==========

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Verifica statusul API-ului
 *     tags: [Sistem]
 *     responses:
 *       200:
 *         description: API functional
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 service:
 *                   type: string
 *                   example: CosmetiSafe API
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 */
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'CosmetiSafe API',
        version: '1.0.0'
    });
});

export default router;
