import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../config/supabase.js';

// Inițializare Gemini Client (folosind cheia din .env)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * POST /api/chat
 * Trimite un mesaj către AI (cu contextul produsului)
 * Body: { message, productId, contextData }
 */
export async function sendMessage(req, res) {
    try {
        const { message, productId, contextData } = req.body;
        const userId = req.user?.id; // Va fi null dacă nu e autentificat (momentan ok)

        // Verifică dacă avem API Key
        if (!process.env.GEMINI_API_KEY) {
            return res.status(503).json({
                error: 'AI Service Unavailable',
                message: 'Serverul nu are configurată cheia Gemini API.'
            });
        }

        // Construiește prompt-ul de sistem
        // Include datele despre produs dacă există
        let systemPrompt = `
Ești CosmetiBot, un asistent AI expert în dermatologie și chimie cosmetică pentru aplicația SmartSkin.
Rolul tău este să ajuți utilizatorii să înțeleagă ingredientele din produsele cosmetice.

Reguli:
1. Răspunde în limba ROMÂNĂ.
2. Fii concis, empatic și educativ.
3. Dacă un produs are ingrediente toxice, explică DE CE sunt rele, dar nu panica utilizatorul.
4. Dacă nu ești sigur, spune că ești un AI și recomanzi consultarea unui medic.
5. Folosește emoji-uri pentru a face textul prietenos.
`;

        if (contextData) {
            systemPrompt += `

CONTEXT PRODUS CURENT:
- Nume Produs: ${contextData.productName || 'Necunoscut'}
- Brand: ${contextData.brand || 'Necunoscut'}
- Ingrediente: ${contextData.ingredientsList || 'Nespecificat'}
- Scor Siguranță Calculat: ${contextData.safetyScore || 'N/A'}/100
- Ingrediente cu Risc: ${JSON.stringify(contextData.riskyIngredients || [])}

Utilizatorul întreabă despre acest produs. Răspunde specific la contextul de mai sus.
`;
        }

        // Inițializează modelul
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Trimite mesajul + istoric (simplificat pentru demo)
        // În producție am încărca și istoricul conversației anterioare
        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: systemPrompt }],
                },
                {
                    role: "model",
                    parts: [{ text: "Am înțeles. Sunt gata să analizez produsul și să răspund la întrebări despre ingrediente." }],
                },
            ],
        });

        const result = await chat.sendMessage(message);
        const responseText = result.response.text();

        // Salvează conversația în baza de date (dacă avem User ID)
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
            message: 'Nu am putut procesa mesajul. Te rog încearcă mai târziu.'
        });
    }
}
