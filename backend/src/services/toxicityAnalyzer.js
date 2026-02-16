import { supabase } from '../config/supabase.js';

/**
 * Converteste score-ul din baza de date UE in risk level
 * Score UE: -10 (interzis), -5 (restrictionat), 0 (admis)
 * Risk level: 0-5 (0=safe, 5=toxic)
 */
function scoreToRiskLevel(score) {
    if (score === -10) return 5; // Interzis = risc maxim
    if (score === -5) return 3;  // Restrictionat = risc moderat-ridicat
    if (score === 0) return 0;   // Admis = sigur
    return 2; // Default pentru scoruri necunoscute
}

/**
 * Determina categoria de risc bazat pe descriere
 */
function getCategoryFromDescription(description) {
    // Normalizare text pentru a elimina diacriticele din comparatie
    const desc = (description?.toLowerCase() || '')
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (desc.includes('interzis')) return 'banned';
    if (desc.includes('restrictionat')) return 'restricted';
    if (desc.includes('colorant')) return 'safe';

    // Incearca sa detecteze din anexe
    if (desc.includes('anexa ii')) return 'banned';
    if (desc.includes('anexa iii')) return 'restricted';
    if (desc.includes('anexa iv') || desc.includes('anexa v') || desc.includes('anexa vi')) return 'safe';

    return 'unknown';
}

/**
 * Analizeaza lista de ingrediente si calculeaza scorul de siguranta
 * Foloseste datele REALE din Supabase (2,500+ ingrediente UE)
 * @param {string} ingredientsText - Lista de ingrediente (format text INCI)
 * @returns {Promise<Object>} - Rezultatul analizei
 */
export async function analyzeToxicity(ingredientsText) {
    if (!ingredientsText || ingredientsText.trim() === '') {
        return {
            safetyScore: 0,
            message: 'No ingredients found',
            ingredientsBreakdown: [],
            warnings: ['Nu s-au gasit ingrediente pentru analiza']
        };
    }

    // Parsare ingrediente (split dupa virgula si curatare)
    const ingredientNames = ingredientsText
        .split(',')
        .map(ing => ing.trim())
        .filter(ing => ing.length > 0);

    if (ingredientNames.length === 0) {
        return {
            safetyScore: 0,
            message: 'Invalid ingredients format',
            ingredientsBreakdown: [],
            warnings: ['Format invalid pentru lista ingrediente']
        };
    }

    // Query Supabase pentru toate ingredientele
    const ingredientsBreakdown = [];

    for (const name of ingredientNames) {
        // Cauta ingredient in Supabase (case-insensitive)
        const { data, error } = await supabase
            .from('ingredients')
            .select('name, score, description')
            .ilike('name', `%${name}%`)
            .limit(1);

        if (error) {
            console.error(`Error querying ingredient "${name}":`, error);
            // Daca e eroare, consideram ingredient necunoscut
            ingredientsBreakdown.push({
                name: name,
                score: 0,
                riskLevel: 2,
                riskCategory: 'unknown',
                description: 'Eroare la cautare in baza de date'
            });
            continue;
        }

        if (data && data.length > 0) {
            // Ingredient gasit in baza de date
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
            // Ingredient necunoscut - nu e in baza de date UE
            ingredientsBreakdown.push({
                name: name,
                score: 0,
                riskLevel: 2, // Neutru/necunoscut
                riskCategory: 'unknown',
                description: 'Ingredient necunoscut in baza de date UE'
            });
        }
    }

    // Calculare scor siguranta
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
/**
 * Algoritm de calcul scor toxicitate (0-100, 100 = cel mai sigur)
 * Include "Regula primelor 5" pentru a simula concentratia
 */
function calculateSafetyScore(ingredients) {
    if (ingredients.length === 0) return 0;

    let totalWeightedRisk = 0;
    let totalWeights = 0;
    let maxRisk = 0;
    let bannedCount = 0;

    ingredients.forEach((ing, index) => {
        // Pondere bazata pe pozitie (simulare concentratie)
        // Primele 5 ingrediente au greutate dubla (sunt baza produsului)
        const weight = index < 5 ? 2.0 : 1.0;

        totalWeightedRisk += ing.riskLevel * weight;
        totalWeights += weight;

        if (ing.riskLevel > maxRisk) {
            maxRisk = ing.riskLevel;
        }
        if (ing.score === -10) {
            bannedCount++;
        }
    });

    // Daca are ingrediente interzise, scorul e foarte scazut
    if (bannedCount > 0) {
        return Math.max(0, 20 - (bannedCount * 5));
    }

    // Risk level scale: 0 (safe) -> 5 (toxic)
    const avgWeightedRisk = totalWeightedRisk / totalWeights;

    // Formula: 
    // - 70% bazat pe media PONDERATA a riscului (concentratie)
    // - 30% penalizare pentru ingredientul cel mai toxic (prezenta)
    const avgComponent = (1 - avgWeightedRisk / 5) * 70;
    const maxPenalty = (maxRisk / 5) * 30;

    const score = avgComponent + (100 - maxPenalty) * 0.3;

    return Math.max(0, Math.min(100, score));
}

/**
 * Genereaza warning-uri bazate pe categorii de risc
 */
function generateWarnings(ingredients) {
    const warnings = [];

    const banned = ingredients.filter(i => i.riskCategory === 'banned' || i.score === -10);
    const restricted = ingredients.filter(i => i.riskCategory === 'restricted' || i.score === -5);
    const unknown = ingredients.filter(i => i.riskCategory === 'unknown');

    if (banned.length > 0) {
        warnings.push(`ATENTIE: ${banned.length} ingrediente INTERZISE in UE!`);
    }
    if (restricted.length > 0) {
        warnings.push(`AVERTISMENT: ${restricted.length} ingrediente restrictionate in UE`);
    }
    if (unknown.length > 0) {
        warnings.push(`INFO: ${unknown.length} ingrediente necunoscute in baza de date UE`);
    }

    const highRisk = ingredients.filter(i => i.riskLevel >= 4);
    if (highRisk.length > 0) {
        warnings.push(`RISC RIDICAT: ${highRisk.length} ingrediente cu risc ridicat`);
    }

    return warnings;
}

/**
 * Genereaza mesaj sumar bazat pe scor
 */
function getRiskSummary(score) {
    if (score >= 80) return 'Produs sigur - risc minim';
    if (score >= 60) return 'Risc scazut - acceptabil pentru majoritatea utilizatorilor';
    if (score >= 40) return 'Risc moderat - utilizati cu precautie';
    if (score >= 20) return 'Risc ridicat - nu se recomanda';
    return 'Risc foarte ridicat - contine ingrediente interzise!';
}
