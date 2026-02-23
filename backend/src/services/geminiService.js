import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.warn("⚠️ GEMINI_API_KEY is not defined in environment variables. AI Features will fail.");
}

const genAI = new GoogleGenerativeAI(apiKey);
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

/**
 * Perform OCR on a base64 encoded image to strictly extract a comma-separated cosmetic ingredients list.
 * @param {string} base64Image - The image data strictly in base64 format (without data URL prefix)
 * @param {string} mimeType - The mime type (e.g., 'image/jpeg', 'image/png')
 * @returns {Promise<string>} - Comma-separated string of ingredients
 */
export async function extractIngredientsFromImage(base64Image, mimeType) {
    try {
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

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

        const result = await model.generateContent([prompt, ...imageParts]);
        const response = await result.response;
        const text = response.text().trim();

        if (text === "NO_INGREDIENTS_FOUND") {
            throw new Error('Nu am putut detecta nicio lista de ingrediente in poza trimisa.');
        }

        return text;
    } catch (error) {
        console.error('Error in extractIngredientsFromImage:', error);
        throw new Error(error.message || 'Eroare la procesarea imaginii cu Inteligenta Artificiala.');
    }
}
