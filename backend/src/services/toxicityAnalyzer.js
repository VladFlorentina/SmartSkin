import { supabase } from '../config/supabase.js';

// --- Lista Neagra Comerciala (ingrediente legale, dar controversate dpdv mediu/iritatii) ---
// Reguli preluate pentru a "matura" scorul sa fie similar cu INCI Beauty
const COMMERCIAL_WATCHLIST = [
    { match: 'sulfate', penalty: 3, category: 'moderate', desc: 'Surfactant puternic. Poate irita pielea si scalpul. (Sulfate)' },
    { match: 'peg-', penalty: 3, category: 'moderate', desc: 'Compus etoxilat. Proces de fabricatie poluant. Permeabilizeaza pielea.' },
    { match: 'dimethicone', penalty: 3, category: 'moderate', desc: 'Silicon. Greu biodegradabil, polueaza mediul.' },
    { match: 'dimethiconol', penalty: 3, category: 'moderate', desc: 'Silicon derivat. Greu biodegradabil.' },
    { match: 'siloxane', penalty: 4, category: 'high', desc: 'Silicon ciclic. Impact negativ sever asupra mediului acvatic.' },
    { match: 'edta', penalty: 3, category: 'moderate', desc: 'Agent chelator. Foarte slab biodegradabil, transportator de metale grele in natura.' },
    { match: 'paraben', penalty: 4, category: 'high', desc: 'Conservant controversat. Potential perturbator endocrin.' },
    { match: 'bht', penalty: 4, category: 'high', desc: 'Antioxidant sintetic. Suspectat ca perturbator endocrin.' },
    { match: 'phenoxyethanol', penalty: 3, category: 'moderate', desc: 'Conservant limitat la 1%. Poate irita in cantitati mari.' },
    { match: 'fragrance', penalty: 3, category: 'moderate', desc: 'Amestec nedeclarat de chimicale. Potential alergen ridicat.' },
    { match: 'parfum', penalty: 3, category: 'moderate', desc: 'Amestec nedeclarat de chimicale. Potential alergen ridicat.' },
    { match: 'crosspolymer', penalty: 2, category: 'moderate', desc: 'Microplastic sintentic. Greu biodegradabil.' },
    { match: 'polyquaternium', penalty: 2, category: 'moderate', desc: 'Polimer sintetic antistatic. Impact asupra mediului.' },
    { match: 'guar hydroxypropyltrimonium chloride', penalty: 2, category: 'moderate', desc: 'Compus cuaternar de amoniu. Usor iritant.' },
    { match: 'cocamide mea', penalty: 3, category: 'moderate', desc: 'Amina derivata. Potential iritant si procesare toxica.' },
    { match: 'cocamide dea', penalty: 4, category: 'high', desc: 'Amina derivata. Posibil carcinogen (IARC).' }
];

function checkCommercialWatchlist(name) {
    const lowerName = name.toLowerCase();
    for (const rule of COMMERCIAL_WATCHLIST) {
        if (lowerName.includes(rule.match)) {
            return rule;
        }
    }
    return null;
}

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

    for (const rawName of ingredientNames) {
        let name = rawName.trim();
        const normalized = name.toLowerCase().replace(/\s+/g, ' ').replace(/[^\w\s\-]/g, '');

        // 1. Cauta ingredient in Supabase (Excat Match)
        let { data, error } = await supabase
            .from('ingredients')
            .select('name, score, description')
            .ilike('name', name)
            .limit(1);

        // Daca nu am gasit exact, incercam un match exact pe numele normalizat
        if (!data || data.length === 0) {
            const partialRes = await supabase
                .from('ingredients')
                .select('name, score, description')
                .ilike('name', normalized)
                .limit(1);
            data = partialRes.data;
            error = partialRes.error;
        }

        if (error) {
            console.error(`Error querying ingredient "${name}":`, error);
            // Daca e eroare tehnica
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
            // Nu e pe lista de interdictii/restrictii UE din Supabase.
            // Cautam in "Lista Neagra" generica (INCI Beauty style)
            const watchlistMatch = checkCommercialWatchlist(name);

            if (watchlistMatch) {
                ingredientsBreakdown.push({
                    name: name,
                    score: -watchlistMatch.penalty, // Punctaj negativ fals pentru scor
                    riskLevel: watchlistMatch.penalty, // 2, 3 sau 4
                    riskCategory: watchlistMatch.category,
                    description: watchlistMatch.desc
                });
            } else {
                // Ingredient 100% comun și nereglementat ca periculos/controversat
                ingredientsBreakdown.push({
                    name: name,
                    score: 0,
                    riskLevel: 0, // Nivel 0 (Verde) - Sigur 
                    riskCategory: 'safe',
                    description: 'Ingredient sigur, acceptat pe scara larga.'
                });
            }
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

    // REGULA CHEIE: ingredientul cel mai rău limitează scorul maxim
    const maxRiskLevel = Math.max(...ingredients.map(i => i.riskLevel));

    // Scor maxim posibil bazat pe cel mai rău ingredient (Stil INCI Beauty)
    const scoreCapByWorstIngredient = {
        5: 20,  // Ingredient interzis → scor max 20/100
        4: 45,  // Risc ridicat → max 45/100
        3: 70,  // Risc moderat → max 70/100
        2: 85,  // Risc scăzut → max 85/100
        1: 95,  // Risc minor → max 95/100
        0: 100  // Tot safe → poate ajunge 100
    };

    const scoreCap = scoreCapByWorstIngredient[maxRiskLevel] ?? 100;

    let score = 100;

    ingredients.forEach((ing, index) => {
        // Poziția în listă = concentrație estimată
        // Primele 5: concentrație mare, ultimele: urme
        let positionMultiplier;
        if (index < 5) positionMultiplier = 1.5;
        else if (index < 10) positionMultiplier = 1.0;
        else positionMultiplier = 0.6; // La final sunt în cantități mici

        let penalty = 0;
        switch (ing.riskLevel) {
            case 5: penalty = 40; break;  // Interzis
            case 4: penalty = 20; break;  // Risc ridicat
            case 3: penalty = 8; break;  // Risc moderat
            case 2: penalty = 0; break;  // Necunoscut → nu penaliza, doar scade cap-ul la 85.
            case 1: penalty = 1; break;  // Risc minor
            default: penalty = 0; break;  // Safe
        }

        score -= (penalty * positionMultiplier);
    });

    // Cocktail effect: dacă ai 3+ ingrediente de risc 3+, penalizare extra
    const riskyCount = ingredients.filter(i => i.riskLevel >= 3).length;
    if (riskyCount >= 3) {
        score -= (riskyCount - 2) * 5;
    }

    // Aplică cap-ul bazat pe cel mai rău ingredient
    score = Math.min(score, scoreCap);

    return Math.max(0, Math.round(score));
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
