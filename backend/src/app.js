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
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;


const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(','). map(o => o.trim())
    : null;

app.use(cors(
    allowedOrigins
        ? {
            origin: (origin, callback) => {
                
                if (!origin || allowedOrigins.includes(origin)) {
                    callback(null, true);
                } else {
                    callback(new Error(`CORS: originea "${origin}" nu este permisa.`));
                }
            },
            credentials: true
          }
        : {} 
));
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));


const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: { error: 'Too many requests. Please try again in a few seconds.' }
});
app.use(globalLimiter);


app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});


app.use('/api', routes);


if (process.env.NODE_ENV !== 'production') {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'CosmetiSafe API Docs'
    }));
   
    app.get('/api-docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
    });
}


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


app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});


app.listen(PORT, async () => {
    console.log(`\n[INFO] CosmetiSafe Backend running on http://localhost:${PORT}`);
    console.log(`[INFO] API endpoints: http://localhost:${PORT}/api`);
    console.log(`[INFO] API Docs (Swagger): http://localhost:${PORT}/api-docs\n`);

    
    await testConnection();

    console.log('\n[INFO] Server ready to accept requests!\n');
});

export default app;
