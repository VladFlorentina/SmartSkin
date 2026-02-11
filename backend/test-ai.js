import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

async function testAI() {
    console.log('🤖 Testing Google Gemini Connection...');

    if (!process.env.GEMINI_API_KEY) {
        console.error('❌ Missing GEMINI_API_KEY in .env file!');
        return;
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = "Salut! Ești un expert în cosmetică. Spune-mi pe scurt ce face acidul hialuronic.";
        console.log(`🗣️ Prompt: "${prompt}"\n`);

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log('✅ Response received:');
        console.log('-------------------');
        console.log(text);
        console.log('-------------------');
        console.log('✨ AI Integration Successful!');

    } catch (error) {
        console.error('❌ AI Test Failed:', error.message);
    }
}

testAI();
