import express from 'express';
import rateLimit from 'express-rate-limit';
import { supabase } from '../config/supabase.js';
import { getProductByBarcode, saveToHistory, getUserHistory, addManualProduct, searchProducts, reportProductIssue } from '../controllers/productController.js';
import { sendMessage, getChatHistory } from '../controllers/aiController.js';
import { getStats, getReports, deleteReport } from '../controllers/adminController.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';
import { adminMiddleware } from '../middleware/admin.js';

const router = express.Router();

// Rate limiter strict pentru AI chat 
const chatLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10, // Max 10 mesaje AI per minut per IP
    message: { error: 'Too many AI messages. Please wait a minute.' }
});

// Rate limiter pentru OCR 
const ocrLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5, // Max 5 scanari OCR per minut per IP
    message: { error: 'Too many OCR requests. Please wait a minute.' }
});

// Rate limiter pentru cautare produse face 3 cereri externe in paralel
const searchLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30, // Max 30 cautari per minut per IP
    message: { error: 'Too many search requests. Please wait a minute.' }
});

// ========== Product Routes ==========

/**
 * @swagger
 * /products/{barcode}:
 *   get:
 *     summary: Returneaza informatii despre produs si analiza de toxicitate
 *     description: |
 *       Cauta produsul in cache Supabase, apoi in OpenBeautyFacts.
 *       Daca produsul nu are ingrediente => returneaza needsOcr: true.
 *       Daca utilizatorul e autentificat, analiza este personalizata pe profilul sau.
 *     tags: [Produse]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: barcode
 *         required: true
 *         schema:
 *           type: string
 *         description: Codul de bare EAN-13 / EAN-8 / UPC al produsului
 *     responses:
 *       200:
 *         description: Date produs + analiza toxicitate (sau needsOcr=true)
 *       400:
 *         description: Barcode invalid
 *       500:
 *         description: Eroare server
 * /products/manual:
 *   post:
 *     summary: Adauga manual un produs prin OCR (Gemini Vision)
 *     description: |
 *       Primeste o poza cu eticheta de ingrediente, extrage textul cu Gemini OCR,
 *       analizeaza toxicitatea si salveaza produsul in baza de date.
 *       Rate limitat la 5 cereri/minut.
 *     tags: [Produse]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, base64Image]
 *             properties:
 *               barcode:
 *                 type: string
 *               name:
 *                 type: string
 *               brand:
 *                 type: string
 *               base64Image:
 *                 type: string
 *               mimeType:
 *                 type: string
 *                 default: image/jpeg
 *     responses:
 *       200:
 *         description: Produs analizat si salvat cu succes
 *       400:
 *         description: Input invalid
 *       500:
 *         description: Eroare OCR sau server
 */
// GET cautare produse dupa nume (Supabase cache + OBF + Makeup API)
router.get('/products/search', searchLimiter, searchProducts);

// GET produs dupa barcode - optional auth pentru personalizare analiza
router.get('/products/:barcode', optionalAuthMiddleware, getProductByBarcode);

// POST adaugare produs manual + OCR (rate limited, auth obligatoriu pentru a proteja creditele Gemini)
router.post('/products/manual', ocrLimiter, authMiddleware, addManualProduct);

// POST raportare produs (feedback)
router.post('/products/report', authMiddleware, reportProductIssue);

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
router.get('/chat/history/:productId', authMiddleware, getChatHistory);

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

// ========== Admin Routes ==========
router.get('/admin/stats', authMiddleware, adminMiddleware, getStats);
router.get('/admin/reports', authMiddleware, adminMiddleware, getReports);
router.delete('/admin/reports/:id', authMiddleware, adminMiddleware, deleteReport);

export default router;
