import express from 'express';
import { supabase } from '../config/supabase.js';
import { getProductByBarcode, saveToHistory, getUserHistory } from '../controllers/productController.js';
import { sendMessage } from '../controllers/aiController.js';
// import { authMiddleware } from '../middleware/auth.js'; // TODO: Faza 2

const router = express.Router();

// ========== Product Routes ==========
// GET produs dupa barcode (public - nu necesita auth deocamdata)
router.get('/products/:barcode', getProductByBarcode);

// ========== History Routes (require auth) ==========
// Deocamdata comentate pana implementam autentificarea in Faza 2
// router.post('/history', authMiddleware, saveToHistory);
// router.get('/history', authMiddleware, getUserHistory);

// Versiuni temporare fara auth pentru testare
router.post('/history', saveToHistory);
router.get('/history', getUserHistory);

// ========== AI Chatbot Routes (Faza 2 - Gemini) ==========
router.post('/chat', sendMessage);

// ========== Test Endpoint ==========
// Test endpoint pentru verificare Supabase connection
router.get('/test-ingredient', async (req, res) => {
    const { name = 'triclosan' } = req.query;

    try {
        const { data, error } = await supabase
            .from('ingredients')
            .select('*')
            .ilike('name', `%${name}%`)
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
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'CosmetiSafe API',
        version: '1.0.0'
    });
});

export default router;
