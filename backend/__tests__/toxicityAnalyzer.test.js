/**
 * Teste unitare pentru modulul toxicityAnalyzer.js
 * 
 * Testeaza functiile pure (fara dependinte externe) din algoritmul
 * de analiza toxicitate al aplicatiei CosmetiSafe.
 * 
 * Acoperire:
 * - scoreToRiskLevel()       - conversia score DB -> risk level
 * - getCategoryFromDescription() - categorisirea ingredientelor
 * - buildDescription()       - generarea descrierilor user-friendly
 * - calculateSafetyScore()   - algoritmul principal de scoring
 * - generateWarnings()       - generarea avertismentelor
 * - getRiskSummary()         - mesajul sumar de risc
 * - checkCommercialWatchlist() - detectia ingredientelor controversate
 */

import { describe, test, expect } from '@jest/globals';
import { _testExports } from '../src/services/toxicityAnalyzer.js';

const {
    scoreToRiskLevel,
    getCategoryFromDescription,
    buildDescription,
    calculateSafetyScore,
    generateWarnings,
    getRiskSummary,
    checkCommercialWatchlist,
    COMMERCIAL_WATCHLIST
} = _testExports;


// scoreToRiskLevel - Conversia scorului din baza de date in nivel de risc

describe('scoreToRiskLevel()', () => {
    test('score -10 (interzis UE) -> risk level 5', () => {
        expect(scoreToRiskLevel(-10)).toBe(5);
    });

    test('score -5 (restrictionat) fara functie -> risk level 3', () => {
        expect(scoreToRiskLevel(-5)).toBe(3);
        expect(scoreToRiskLevel(-5, null)).toBe(3);
        expect(scoreToRiskLevel(-5, '')).toBe(3);
    });

    test('score -5 cu functie PERFUMING (alergen parfumat) -> risk level 2', () => {
        expect(scoreToRiskLevel(-5, 'PERFUMING')).toBe(2);
        expect(scoreToRiskLevel(-5, 'FRAGRANCE')).toBe(2);
    });

    test('score -5 cu functie mixta parfum+conditionare -> risk level 2', () => {
        expect(scoreToRiskLevel(-5, 'PERFUMING, SKIN CONDITIONING')).toBe(2);
    });

    test('score -5 cu functie non-parfum (ex: ANTIMICROBIAL) -> risk level 3', () => {
        expect(scoreToRiskLevel(-5, 'ANTIMICROBIAL')).toBe(3);
    });

    test('score 0 (colorant/conservant reglementat) -> risk level 1', () => {
        expect(scoreToRiskLevel(0)).toBe(1);
    });

    test('score 5 (filtru UV admis) -> risk level 0', () => {
        expect(scoreToRiskLevel(5)).toBe(0);
    });

    test('score 10 (safe, fara restrictii) -> risk level 0', () => {
        expect(scoreToRiskLevel(10)).toBe(0);
    });

    test('score necunoscut (ex: 99) -> risk level 2 (default)', () => {
        expect(scoreToRiskLevel(99)).toBe(2);
    });
});


// getCategoryFromDescription - Categorizarea ingredientelor

describe('getCategoryFromDescription()', () => {
    test('score -10 -> banned', () => {
        expect(getCategoryFromDescription(-10, 'anything')).toBe('banned');
    });

    test('score -5 -> restricted', () => {
        expect(getCategoryFromDescription(-5, 'anything')).toBe('restricted');
    });

    test('score 5 -> uv_filter', () => {
        expect(getCategoryFromDescription(5, 'UV filter')).toBe('uv_filter');
    });

    test('score 10 -> safe', () => {
        expect(getCategoryFromDescription(10, 'no restrictions')).toBe('safe');
    });

    test('score 0 cu descriere "colorant" -> colorant', () => {
        expect(getCategoryFromDescription(0, 'Permitted colorant in Annex IV')).toBe('colorant');
    });

    test('score 0 cu descriere "preservative" -> preservative', () => {
        expect(getCategoryFromDescription(0, 'Preservative listed in Annex V')).toBe('preservative');
    });

    test('score 0 fara descriere relevanta -> regulated', () => {
        expect(getCategoryFromDescription(0, 'General regulated substance')).toBe('regulated');
    });

    test('score 0 cu descriere null -> regulated', () => {
        expect(getCategoryFromDescription(0, null)).toBe('regulated');
    });

    test('score 0 cu referinta CMR/carcinogen -> banned (caz special)', () => {
        expect(getCategoryFromDescription(0, 'CMR substance category 1A')).toBe('banned');
    });
});


