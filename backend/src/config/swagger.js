import swaggerJsdoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'CosmetiSafe API',
            version: '1.0.0',
            description: `
API REST pentru aplicatia CosmetiSafe - Smart Cosmetic Analyzer.

**Functionalitati principale:**
- Cautare produse cosmetice dupa cod de bare (EAN-13/UPC)
- Analiza toxicitate ingrediente bazata pe baza de date CosIng/UE (~30,000 ingrediente)
- OCR pentru extragerea ingredientelor de pe eticheta (Google Gemini AI)
- Chatbot AI pentru intrebari despre produse (Google Gemini)
- Istoric personal de scanari (autentificare Supabase)

**Surse de date:**
- CosIng (Cosmetic Ingredients Database) - Comisia Europeana
- Open Beauty Facts (metadata produse)
- Google Gemini 2.5 Flash (OCR + chatbot)
            `,
            contact: {
                name: 'Vlad & Florentina',
            },
            license: {
                name: 'MIT'
            }
        },
        servers: [
            {
                url: 'http://localhost:3000/api',
                description: 'Server local de dezvoltare'
            }
        ],
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Token JWT de la Supabase Authentication'
                }
            },
            schemas: {
                IngredientBreakdown: {
                    type: 'object',
                    properties: {
                        name: { type: 'string', example: 'GLYCERIN' },
                        score: { type: 'integer', example: 10, description: 'Scor din DB CosIng (-10 la 10)' },
                        riskLevel: { type: 'integer', example: 0, description: 'Nivel risc (0=safe, 5=interzis)' },
                        riskCategory: { type: 'string', enum: ['safe', 'colorant', 'preservative', 'uv_filter', 'regulated', 'restricted', 'banned', 'unknown'] },
                        description: { type: 'string', example: 'Safe ingredient | Functie: Skin conditioning' },
                        restriction: { type: 'string', nullable: true },
                        function: { type: 'string', nullable: true, example: 'SKIN CONDITIONING, HUMECTANT' }
                    }
                },
                ToxicityAnalysis: {
                    type: 'object',
                    properties: {
                        safetyScore: { type: 'integer', example: 72, description: 'Scor siguranta (0-100, 100=cel mai sigur)' },
                        totalIngredients: { type: 'integer', example: 16 },
                        foundInDatabase: { type: 'integer', example: 14 },
                        notFoundInDatabase: { type: 'integer', example: 2 },
                        ingredientsBreakdown: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/IngredientBreakdown' }
                        },
                        warnings: { type: 'array', items: { type: 'string' } },
                        riskSummary: { type: 'string', example: 'Risc scazut - acceptabil pentru majoritatea utilizatorilor' }
                    }
                },
                ProductResponse: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', nullable: true },
                        barcode: { type: 'string', example: '5010724527481' },
                        name: { type: 'string', example: 'Batiste Dry Shampoo' },
                        brand: { type: 'string', example: 'Batiste' },
                        ingredients_list: { type: 'string' },
                        image_url: { type: 'string', nullable: true },
                        analysis: { $ref: '#/components/schemas/ToxicityAnalysis' },
                        source: { type: 'string', enum: ['cache', 'live'] }
                    }
                },
                NeedsOcrResponse: {
                    type: 'object',
                    properties: {
                        needsOcr: { type: 'boolean', example: true },
                        barcode: { type: 'string' },
                        name: { type: 'string', nullable: true },
                        brand: { type: 'string', nullable: true },
                        imageUrl: { type: 'string', nullable: true },
                        message: { type: 'string', example: 'Produsul nu a fost analizat inca. Fotografiaza eticheta cu ingredientele!' }
                    }
                },
                Error: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' }
                    }
                }
            }
        }
    },
    // Calea catre fisierele cu anotari JSDoc
    apis: ['./src/routes/*.js']
};

export const swaggerSpec = swaggerJsdoc(options);
