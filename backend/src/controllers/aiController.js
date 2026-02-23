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
        const userId = req.user?.id; // Va fi null daca nu e autentificat (momentan ok)

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
Esti CosmetiBot, un asistent AI expert in dermatologie si chimie cosmetica pentru aplicatia SmartSkin.
Rolul tau este sa ajuti utilizatorii sa inteleaga ingredientele din produsele cosmetice.

Reguli:
1. Raspunde in limba ROMANA (fara diacritice, daca e posibil).
2. Fii concis, empatic si educativ.
3. Daca un produs are ingrediente toxice, explica DE CE sunt rele, dar nu panica utilizatorul.
4. Daca nu esti sigur, spune ca esti un AI si recomanzi consultarea unui medic.
5. NU folosi emoji-uri.
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
                parts: [{ text: 'Am inteles. Sunt gata sa analizez produsul si sa raspund la intrebari despre ingrediente.' }],
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
