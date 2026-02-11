import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

async function testAI() {
    console.log('[INFO] Testing Google Gemini Connection...');

    if (!process.env.GEMINI_API_KEY) {
        console.error('[ERROR] Missing GEMINI_API_KEY in .env file!');
        return;
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = "Salut! Esti un expert in cosmetica. Spune-mi pe scurt ce face acidul hialuronic.";
        console.log(`[PROMPT] "${prompt}"\n`);

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log('[SUCCESS] Response received:');
        console.log('-------------------');
        console.log(text);
        console.log('-------------------');
        console.log('[INFO] AI Integration Successful!');

    } catch (error) {
        console.error('[ERROR] AI Test Failed:', error.message);
    }
}

testAI();
