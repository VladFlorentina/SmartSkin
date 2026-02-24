import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.warn("⚠️ GEMINI_API_KEY is not defined in environment variables. AI Features will fail.");
}

const genAI = new GoogleGenerativeAI(apiKey);
// Model primar: gemini-3-flash-preview (20 cereri/zi)
// Model de rezerva: gemini-2.5-flash (20 cereri/zi) - folosit automat la atingerea limitei
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-2.5-flash';

/**
 * Detecteaza erori de limita de cereri (HTTP 429 / RESOURCE_EXHAUSTED)
 */
function isRateLimitError(error) {
    const msg = (error?.message || '').toLowerCase();
    return (
        msg.includes('429') ||
        msg.includes('quota') ||
        msg.includes('resource_exhausted') ||
        msg.includes('rate limit') ||
        msg.includes('ratelimit')
    );
}

/**
 * Trimite un prompt la Gemini, cu fallback automat pe modelul secundar daca primarul e limitat.
 * @param {string | Array} contentParts - Promptul (string simplu sau array cu imagini)
 * @returns {Promise<string>} - Textul raspunsului
 */
async function generateWithFallback(contentParts) {
    try {
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
        const result = await model.generateContent(contentParts);
        return result.response.text().trim();
    } catch (primaryError) {
        if (isRateLimitError(primaryError)) {
            console.warn(`[GEMINI] ${GEMINI_MODEL} a atins limita zilnica. Folosesc modelul de rezerva ${GEMINI_FALLBACK_MODEL}...`);
            const fallbackModel = genAI.getGenerativeModel({ model: GEMINI_FALLBACK_MODEL });
            const result = await fallbackModel.generateContent(contentParts);
            return result.response.text().trim();
        }
        throw primaryError;
    }
}

/**
 * Perform OCR on a base64 encoded image to strictly extract a comma-separated cosmetic ingredients list.
 * @param {string} base64Image - The image data strictly in base64 format (without data URL prefix)
 * @param {string} mimeType - The mime type (e.g., 'image/jpeg', 'image/png')
 * @returns {Promise<string>} - Comma-separated string of ingredients
 */
export async function extractIngredientsFromImage(base64Image, mimeType) {
    try {
        const prompt = `
            You are an expert cosmetic chemistry analyzer AI.
            The user has uploaded a photo of the back of a cosmetic product, showing the ingredients label.
            Your ONLY task is to extract the EXACT ingredients list shown on the packaging.
            
            RULES:
            1. Find the section that typically starts with "Ingredients:" or "Ingrediente:".
            2. Read all the chemical names.
            3. IGNORE ALL OTHER TEXT (such as marketing claims like "Dermatologically tested", instructions, barcodes, "Aqua/Water" variations, company names, etc.).
            4. Return ONLY a comma-separated list of the ingredients (e.g., "Aqua, Glycerin, Cetearyl Alcohol, ...").
            5. Do NOT output markdown, do not say "Here are the ingredients:". Just the raw comma-separated text.
            6. Translate "Water/Aqua" simply to "Aqua" if you see versions of it.
            7. If you genuinely cannot see any ingredients, return the exact string: "NO_INGREDIENTS_FOUND".
        `;

        const imageParts = [
            {
                inlineData: {
                    data: base64Image,
                    mimeType: mimeType
                }
            }
        ];

        const text = await generateWithFallback([prompt, ...imageParts]);

        if (text === "NO_INGREDIENTS_FOUND") {
            throw new Error('Nu am putut detecta nicio lista de ingrediente in poza trimisa.');
        }

        return text;
    } catch (error) {
        console.error('Error in extractIngredientsFromImage:', error);
        throw new Error(error.message || 'Eroare la procesarea imaginii cu Inteligenta Artificiala.');
    }
}

/**
 * Rezolva ingrediente necunoscute (negasite in baza CosIng) folosind AI.
 * Pentru fiecare ingredient, AI-ul determina:
 *   - Daca e un sinonim / denumire comerciala pentru un INCI standard -> returneaza inci_name
 *   - Daca e cu adevarat necunoscut -> evalueaza siguranta si returneaza score + descriere
 *
 * @param {string[]} unknownNames - Lista de ingrediente negasite in DB
 * @returns {Promise<Array<{
 *   input: string,
 *   is_synonym: boolean,
 *   inci_name: string|null,
 *   score: number,
 *   description: string,
 *   function: string
 * }>>}
 */
export async function resolveUnknownIngredients(unknownNames) {
    if (!unknownNames || unknownNames.length === 0) return [];

    try {
        const prompt = `You are an expert cosmetic chemistry AI. I will give you a list of cosmetic ingredient names that were NOT found in the EU CosIng database.

For EACH ingredient, you must determine one of two cases:

CASE A - It IS a known INCI ingredient but written under a trade name, synonym, common name, or abbreviation:
- Example: "MATRIXYL" is actually "PALMITOYL PENTAPEPTIDE-4"
- Example: "ALOE VERA" is actually "ALOE BARBADENSIS LEAF JUICE"
- Example: "VITAMIN C" is actually "ASCORBIC ACID"
- Set "is_synonym": true and "inci_name": the canonical INCI uppercase name

CASE B - It is a genuinely unknown or proprietary ingredient NOT in the standard INCI database:
- Set "is_synonym": false and "inci_name": null
- Assess its safety based on your knowledge of cosmetic chemistry and scientific literature
- Assign a "score" using the EU CosIng scale:
    -10 = banned/prohibited
    -5 = restricted (only allowed at certain concentrations)
    0 = regulated (allowed colorant, preservative, or UV filter with conditions)
    5 = generally safe with minor concerns
    10 = safe, no known restrictions
- Write a concise "description" in ROMANIAN (max 120 chars) explaining the ingredient
- Write a "function" in English (e.g., "HUMECTANT", "EMOLLIENT", "PRESERVATIVE", "SURFACTANT")

Return ONLY a valid JSON array. No markdown, no explanations, just the JSON.

Input ingredients:
${unknownNames.map((n, i) => `${i + 1}. "${n}"`).join('\n')}

Required output format (array with exactly ${unknownNames.length} objects, same order as input):
[
  {
    "input": "original name as given",
    "is_synonym": true or false,
    "inci_name": "CANONICAL INCI NAME" or null,
    "score": number (-10 to 10),
    "description": "Romanian description",
    "function": "ENGLISH FUNCTION"
  }
]`;

        const responseText = await generateWithFallback(prompt);

        // Curata markdown code blocks daca Gemini le adauga
        const jsonText = responseText
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/```\s*$/i, '')
            .trim();

        const parsed = JSON.parse(jsonText);

        // Validare: trebuie sa fie array cu acelasi numar de elemente
        if (!Array.isArray(parsed)) {
            console.error('[AI RESOLVE] Raspuns invalid - nu e array');
            return [];
        }

        return parsed;
    } catch (error) {
        console.error('[AI RESOLVE] Eroare la rezolvarea ingredientelor necunoscute:', error.message);
        return []; // Fallback: returnam array gol, logica existenta va trata ca "unknown"
    }
}
