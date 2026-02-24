import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../config/supabase.js';

// Initializare Gemini Client (folosind cheia din .env)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

/**
 * POST /api/chat
 * Trimite un mesaj catre AI (cu contextul produsului)
 * Body: { message, productId, contextData }
 */
export async function sendMessage(req, res) {
    try {
        const { message, productId, contextData } = req.body;
        const lang = req.body.lang || 'ro'; // 'ro' or 'en'
        const userId = req.user?.id;

        // Verifica daca avem API Key
        if (!process.env.GEMINI_API_KEY) {
            return res.status(503).json({
                error: 'AI Service Unavailable',
                message: 'Serverul nu are configurata cheia Gemini API.'
            });
        }

        // Construieste prompt-ul de sistem
        // Include datele despre produs daca exista
        let systemPrompt = `
You are CosmetiBot, an AI assistant expert in dermatology and cosmetic chemistry for the SmartSkin app.
Your role is to help users understand ingredients in cosmetic products.

Rules:
1. IMPORTANT: Respond ONLY in ${lang === 'en' ? 'ENGLISH' : 'ROMANIAN (without diacritics)'}.
   - If the user writes in a different language than your configured language, still respond in ${lang === 'en' ? 'English' : 'Romanian'}.
   - Exception: if the user explicitly asks you to switch language, you can do so.
2. Be concise, empathetic and educational.
3. If a product has toxic ingredients, explain WHY they are bad, but do not panic the user.
4. If you are not sure, say you are an AI and recommend consulting a dermatologist.
5. Do NOT use emojis.
`;

        if (contextData) {
            systemPrompt += `

CONTEXT PRODUS CURENT:
- Nume Produs: ${contextData.productName || 'Necunoscut'}
- Brand: ${contextData.brand || 'Necunoscut'}
- Ingrediente: ${contextData.ingredientsList || 'Nespecificat'}
- Scor Siguranta Calculat: ${contextData.safetyScore || 'N/A'}/100
- Ingrediente cu Risc: ${JSON.stringify(contextData.riskyIngredients || [])}

Utilizatorul intreaba despre acest produs. Raspunde specific la contextul de mai sus.
`;
        }

        // Initializeaza modelul
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

        // Construim istoricul real al conversatiei pentru Gemini
        // Formatul history primit din frontend: [{role: 'user'|'model', text: '...'}]
        const receivedHistory = req.body.history || [];

        // Istoricul Gemini incepe cu prompt-ul de sistem, urmat de conversatia reala
        const geminiHistory = [
            {
                role: 'user',
                parts: [{ text: systemPrompt }],
            },
            {
                role: 'model',
                parts: [{ text: lang === 'en'
                    ? 'Understood. I am ready to analyze the product and answer questions about its ingredients.'
                    : 'Am inteles. Sunt gata sa analizez produsul si sa raspund la intrebari despre ingrediente.'
                }],
            },
            // Adaugam istoricul real al conversatiei (mesajele anterioare)
            ...receivedHistory.map(msg => ({
                role: msg.role,
                parts: [{ text: msg.text }],
            })),
        ];

        const chat = model.startChat({ history: geminiHistory });
        const result = await chat.sendMessage(message);
        const responseText = result.response.text();

        // Salveaza conversatia in baza de date (daca avem User ID)
        if (userId) {
            await supabase.from('ai_conversations').insert({
                user_id: userId,
                product_id: productId || null,
                message: message,
                response: responseText
            });
        }

        return res.json({
            response: responseText,
            success: true
        });

    } catch (error) {
        console.error('Error in AI Chat:', error);
        return res.status(500).json({
            error: 'AI Error',
            message: 'Nu am putut procesa mesajul. Te rog incearca mai tarziu.'
        });
    }
}
