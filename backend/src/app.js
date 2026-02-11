import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes/index.js';
import { testConnection } from './config/supabase.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ========== Middleware ==========
app.use(cors()); // Permite requests de la React Native
app.use(express.json()); // Parse JSON bodies

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ========== Routes ==========
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'CosmetiSafe API v1.0',
        endpoints: {
            health: '/api/health',
            product: '/api/products/:barcode',
            history: '/api/history'
        }
    });
});

// ========== Error Handler ==========
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});

// ========== Server Start ==========
app.listen(PORT, async () => {
    console.log(`\n[INFO] CosmetiSafe Backend running on http://localhost:${PORT}`);
    console.log(`[INFO] API endpoints: http://localhost:${PORT}/api\n`);

    // Test Supabase connection
    await testConnection();

    console.log('\n[INFO] Server ready to accept requests!\n');
});

export default app;