// buildDescription - Generarea descrierilor user-friendly

describe('buildDescription()', () => {
    test('combina descrierea si functia ingredientului', () => {
        const result = buildDescription('Safe ingredient, no restrictions', 'SKIN CONDITIONING, EMOLLIENT');
        expect(result).toContain('Safe ingredient, no restrictions');
        expect(result).toContain('Functie:');
        expect(result).toContain('Skin conditioning');
        expect(result).toContain('Emollient');
    });

    test('returneaza doar descriere daca nu exista functie', () => {
        const result = buildDescription('Prohibited in EU', null);
        expect(result).toBe('Prohibited in EU');
    });

    test('returneaza doar functie daca nu exista descriere', () => {
        const result = buildDescription(null, 'EMOLLIENT');
        expect(result).toBe('Functie: Emollient');
    });

    test('returneaza "Fara informatii" daca ambele sunt goale', () => {
        expect(buildDescription(null, null)).toBe('Fara informatii');
        expect(buildDescription('', '')).toBe('Fara informatii');
    });
});


// calculateSafetyScore - Algoritmul principal de scoring

describe('calculateSafetyScore()', () => {
    test('lista goala -> scor 0', () => {
        expect(calculateSafetyScore([])).toBe(0);
    });

    test('toate ingredientele safe (riskLevel 0) -> scor 100', () => {
        const ingredients = [
            { name: 'AQUA', riskLevel: 0 },
            { name: 'GLYCERIN', riskLevel: 0 },
            { name: 'BUTYLENE GLYCOL', riskLevel: 0 }
        ];
        expect(calculateSafetyScore(ingredients)).toBe(100);
    });

    test('ingredient interzis (riskLevel 5) -> scor maxim 20', () => {
        const ingredients = [
            { name: 'AQUA', riskLevel: 0 },
            { name: 'BANNED_SUBSTANCE', riskLevel: 5 },
            { name: 'GLYCERIN', riskLevel: 0 }
        ];
        const score = calculateSafetyScore(ingredients);
        expect(score).toBeLessThanOrEqual(20);
        expect(score).toBeGreaterThanOrEqual(0);
    });

    test('pozitia in lista afecteaza penalizarea (concentratie INCI)', () => {
        
        const riskyFirst = Array(5).fill({ name: 'RISKY', riskLevel: 2 });

        
        const safe = Array(10).fill({ name: 'SAFE', riskLevel: 0 });
        const riskyLast = [...safe, ...Array(5).fill({ name: 'RISKY', riskLevel: 2 })];

        const scoreFirst = calculateSafetyScore(riskyFirst);
        const scoreLast = calculateSafetyScore(riskyLast);

    
        expect(scoreFirst).toBeLessThan(scoreLast);
    });

    test('cocktail effect: 3+ ingrediente de risc >=3 penalizeaza extra', () => {
        const twoBad = [
            { name: 'A', riskLevel: 3 },
            { name: 'B', riskLevel: 3 },
            { name: 'C', riskLevel: 0 },
            { name: 'D', riskLevel: 0 }
        ];
        const fourBad = [
            { name: 'A', riskLevel: 3 },
            { name: 'B', riskLevel: 3 },
            { name: 'C', riskLevel: 3 },
            { name: 'D', riskLevel: 3 }
        ];

        const scoreTwoBad = calculateSafetyScore(twoBad);
        const scoreFourBad = calculateSafetyScore(fourBad);

        
        expect(scoreFourBad).toBeLessThan(scoreTwoBad);
    });

    test('scorul nu depaseste niciodata 100', () => {
        const allSafe = Array(20).fill({ name: 'SAFE', riskLevel: 0 });
        expect(calculateSafetyScore(allSafe)).toBeLessThanOrEqual(100);
    });

    test('scorul nu scade sub 0', () => {
        const allBanned = Array(10).fill({ name: 'BAD', riskLevel: 5 });
        expect(calculateSafetyScore(allBanned)).toBeGreaterThanOrEqual(0);
    });
});


// generateWarnings - Generarea avertismentelor

