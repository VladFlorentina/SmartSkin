import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import routes from './routes/index.js';
import { testConnection } from './config/supabase.js';
import { swaggerSpec } from './config/swagger.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ========== Middleware ==========
app.use(cors()); // Permite requests de la React Native
app.use(express.json({ limit: '50mb' })); // Marit la 50mb pentru pozele OCR (base64)
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Rate limiting global: max 100 request-uri per IP per minut
const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: { error: 'Prea multe cereri. Incearca din nou in cateva secunde.' }
});
app.use(globalLimiter);

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ========== Routes ==========
app.use('/api', routes);

// ========== Swagger API Docs ==========
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'CosmetiSafe API Docs'
}));
// Endpoint JSON pentru export specificatie OpenAPI
app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'CosmetiSafe API v1.0',
        endpoints: {
            health: '/api/health',
            product: '/api/products/:barcode',
            history: '/api/history',
            docs: '/api-docs'
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
    console.log(`[INFO] API endpoints: http://localhost:${PORT}/api`);
    console.log(`[INFO] API Docs (Swagger): http://localhost:${PORT}/api-docs\n`);

    // Test Supabase connection
    await testConnection();

    console.log('\n[INFO] Server ready to accept requests!\n');
});

export default app;
