import { supabase } from '../config/supabase.js';

// --- Lista Neagra Comerciala (ingrediente legale, dar controversate dpdv mediu/iritatii) ---
// Aceste reguli se aplica DOAR daca ingredientul NU este gasit in baza de date CosIng.
// Cu 30,000+ ingrediente INCI, acest fallback va fi rar folosit.
const COMMERCIAL_WATCHLIST = [
    { match: 'sulfate', penalty: 3, category: 'moderate', desc: 'Surfactant puternic. Poate irita pielea si scalpul.' },
    { match: 'peg-', penalty: 3, category: 'moderate', desc: 'Compus etoxilat. Proces de fabricatie poluant. Permeabilizeaza pielea.' },
    { match: 'siloxane', penalty: 4, category: 'high', desc: 'Silicon ciclic. Impact negativ sever asupra mediului acvatic.' },
    { match: 'edta', penalty: 3, category: 'moderate', desc: 'Agent chelator. Foarte slab biodegradabil, transportator de metale grele.' },
    { match: 'bht', penalty: 4, category: 'high', desc: 'Antioxidant sintetic. Suspectat ca perturbator endocrin.' },
    { match: 'fragrance', penalty: 3, category: 'moderate', desc: 'Amestec nedeclarat de chimicale. Potential alergen ridicat.' },
    { match: 'parfum', penalty: 3, category: 'moderate', desc: 'Amestec nedeclarat de chimicale. Potential alergen ridicat.' },
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

// --- Mapare alergii profil utilizator -> pattern-uri INCI ---
// Labelurile corespund exact optiunilor din ProfileScreen.js
const ALLERGY_TO_INGREDIENT_MAP = [
    {
        allergyLabel: 'Parfum / Fragrance',
        patterns: ['PARFUM', 'FRAGRANCE', 'LIMONENE', 'LINALOOL', 'CITRAL', 'GERANIOL',
            'EUGENOL', 'COUMARIN', 'CINNAMYL ALCOHOL', 'BENZYL ALCOHOL', 'BENZYL SALICYLATE',
            'CINNAMAL', 'FARNESOL', 'HEXYL CINNAMAL', 'HYDROXYCITRONELLAL', 'ISOEUGENOL',
            'CITRONELLOL', 'BENZYL BENZOATE', 'BENZYL CINNAMATE', 'AMYL CINNAMAL'],
    },
    {
        allergyLabel: 'Parabeni',
        patterns: ['PARABEN', 'METHYLPARABEN', 'PROPYLPARABEN', 'BUTYLPARABEN',
            'ETHYLPARABEN', 'ISOBUTYLPARABEN', 'ISOPROPYLPARABEN'],
    },
    {
        allergyLabel: 'Sulfati (SLS/SLES)',
        patterns: ['SULFATE', 'SULPHATE'],
    },
    {
        allergyLabel: 'Alcool (Alcohol Denat.)',
        patterns: ['ALCOHOL DENAT', 'SD ALCOHOL', 'DENATURED ALCOHOL'],
    },
    {
        allergyLabel: 'Coloranti sintetici',
        patterns: ['CI ', 'COLOR', 'COLOUR'],
    },
    {
        allergyLabel: 'Uleiuri esentiale',
        patterns: ['ESSENTIAL OIL'],
    },
    {
        allergyLabel: 'Lanolina',
        patterns: ['LANOLIN', 'LANOLINUM', 'ADEPS LANAE'],
    },
    {
        allergyLabel: 'Formaldehida',
        patterns: ['FORMALDEHYDE', 'DMDM HYDANTOIN', 'IMIDAZOLIDINYL UREA',
            'DIAZOLIDINYL UREA', 'SODIUM HYDROXYMETHYLGLYCINATE', 'BRONOPOL', 'QUATERNIUM-15'],
    },
    {
        allergyLabel: 'Nichel',
        patterns: ['NICKEL'],
    },
    {
        allergyLabel: 'Latex',
        patterns: ['LATEX', 'HEVEA BRASILIENSIS'],
    },
];

/**
 * Aplica avertismente personalizate bazate pe profilul utilizatorului.
 * @param {Array} ingredients - Lista de ingrediente analizate
 * @param {Object|null} userPreferences - { skin_type: string, allergies: string[] }
 * @returns {{ personalWarnings: string[], scorePenalty: number }}
 */
function applyPersonalizedWarnings(ingredients, userPreferences) {
    if (!userPreferences) return { personalWarnings: [], scorePenalty: 0 };

    const { allergies = [], skin_type } = userPreferences;
    const personalWarnings = [];
    let scorePenalty = 0;

    // Warnings pentru alergiile declarate de utilizator
    for (const allergyLabel of allergies) {
        const allergyRule = ALLERGY_TO_INGREDIENT_MAP.find(r => r.allergyLabel === allergyLabel);
        if (!allergyRule) continue;

        const matchedIngredients = ingredients.filter(ing => {
            const upperName = (ing.name || '').toUpperCase();
            return allergyRule.patterns.some(pattern => upperName.includes(pattern));
        });

        if (matchedIngredients.length > 0) {
            const names = matchedIngredients.map(i => i.name).join(', ');
            personalWarnings.push(`ALERGIE PERSONALA: Contine ${allergyLabel} (${names})`);
            scorePenalty += 15;
        }
    }

    // Warnings specifice tipului de piele
    if (skin_type === 'sensitive') {
        const fragranceAllergens = ingredients.filter(
            ing => ing.riskLevel === 2 && ing.riskCategory === 'restricted'
        );
        if (fragranceAllergens.length > 0) {
            personalWarnings.push(
                `TEN SENSIBIL: ${fragranceAllergens.length} alergeni parfumati detectati - poate irita pielea sensibila`
            );
            scorePenalty += 8;
        }
    }

    if (skin_type === 'dry') {
        const dryingIngredients = ingredients.filter(ing =>
            (ing.name || '').toUpperCase().includes('ALCOHOL DENAT')
        );
        if (dryingIngredients.length > 0) {
            personalWarnings.push('TEN USCAT: Contine Alcohol Denat. care poate usca si mai mult pielea');
            scorePenalty += 5;
        }
    }

    if (skin_type === 'oily') {
        const comedogenicPatterns = [
            'MINERAL OIL', 'PETROLATUM', 'PARAFFINUM LIQUIDUM',
            'ISOPROPYL MYRISTATE', 'ISOPROPYL PALMITATE'
        ];
        const comedogenic = ingredients.filter(ing =>
            comedogenicPatterns.some(p => (ing.name || '').toUpperCase().includes(p))
        );
        if (comedogenic.length > 0) {
            personalWarnings.push('TEN GRAS: Contine ingrediente comedogenice care pot infunda porii');
            scorePenalty += 5;
        }
    }

    // Cap: max 40 puncte penalizare personalizata
    return { personalWarnings, scorePenalty: Math.min(scorePenalty, 40) };
}

/**
 * Converteste score-ul din baza de date CosIng in risk level (0-5)
 * 
 * Score DB:  10 = Safe (fara restrictii UE)
 *             5 = Filtru UV admis (Anexa VI)
 *             0 = Colorant admis (Anexa IV) / Conservant admis (Anexa V) / Alte restrictii
 *            -5 = Restrictionat (Anexa III)
 *           -10 = Interzis (Anexa II)
 * 
 * Risk level: 0 = safe, 1 = minor, 2 = low, 3 = moderate, 4 = high, 5 = banned
 * 
 * NOTA: Alergenii parfumati (Limonene, Linalool, Citral, etc.) sunt in Anexa III
 * dar sunt prezenti in ORICE produs parfumat in concentratii mici.
 * Functia lor ajuta la diferentiere.
 */
function scoreToRiskLevel(score, dbFunction) {
    if (score === -10) return 5; // Interzis = risc maxim
    if (score === -5) {
        // Alergenii parfumati (Anexa III) cu functie exclusiv de PERFUMING/FRAGRANCE/DEODORANT
        // sunt obisnuiti si prezenti in cantitati mici - risc 2 (low), nu 3 (moderate)
        const func = (dbFunction || '').toUpperCase();
        const isPureFragrance = func && (
            func === 'PERFUMING' ||
            func === 'FRAGRANCE' ||
            func.split(',').map(f => f.trim()).every(f => 
                ['PERFUMING', 'FRAGRANCE', 'DEODORANT', 'FLAVOURING', 'TONIC', 'SKIN CONDITIONING'].includes(f)
            )
        );
        return isPureFragrance ? 2 : 3;  // Alergeni parfumati = 2, alte restrictii = 3
    }
    if (score === 0) return 1;   // Colorant/Conservant admis = risc minor (reglementat)
    if (score === 5) return 0;   // Filtru UV admis = sigur
    if (score === 10) return 0;  // Safe, fara restrictii = sigur
    return 2; // Default pentru scoruri necunoscute
}
/**
 * Determina categoria de risc bazat pe scor si descriere
 * Adaptat pentru noile descrieri in engleza din baza de date CosIng
 */
function getCategoryFromDescription(score, description) {
    const desc = (description?.toLowerCase() || '');

    // Prioritate: scorul numeric (cel mai fiabil)
    if (score === -10) return 'banned';
    if (score === -5) return 'restricted';
    if (score === 5) return 'uv_filter';
    if (score === 10) return 'safe';

    // Pentru score === 0, determinam din descriere
    if (desc.includes('colorant')) return 'colorant';
    if (desc.includes('preservative')) return 'preservative';
    if (desc.includes('carcinogen') || desc.includes('cmr')) return 'banned'; // Cazuri speciale cu score 0 dar CMR
    if (desc.includes('annex iv')) return 'colorant';
    if (desc.includes('annex v')) return 'preservative';

    return 'regulated'; // Alte restrictii
}

/**
 * Genereaza o descriere user-friendly bazata pe datele din DB
 */
function buildDescription(dbDescription, dbFunction) {
    const parts = [];

    // Adauga descrierea din DB (Prohibited/Restricted/Safe/etc.)
    if (dbDescription) {
        parts.push(dbDescription);
    }

    // Adauga functia ingredientului (SKIN CONDITIONING, EMOLLIENT, etc.)
    if (dbFunction && dbFunction.trim()) {
        const functionClean = dbFunction
            .split(',')
            .map(f => f.trim().toLowerCase().replace(/^(.)/, c => c.toUpperCase()))
            .join(', ');
        parts.push(`Functie: ${functionClean}`);
    }

    return parts.join(' | ') || 'Fara informatii';
}

/**
 * Analizeaza lista de ingrediente si calculeaza scorul de siguranta
 * Foloseste datele REALE din Supabase (~30,000 ingrediente CosIng/UE)
 * 
 * OPTIMIZARE: Face un singur query batch in loc de N queries separate
 * 
 * @param {string} ingredientsText - Lista de ingrediente (format text INCI)
 * @returns {Promise<Object>} - Rezultatul analizei
 */
/**
 * @param {string} ingredientsText - Lista de ingrediente (format text INCI)
 * @param {Object|null} userPreferences - { skin_type: string, allergies: string[] } (optional)
 * @returns {Promise<Object>} - Rezultatul analizei
 */
export async function analyzeToxicity(ingredientsText, userPreferences = null) {
    if (!ingredientsText || ingredientsText.trim() === '') {
        return {
            safetyScore: 0,
            message: 'No ingredients found',
            ingredientsBreakdown: [],
            warnings: ['Nu s-au gasit ingrediente pentru analiza'],
            personalWarnings: [],
            isPersonalized: false
        };
    }

    // Parsare ingrediente (split dupa virgula si curatare)
    const ingredientNames = ingredientsText
        .split(',')
        .map(ing => ing.trim().replace(/\s+/g, ' '))
        .filter(ing => ing.length > 0);

    if (ingredientNames.length === 0) {
        return {
            safetyScore: 0,
            message: 'Invalid ingredients format',
            ingredientsBreakdown: [],
            warnings: ['Format invalid pentru lista ingrediente'],
            personalWarnings: [],
            isPersonalized: false
        };
    }

    // ============================================================
    // NORMALIZARE NUME INCI
    // Open Beauty Facts trimite uneori formate ca:
    //   "Parfum (Fragrance)"  -> trebuie sa devina "PARFUM"
    //   "Oryza Sativa (Rice) Starch" -> "ORYZA SATIVA STARCH"
    //   "Alcohol Denat." -> "ALCOHOL DENAT."
    // Scoatem parantezele cu sinonime dar pastram numele principal
    // ============================================================
    const normalizedNames = ingredientNames.map(name => {
        // Scoate continutul din paranteze (sinonime OBF)
        // ex: "Parfum (Fragrance)" -> "Parfum"
        // ex: "Oryza Sativa (Rice) Starch" -> "Oryza Sativa  Starch"
        let cleaned = name.replace(/\([^)]*\)/g, '').trim();
        // Colpaseaza spatiile multiple ramase
        cleaned = cleaned.replace(/\s+/g, ' ').trim();
        return cleaned;
    });

    // ============================================================
    // BATCH QUERY: Incarcam TOATE ingredientele dintr-o singura cerere
    // In loc de N queries separate (una per ingredient), facem 1 singur SELECT
    // ============================================================
    const upperNames = normalizedNames.map(n => n.toUpperCase());
    // Includem si numele originale (nemodificate) ca fallback
    const upperOriginals = ingredientNames.map(n => n.toUpperCase());
    // Combinam ambele seturi unice pentru a maximiza sansa de match
    const allNamesToQuery = [...new Set([...upperNames, ...upperOriginals])];

    const { data: dbIngredients, error: dbError } = await supabase
        .from('ingredients')
        .select('inci_name, score, description, "Restriction", "Function"')
        .in('inci_name', allNamesToQuery);

    if (dbError) {
        console.error('[DB ERROR] Batch query failed:', dbError);
    }

    // Cream un Map pentru lookup rapid: INCI_NAME (uppercase) -> ingredient data
    const dbMap = new Map();
    if (dbIngredients && dbIngredients.length > 0) {
        for (const ing of dbIngredients) {
            dbMap.set(ing.inci_name.toUpperCase(), ing);
        }
    }

    console.log(`[ANALYSIS] ${ingredientNames.length} ingrediente parsate, ${dbMap.size} gasite in DB (${ingredientNames.length - dbMap.size} negasite)`);

    // ============================================================
    // Construim breakdown-ul per ingredient
    // ============================================================
    const ingredientsBreakdown = [];

    for (let i = 0; i < ingredientNames.length; i++) {
        const originalName = ingredientNames[i].trim();
        const cleanedName = normalizedNames[i];
        const upperCleaned = cleanedName.toUpperCase();
        const upperOriginal = originalName.toUpperCase();

        // 1. Cautam in rezultatul batch-ului (match pe INCI name - normalizat si original)
        const dbMatch = dbMap.get(upperCleaned) || dbMap.get(upperOriginal);

        if (dbMatch) {
            // Ingredient gasit in baza de date CosIng
            const riskLevel = scoreToRiskLevel(dbMatch.score, dbMatch.Function);
            const category = getCategoryFromDescription(dbMatch.score, dbMatch.description);
            const description = buildDescription(dbMatch.description, dbMatch.Function);

            ingredientsBreakdown.push({
                name: dbMatch.inci_name,
                score: dbMatch.score,
                riskLevel: riskLevel,
                riskCategory: category,
                description: description,
                restriction: dbMatch.Restriction || null,
                function: dbMatch.Function || null
            });
        } else {
            // NU s-a gasit in DB. Posibil: nume diferit, prescurtare, sau ingredient foarte nou.
            // Incercam fallback pe watchlist-ul comercial
            const watchlistMatch = checkCommercialWatchlist(originalName);

            if (watchlistMatch) {
                ingredientsBreakdown.push({
                    name: originalName,
                    score: -watchlistMatch.penalty,
                    riskLevel: watchlistMatch.penalty,
                    riskCategory: watchlistMatch.category,
                    description: watchlistMatch.desc,
                    restriction: null,
                    function: null
                });
            } else {
                // Ingredient necunoscut - il marcam ca "unknown" pentru transparenta
                ingredientsBreakdown.push({
                    name: originalName,
                    score: null,
                    riskLevel: 0,
                    riskCategory: 'unknown',
                    description: 'Ingredient negasit in baza de date CosIng/UE',
                    restriction: null,
                    function: null
                });
            }
        }
    }

    // Statistici de matching pentru debugging
    const foundCount = ingredientsBreakdown.filter(i => i.riskCategory !== 'unknown').length;
    const notFoundCount = ingredientsBreakdown.filter(i => i.riskCategory === 'unknown').length;

    // Calculare scor siguranta
    const score = calculateSafetyScore(ingredientsBreakdown);

    // Generare warning-uri
    const warnings = generateWarnings(ingredientsBreakdown);

    // Personalizare bazata pe profilul utilizatorului
    const { personalWarnings, scorePenalty } = applyPersonalizedWarnings(ingredientsBreakdown, userPreferences);
    const baseScore = Math.round(score);
    const personalizedScore = Math.max(0, baseScore - scorePenalty);

    return {
        safetyScore: personalizedScore,
        baseSafetyScore: baseScore,
        totalIngredients: ingredientsBreakdown.length,
        foundInDatabase: foundCount,
        notFoundInDatabase: notFoundCount,
        ingredientsBreakdown,
        warnings,
        personalWarnings,
        isPersonalized: personalWarnings.length > 0,
        riskSummary: getRiskSummary(personalizedScore),
        _source: 'supabase_cosing'
    };
}

