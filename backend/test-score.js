import { analyzeToxicity } from './src/services/toxicityAnalyzer.js';
import fs from 'fs';

async function runTest() {
    const ingredients = 'AQUA, SODIUM LAURETH SULFATE, COCAMIDOPROPYL BETAINE, GLYCERIN, PEG-7 GLYCERYL COCOATE, SODIUM CHLORIDE, SODIUM BENZOATE, CITRIC ACID, PARFUM, SALICYLIC ACID, GUAR HYDROXYPROPYLTRIMONIUM CHLORIDE, PANTHENOL, LINALOOL, LIMONENE';
    try {
        const result = await analyzeToxicity(ingredients);
        fs.writeFileSync('test-output.json', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

runTest();
