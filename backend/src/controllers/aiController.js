import { supabase } from '../config/supabase.js';
import { generateChatWithFallback } from '../services/geminiService.js';

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
                message: 'The server does not have the Gemini API key configured.'
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

        // Trimite mesajul cu fallback automat la atingerea limitei zilnice
        const responseText = await generateChatWithFallback(geminiHistory, message);

        // Salveaza conversatia in baza de date (fire-and-forget)
        // NU await - un esec la salvare nu trebuie sa blocheze/distruga raspunsul AI
        if (userId) {
            (async () => {
                try {
                    await supabase.from('ai_conversations').insert({
                        user_id: userId,
                        product_id: productId || null,
                        message: message,
                        response: responseText
                    });
                } catch (err) {
                    console.error('[DB] Eroare la salvarea conversatiei:', err.message);
                }
            })();
        }

        return res.json({
            response: responseText,
            success: true
        });

    } catch (error) {
        console.error('Error in AI Chat:', error.message || error);
        return res.status(500).json({
            error: 'AI Error',
            message: 'Could not process the message. Please try again later.',
            detail: process.env.NODE_ENV !== 'production' ? error.message : undefined
        });
    }
}