/**
 * Algoritm de calcul scor toxicitate (0-100, 100 = cel mai sigur)
 * Include "Regula primelor 5" pentru a simula concentratia (INCI lists are ordered by concentration)
 */
function calculateSafetyScore(ingredients) {
    if (ingredients.length === 0) return 0;

    // REGULA CHEIE: ingredientul cel mai rau limiteaza scorul maxim
    const maxRiskLevel = Math.max(...ingredients.map(i => i.riskLevel));

    // Scor maxim posibil bazat pe cel mai rau ingredient (Stil INCI Beauty)
    const scoreCapByWorstIngredient = {
        5: 20,  // Ingredient interzis → scor max 20/100
        4: 45,  // Risc ridicat (watchlist) → max 45/100
        3: 70,  // Risc moderat (restrictionat UE) → max 70/100
        2: 85,  // Risc scazut → max 85/100
        1: 95,  // Risc minor (colorant/conservant reglementat) → max 95/100
        0: 100  // Tot safe → poate ajunge 100
    };

    const scoreCap = scoreCapByWorstIngredient[maxRiskLevel] ?? 100;

    let score = 100;

    ingredients.forEach((ing, index) => {
        // Pozitia in lista INCI = concentratie estimata
        // Primele 5: concentratie mare, ultimele: urme
        let positionMultiplier;
        if (index < 5) positionMultiplier = 1.5;       // Concentratie mare
        else if (index < 10) positionMultiplier = 1.0;  // Concentratie medie
        else positionMultiplier = 0.6;                   // Urme (trace amounts)

        let penalty = 0;
        switch (ing.riskLevel) {
            case 5: penalty = 40; break;  // Interzis UE
            case 4: penalty = 20; break;  // Risc ridicat (watchlist)
            case 3: penalty = 8; break;   // Restrictionat UE
            case 2: penalty = 3; break;   // Risc scazut
            case 1: penalty = 1; break;   // Risc minor (colorant/conservant reglementat)
            default: penalty = 0; break;  // Safe / unknown (nu penalizam ce nu stim)
        }

        score -= (penalty * positionMultiplier);
    });

    // Cocktail effect: daca ai 3+ ingrediente de risc 3+, penalizare extra
    const riskyCount = ingredients.filter(i => i.riskLevel >= 3).length;
    if (riskyCount >= 3) {
        score -= (riskyCount - 2) * 5;
    }

    // Aplica cap-ul bazat pe cel mai rau ingredient
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
        const names = banned.map(i => i.name).join(', ');
        warnings.push(`🚫 ATENTIE: ${banned.length} ingrediente INTERZISE in UE! (${names})`);
    }
    if (restricted.length > 0) {
        warnings.push(`⚠️ AVERTISMENT: ${restricted.length} ingrediente restrictionate in UE`);
    }
    if (unknown.length > 0) {
        warnings.push(`ℹ️ INFO: ${unknown.length} ingrediente negasite in baza de date CosIng`);
    }

    const highRisk = ingredients.filter(i => i.riskLevel >= 4);
    if (highRisk.length > 0) {
        warnings.push(`🔴 RISC RIDICAT: ${highRisk.length} ingrediente cu risc ridicat`);
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

// Exporturi pentru teste unitare
export const _testExports = {
    scoreToRiskLevel,
    getCategoryFromDescription,
    buildDescription,
    calculateSafetyScore,
    generateWarnings,
    getRiskSummary,
    checkCommercialWatchlist,
    COMMERCIAL_WATCHLIST
};