describe('generateWarnings()', () => {
    test('ingrediente interzise genereaza warning cu INTERZISE', () => {
        const ingredients = [
            { name: 'GOOD', riskLevel: 0, riskCategory: 'safe', score: 10 },
            { name: 'BANNED_X', riskLevel: 5, riskCategory: 'banned', score: -10 }
        ];
        const warnings = generateWarnings(ingredients);
        expect(warnings.some(w => w.includes('INTERZISE'))).toBe(true);
        expect(warnings.some(w => w.includes('BANNED_X'))).toBe(true);
    });

    test('ingrediente restrictionate genereaza warning cu "restrictionate"', () => {
        const ingredients = [
            { name: 'LIMONENE', riskLevel: 2, riskCategory: 'restricted', score: -5 }
        ];
        const warnings = generateWarnings(ingredients);
        expect(warnings.some(w => w.includes('restrictionate'))).toBe(true);
    });

    test('ingrediente necunoscute genereaza warning informativ', () => {
        const ingredients = [
            { name: 'MYSTERY_INGREDIENT', riskLevel: 0, riskCategory: 'unknown', score: null }
        ];
        const warnings = generateWarnings(ingredients);
        expect(warnings.some(w => w.includes('negasite'))).toBe(true);
    });

    test('lista complet safe nu genereaza warnings', () => {
        const ingredients = [
            { name: 'AQUA', riskLevel: 0, riskCategory: 'safe', score: 10 },
            { name: 'GLYCERIN', riskLevel: 0, riskCategory: 'safe', score: 10 }
        ];
        const warnings = generateWarnings(ingredients);
        expect(warnings).toHaveLength(0);
    });

    test('ingrediente cu riskLevel >= 4 genereaza warning RISC RIDICAT', () => {
        const ingredients = [
            { name: 'TOXIC', riskLevel: 4, riskCategory: 'high', score: -4 }
        ];
        const warnings = generateWarnings(ingredients);
        expect(warnings.some(w => w.includes('RISC RIDICAT'))).toBe(true);
    });
});


// getRiskSummary - Mesaj sumar bazat pe scor

describe('getRiskSummary()', () => {
    test('scor >= 80 -> "sigur"', () => {
        expect(getRiskSummary(80)).toContain('sigur');
        expect(getRiskSummary(100)).toContain('sigur');
    });

    test('scor 60-79 -> "scazut"', () => {
        expect(getRiskSummary(60)).toContain('scazut');
        expect(getRiskSummary(79)).toContain('scazut');
    });

    test('scor 40-59 -> "moderat"', () => {
        expect(getRiskSummary(40)).toContain('moderat');
        expect(getRiskSummary(59)).toContain('moderat');
    });

    test('scor 20-39 -> "ridicat"', () => {
        expect(getRiskSummary(20)).toContain('ridicat');
        expect(getRiskSummary(39)).toContain('ridicat');
    });

    test('scor < 20 -> "interzise"', () => {
        expect(getRiskSummary(0)).toContain('interzise');
        expect(getRiskSummary(19)).toContain('interzise');
    });
});


// checkCommercialWatchlist - Detectia ingredientelor controversate

describe('checkCommercialWatchlist()', () => {
    test('detecteaza Sodium Lauryl Sulfate (contine "sulfate")', () => {
        const result = checkCommercialWatchlist('Sodium Lauryl Sulfate');
        expect(result).not.toBeNull();
        expect(result.match).toBe('sulfate');
    });

    test('detecteaza compusi PEG', () => {
        const result = checkCommercialWatchlist('PEG-40 Hydrogenated Castor Oil');
        expect(result).not.toBeNull();
        expect(result.match).toBe('peg-');
    });

    test('detecteaza BHT', () => {
        const result = checkCommercialWatchlist('BHT');
        expect(result).not.toBeNull();
    });

    test('detecteaza Parfum / Fragrance', () => {
        expect(checkCommercialWatchlist('Parfum')).not.toBeNull();
        expect(checkCommercialWatchlist('Fragrance')).not.toBeNull();
    });

    test('NU detecteaza ingrediente sigure', () => {
        expect(checkCommercialWatchlist('Aqua')).toBeNull();
        expect(checkCommercialWatchlist('Glycerin')).toBeNull();
        expect(checkCommercialWatchlist('Tocopherol')).toBeNull();
    });

    test('watchlist-ul are cel putin 5 reguli', () => {
        expect(COMMERCIAL_WATCHLIST.length).toBeGreaterThanOrEqual(5);
    });
});
