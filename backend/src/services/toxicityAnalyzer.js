import { supabase } from '../config/supabase.js';

/**
 * Convertește score-ul din baza de date UE în risk level
 * Score UE: -10 (interzis), -5 (restricționat), 0 (admis)
 * Risk level: 0-5 (0=safe, 5=toxic)
 */
function scoreToRiskLevel(score) {
    if (score === -10) return 5; // Interzis = risc maxim
    if (score === -5) return 3;  // Restricționat = risc moderat-ridicat
    if (score === 0) return 0;   // Admis = sigur
    return 2; // Default pentru scoruri necunoscute
}

/**
 * Determină categoria de risc bazat pe descriere
 */
function getCategoryFromDescription(description) {
    const desc = description?.toLowerCase() || '';

    if (desc.includes('interzis')) return 'banned';
    if (desc.includes('restricționat') || desc.includes('restrictionat')) return 'restricted';
    if (desc.includes('colorant')) return 'safe';

    // Încearcă să detecteze din anexe
    if (desc.includes('anexa ii')) return 'banned';
    if (desc.includes('anexa iii')) return 'restricted';
    if (desc.includes('anexa iv') || desc.includes('anexa v') || desc.includes('anexa vi')) return 'safe';

    return 'unknown';
}

/**
 * Analizează lista de ingrediente și calculează scorul de siguranță
 * Folosește datele REALE din Supabase (2,500+ ingrediente UE)
 * @param {string} ingredientsText - Lista de ingrediente (format text INCI)
 * @returns {Promise<Object>} - Rezultatul analizei
 */
export async function analyzeToxicity(ingredientsText) {
    if (!ingredientsText || ingredientsText.trim() === '') {
        return {
            safetyScore: 0,
            message: 'No ingredients found',
            ingredientsBreakdown: [],
            warnings: ['Nu s-au găsit ingrediente pentru analiză']
        };
    }

    // Parsare ingrediente (split după virgulă și curățare)
    const ingredientNames = ingredientsText
        .split(',')
        .map(ing => ing.trim())
        .filter(ing => ing.length > 0);

    if (ingredientNames.length === 0) {
        return {
            safetyScore: 0,
            message: 'Invalid ingredients format',
            ingredientsBreakdown: [],
            warnings: ['Format invalid pentru listă ingrediente']
        };
    }

    // Query Supabase pentru toate ingredientele
    const ingredientsBreakdown = [];

    for (const name of ingredientNames) {
        // Caută ingredient în Supabase (case-insensitive)
        const { data, error } = await supabase
            .from('ingredients')
            .select('name, score, description')
            .ilike('name', `%${name}%`)
            .limit(1);

        if (error) {
            console.error(`Error querying ingredient "${name}":`, error);
            // Dacă e eroare, considerăm ingredient necunoscut
            ingredientsBreakdown.push({
                name: name,
                score: 0,
                riskLevel: 2,
                riskCategory: 'unknown',
                description: 'Eroare la căutare în baza de date'
            });
            continue;
        }

        if (data && data.length > 0) {
            // Ingredient găsit în baza de date
            const ingredient = data[0];
            const riskLevel = scoreToRiskLevel(ingredient.score);
            const category = getCategoryFromDescription(ingredient.description);

            ingredientsBreakdown.push({
                name: ingredient.name,
                score: ingredient.score,
                riskLevel: riskLevel,
                riskCategory: category,
                description: ingredient.description
            });
        } else {
            // Ingredient necunoscut - nu e în baza de date UE
            ingredientsBreakdown.push({
                name: name,
                score: 0,
                riskLevel: 2, // Neutru/necunoscut
                riskCategory: 'unknown',
                description: 'Ingredient necunoscut în baza de date UE'
            });
        }
    }

    // Calculare scor siguranță
    const score = calculateSafetyScore(ingredientsBreakdown);

    // Generare warning-uri
    const warnings = generateWarnings(ingredientsBreakdown);

    return {
        safetyScore: Math.round(score),
        totalIngredients: ingredientsBreakdown.length,
        ingredientsBreakdown,
        warnings,
        riskSummary: getRiskSummary(score),
        _source: 'supabase' // Flag pentru debugging
    };
}

/**
 * Algoritm de calcul scor toxicitate (0-100, 100 = cel mai sigur)
 */
function calculateSafetyScore(ingredients) {
    if (ingredients.length === 0) return 0;

    let totalRisk = 0;
    let maxRisk = 0;
    let bannedCount = 0;

    ingredients.forEach(ing => {
        totalRisk += ing.riskLevel;
        if (ing.riskLevel > maxRisk) {
            maxRisk = ing.riskLevel;
        }
        if (ing.score === -10) {
            bannedCount++;
        }
    });

    // Dacă are ingrediente interzise, scorul e foarte scăzut
    if (bannedCount > 0) {
        return Math.max(0, 20 - (bannedCount * 5));
    }

    // Risk level scale: 0 (safe) → 5 (toxic)
    const avgRisk = totalRisk / ingredients.length;

    // Formula: 
    // - 60% bazat pe media riscului
    // - 40% penalizare pentru ingredientul cel mai toxic
    const avgComponent = (1 - avgRisk / 5) * 60;
    const maxPenalty = (maxRisk / 5) * 40;

    const score = avgComponent + (100 - maxPenalty) * 0.4;

    return Math.max(0, Math.min(100, score));
}

/**
 * Generează warning-uri bazate pe categorii de risc
 */
function generateWarnings(ingredients) {
    const warnings = [];

    const banned = ingredients.filter(i => i.riskCategory === 'banned' || i.score === -10);
    const restricted = ingredients.filter(i => i.riskCategory === 'restricted' || i.score === -5);
    const unknown = ingredients.filter(i => i.riskCategory === 'unknown');

    if (banned.length > 0) {
        warnings.push(`🚨 ATENȚIE: ${banned.length} ingrediente INTERZISE în UE!`);
    }
    if (restricted.length > 0) {
        warnings.push(`⚠️ ${restricted.length} ingrediente restricționate în UE`);
    }
    if (unknown.length > 0) {
        warnings.push(`ℹ️ ${unknown.length} ingrediente necunoscute în baza de date UE`);
    }

    const highRisk = ingredients.filter(i => i.riskLevel >= 4);
    if (highRisk.length > 0) {
        warnings.push(`🔴 ${highRisk.length} ingrediente cu risc ridicat`);
    }

    return warnings;
}

/**
 * Generează mesaj sumar bazat pe scor
 */
function getRiskSummary(score) {
    if (score >= 80) return 'Produs sigur - risc minim';
    if (score >= 60) return 'Risc scăzut - acceptabil pentru majoritatea utilizatorilor';
    if (score >= 40) return 'Risc moderat - utilizați cu precauție';
    if (score >= 20) return 'Risc ridicat - nu se recomandă';
    return 'Risc foarte ridicat - conține ingrediente interzise!';
}
