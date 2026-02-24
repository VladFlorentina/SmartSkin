import { supabase } from '../config/supabase.js';
import { resolveUnknownIngredients } from './geminiService.js';

// --- Lista de Ingrediente Controversate ---
// Ingrediente LEGALE in UE (scor CosIng = 10) dar controversate din punct de vedere
// stiintific / de mediu / dermatologic. Se aplica CA OVERLAY si pentru ingrediente gasite in DB.
const COMMERCIAL_WATCHLIST = [
    // Compusi sulfatati
    { match: 'sulfate',                 riskLevel: 3, category: 'moderate', desc: 'Surfactant puternic. Poate irita pielea si scalpul.' },
    // Compusi PEG / etoxilati (pot contine impuritati: 1,4-dioxan, oxid de etilena)
    { match: 'peg-',                    riskLevel: 3, category: 'moderate', desc: 'Compus PEG etoxilat. Poate contine impuritati cancerigene (1,4-dioxan). Permeabilizeaza pielea.' },
    { match: '-eth-',                   riskLevel: 2, category: 'moderate', desc: 'Compus etoxilat (-eth-). Potential impuritati din procesul de fabricatie.' },
    { match: 'isoceteth',               riskLevel: 2, category: 'moderate', desc: 'Compus etoxilat. Potential impuritati din procesul de fabricatie.' },
    { match: 'ceteareth',               riskLevel: 2, category: 'moderate', desc: 'Compus etoxilat. Potential impuritati din procesul de fabricatie.' },
    { match: 'laureth',                 riskLevel: 2, category: 'moderate', desc: 'Compus etoxilat. Potential impuritati din procesul de fabricatie.' },
    // Saruri de aluminiu (antiperspirante)
    { match: 'aluminum chlorohydrate',  riskLevel: 3, category: 'moderate', desc: 'Sare de aluminiu antiperspirant. Suspectat perturbator endocrin. Se absoarbe prin piele.' },
    { match: 'aluminium chlorohydrate', riskLevel: 3, category: 'moderate', desc: 'Sare de aluminiu antiperspirant. Suspectat perturbator endocrin. Se absoarbe prin piele.' },
    { match: 'aluminum chloride',       riskLevel: 3, category: 'moderate', desc: 'Sare de aluminiu. Suspectat perturbator endocrin. Iritant.' },
    { match: 'aluminium chloride',      riskLevel: 3, category: 'moderate', desc: 'Sare de aluminiu. Suspectat perturbator endocrin. Iritant.' },
    // Uleiuri minerale / petrol
    { match: 'paraffinum liquidum',     riskLevel: 2, category: 'moderate', desc: 'Ulei mineral derivat din petrol. Ocluziv, poate impiedica respiratia pielii. Posibil contaminat cu HAP.' },
    { match: 'mineral oil',             riskLevel: 2, category: 'moderate', desc: 'Ulei mineral derivat din petrol. Ocluziv, posibil contaminat cu hidrocarburi aromatice policiclice.' },
    { match: 'petrolatum',              riskLevel: 2, category: 'moderate', desc: 'Vaselina din petrol. Ocluziva. Poate fi contaminata cu PAH (hidrocarburi cancerigene).' },
    { match: 'paraffin',                riskLevel: 1, category: 'moderate', desc: 'Derivat din petrol. Ocluziv.' },
    // Siliconi ciclici
    { match: 'siloxane',                riskLevel: 4, category: 'high',     desc: 'Silicon ciclic. Impact negativ sever asupra mediului acvatic. Bioacumulabil.' },
    { match: 'cyclomethicone',          riskLevel: 3, category: 'moderate', desc: 'Silicon ciclic volatil. Restrictionat partial in UE. Bioacumulabil in mediu.' },
    // Agenti chelatori
    { match: 'edta',                    riskLevel: 3, category: 'moderate', desc: 'Agent chelator. Slab biodegradabil, transportor de metale grele in mediu.' },
    // Antioxidanti sintetici
    { match: 'bht',                     riskLevel: 4, category: 'high',     desc: 'Antioxidant sintetic (BHT). Suspectat perturbator endocrin si potential carcinogen.' },
    { match: 'bha',                     riskLevel: 4, category: 'high',     desc: 'Antioxidant sintetic (BHA). Clasificat posibil carcinogen (IARC). Perturbator endocrin.' },
    // Parfum / Fragrance
    { match: 'fragrance',               riskLevel: 3, category: 'moderate', desc: 'Amestec nedeclarat de chimicale parfumante. Potential alergen ridicat.' },
    { match: 'parfum',                  riskLevel: 3, category: 'moderate', desc: 'Amestec nedeclarat de chimicale parfumante. Potential alergen ridicat.' },
    // Glicoli sintetici
    { match: 'propylene glycol',        riskLevel: 2, category: 'moderate', desc: 'Glicol sintetic. Iritant potential pentru piele sensibila. Poate penetra bariera cutanata.' },
    { match: 'butylene glycol',         riskLevel: 1, category: 'moderate', desc: 'Glicol sintetic. In general tolerat, potential iritant in concentratii mari.' },
    // Amine
    { match: 'cocamide mea',            riskLevel: 3, category: 'moderate', desc: 'Amina derivata. Potential iritant si procesare toxica.' },
    { match: 'cocamide dea',            riskLevel: 4, category: 'high',     desc: 'Amina dietanolamina. Posibil carcinogen (IARC grupa 2B).' },
    { match: 'triethanolamine',         riskLevel: 2, category: 'moderate', desc: 'Trietanolamina (TEA). Formeaza nitrozamine potential cancerigene in prezenta altor chimicale.' },
    // Conservanti controversati
    { match: 'methylisothiazolinone',   riskLevel: 4, category: 'high',     desc: 'Conservant cu risc foarte ridicat de alergii de contact si neurotoxicitate.' },
    { match: 'methylchloroisothiazolinone', riskLevel: 4, category: 'high', desc: 'Conservant puternic. Restrictionat in produse leave-on. Alergen de contact major.' },
    // Formaldehida si eliberatori
    { match: 'dmdm hydantoin',          riskLevel: 4, category: 'high',     desc: 'Eliberator de formaldehida. Alergen, potential carcinogen (IARC grupa 1).' },
    { match: 'imidazolidinyl urea',     riskLevel: 3, category: 'moderate', desc: 'Eliberator de formaldehida. Poate cauza alergii de contact.' },
    { match: 'quaternium-15',           riskLevel: 4, category: 'high',     desc: 'Eliberator de formaldehida. Alergen major, potential carcinogen.' },
];

// --- Sinonime comerciale -> INCI ---
// Denumiri comerciale/brevetate comune care NU apar in CosIng dar au un echivalent INCI clar.
// Cheile sunt lowercase. Valorile sunt INCI uppercase (exact cum apare in DB).
const COMMERCIAL_TO_INCI = {
    // Peptide anti-imbatranire
    'matrixyl':                      'PALMITOYL PENTAPEPTIDE-4',
    'matrixyl 3000':                 'PALMITOYL TETRAPEPTIDE-7',
    'matrixyl synthe6':              'PALMITOYL TRIPEPTIDE-38',
    'argireline':                    'ACETYL HEXAPEPTIDE-8',
    'leuphasyl':                     'ACETYL TETRAPEPTIDE-5',
    'syn-ake':                       'DIPEPTIDE DIAMINOBUTYROYL BENZYLAMIDE DIACETATE',
    'biopeptide el':                 'PALMITOYL OLIGOPEPTIDE',
    'collaxyl':                      'HEXAPEPTIDE-9',
    'rigin':                         'PALMITOYL TETRAPEPTIDE-3',
    'inyline':                       'ACETYL HEXAPEPTIDE-8',
    // Ingrediente active cu brand names
    'lumiskin':                      'UNDECYLENOYL PHENYLALANINE',
    'niacinamide b3':                'NIACINAMIDE',
    'vitamin c':                     'ASCORBIC ACID',
    'vitamin e':                     'TOCOPHEROL',
    'vitamin b5':                    'PANTHENOL',
    'pro-vitamin b5':                'PANTHENOL',
    'pro-xylane':                    'HYDROXYPROPYL TETRAHYDROPYRANTRIOL',
    'glycolic acid':                 'GLYCOLIC ACID',
    'salicylic acid':                'SALICYLIC ACID',
    'lactic acid':                   'LACTIC ACID',
    'hyaluronic acid':               'HYALURONIC ACID',
    // Extracte cu denumiri simplificate
    'aloe vera':                     'ALOE BARBADENSIS LEAF JUICE',
    'argan oil':                     'ARGANIA SPINOSA KERNEL OIL',
    'rosehip oil':                   'ROSA CANINA FRUIT OIL',
    'jojoba oil':                    'SIMMONDSIA CHINENSIS SEED OIL',
    'shea butter':                   'BUTYROSPERMUM PARKII BUTTER',
    'coconut oil':                   'COCOS NUCIFERA OIL',
    'tea tree oil':                  'MELALEUCA ALTERNIFOLIA LEAF OIL',
    'lavender oil':                  'LAVANDULA ANGUSTIFOLIA OIL',
    'castor oil':                    'RICINUS COMMUNIS SEED OIL',
    'sunflower oil':                 'HELIANTHUS ANNUUS SEED OIL',
    'sweet almond oil':              'PRUNUS AMYGDALUS DULCIS OIL',
    'hemp seed oil':                 'CANNABIS SATIVA SEED OIL',
    'green tea extract':             'CAMELLIA SINENSIS LEAF EXTRACT',
    'retinol':                       'RETINOL',
    'retinyl palmitate':             'RETINYL PALMITATE',
    // Siliconi cu nume simplificate
    'dimethicone':                   'DIMETHICONE',
    'cyclomethicone':                'CYCLOMETHICONE',
    // Conservanti cu nume scurt
    'phenoxyethanol':                'PHENOXYETHANOL',
    'kathon cg':                     'METHYLCHLOROISOTHIAZOLINONE',
    'euxyl pe 9010':                 'PHENOXYETHANOL',
    'germall plus':                  'IMIDAZOLIDINYL UREA',
    // Emollienti
    'cetyl alcohol':                 'CETYL ALCOHOL',
    'stearyl alcohol':               'STEARYL ALCOHOL',
    'glycerin':                      'GLYCERIN',
    'glycerol':                      'GLYCERIN',
    'glycerine':                     'GLYCERIN',
};

function resolveCommercialSynonym(name) {
    return COMMERCIAL_TO_INCI[name.toLowerCase().trim()] || null;
}

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

    // ============================================================
    // PARSARE INGREDIENTE - suport pentru formate multiple
    // OBF poate trimite ingrediente in formate diferite:
    //   Virgula:     "Aqua, Glycerin, Parfum"
    //   Newline:     "Aqua\nGlycerin\nParfum"
    //   Punct-virg:  "Aqua; Glycerin; Parfum"
    //   Markdown:    "_Aqua_, **Glycerin**"  (OBF foloseste markdown)
    //   Procente:    "Aqua 70%, Glycerin 5%"
    //   Asteriscuri: "Aqua*, Glycerin*"
    //   Cratime:     "Aqua - Glycerin - Parfum"
    // ============================================================

    // Pas 1: Curata formatarea OBF (markdown, procente, asteriscuri)
    let cleanedText = ingredientsText
        .replace(/_([^_]+)_/g, '$1')         // _aqua_ -> aqua
        .replace(/\*\*([^*]+)\*\*/g, '$1')   // **aqua** -> aqua
        .replace(/\*([^*]+)\*/g, '$1')        // *aqua* -> aqua
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [aqua](link) -> aqua
        .replace(/\b\d+(\.\d+)?%/g, '')      // "70%" -> ""
        .replace(/\([^)]*%[^)]*\)/g, '')     // "(70% organic)" -> ""
        .trim();

    // Pas 2: Detecteaza delimitatorul principal
    // Prioritate: virgula > punct-si-virgula > newline > cratima
    const commaCount     = (cleanedText.match(/,/g) || []).length;
    const semicolonCount = (cleanedText.match(/;/g) || []).length;
    const newlineCount   = (cleanedText.match(/\n/g) || []).length;

    let delimiter;
    if (commaCount >= semicolonCount && commaCount >= newlineCount) {
        delimiter = ',';
    } else if (semicolonCount >= newlineCount) {
        delimiter = ';';
    } else {
        delimiter = '\n';
    }

    // Pas 3: Split pe delimiter + expandare compusi "(and)"
    // Unii producatori scriu "Cetyl Alcohol (and) Glyceryl Stearate" ca o singura intrare.
    // Trebuie sa le separam inainte de matching.
    const rawTokens = cleanedText
        .split(delimiter)
        .map(ing => ing.trim().replace(/\s+/g, ' '))
        .filter(ing => ing.length > 1);

    const ingredientNames = [];
    for (const token of rawTokens) {
        // Detectam pattern "A (and) B" sau "A (AND) B"
        if (/\s*\(\s*and\s*\)\s*/i.test(token)) {
            const parts = token.split(/\s*\(\s*and\s*\)\s*/i).map(p => p.trim()).filter(p => p.length > 1);
            ingredientNames.push(...parts);
        } else {
            ingredientNames.push(token);
        }
    }

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
    // Gestionam formate specifice OCR si Open Beauty Facts:
    //   "Parfum (Fragrance)"      -> "PARFUM"
    //   "Aqua/Water/Eau"          -> incercam "AQUA", "WATER", "EAU"
    //   "Potassium Sorbate."      -> "POTASSIUM SORBATE"
    //   "Oryza Sativa (Rice)"     -> "ORYZA SATIVA"
    //   "Sodium Lauryl Sulfate*"  -> "SODIUM LAURYL SULFATE"
    // ============================================================

    /**
     * Genereaza variante de cautare pentru un singur ingredient.
     * Returneaza un array de stringuri uppercase care vor fi cautate in DB.
     */
    function getSearchVariants(rawName) {
        const variants = new Set();

        // 1. Adauga numele original uppercase
        variants.add(rawName.toUpperCase().trim());

        // 2. Sterge parantezele (sinonime OBF: "Aqua (Water)")
        let noParens = rawName.replace(/\([^)]*\)/g, '').trim().replace(/\s+/g, ' ');
        variants.add(noParens.toUpperCase());

        // 3. Sterge punctuatia de la sfarsit (punct, virgula, punct-si-virgula, asterisk)
        let noTrailing = noParens.replace(/[.,;:*]+$/, '').trim();
        variants.add(noTrailing.toUpperCase());

        // 4. Tratam slash-uri (ex: "Aqua/Water/Eau")
        //    noTrailing are deja parantezele sterse, deci orice slash ramas e in afara lor
        if (noTrailing.includes('/')) {
            const segments = noTrailing.split('/').map(s => s.trim().replace(/[.,;:*]+$/, '').trim());
            for (const seg of segments) {
                if (seg.length > 1) variants.add(seg.toUpperCase());
            }
        }

        // 5. Varianta fara cifre/caractere singure la inceput (artefacte OCR: "1 Potassium")
        const noLeadingJunk = noTrailing.replace(/^[\d\s*#]+/, '').trim();
        if (noLeadingJunk.length > 1) variants.add(noLeadingJunk.toUpperCase());

        // 6. Normalizare numere CI (coloranti): "C.I. 77891" <-> "CI 77891"
        const upper = noTrailing.toUpperCase();
        if (/^C\.I\.\s*\d/.test(upper)) {
            variants.add(upper.replace(/^C\.I\.\s*/, 'CI '));
        } else if (/^CI\s+\d/.test(upper)) {
            variants.add(upper.replace(/^CI\s+/, 'C.I. '));
        }

        // 7. Varianta cu punct la sfarsit: CosIng standardizeaza abrevierile cu punct
        //    (ex: "ALCOHOL DENAT." in DB, dar eticheta scrie "ALCOHOL DENAT" fara punct)
        if (!upper.endsWith('.')) {
            variants.add(upper + '.');
        }

        // 8. Rezolvare sinonime comerciale (ex: MATRIXYL -> PALMITOYL PENTAPEPTIDE-4)
        const synonym = resolveCommercialSynonym(rawName);
        if (synonym) variants.add(synonym);

        return [...variants].filter(v => v.length > 1);
    }

    const variantsPerIngredient = ingredientNames.map(name => getSearchVariants(name));

    // Set cu toate variantele - pentru batch query
    const allNamesToQuery = [...new Set(variantsPerIngredient.flat())];

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
    // AI FALLBACK: Rezolva ingrediente negasite in DB
    // Pasii:
    //   1. Identifica ingredientele care nu au varianta in dbMap
    //   2. Trimite-le intr-un singur batch catre Gemini
    //   3. Sinonime gasite: re-interogheaza DB si adauga in dbMap
    //   4. Ingrediente noi: insereaza in DB si adauga in dbMap
    // Astfel, loop-ul principal de mai jos va gasi totul in dbMap.
    // ============================================================
    try {
        // Colecteaza numele originale care inca nu au match
        const unknownOriginalNames = [];
        for (let i = 0; i < ingredientNames.length; i++) {
            const name = ingredientNames[i].trim();
            if (name.length <= 1 || /^\d+$/.test(name)) continue;
            const variants = variantsPerIngredient[i];
            const hasMatch = variants.some(v => dbMap.has(v));
            if (!hasMatch) unknownOriginalNames.push(name);
        }

        if (unknownOriginalNames.length > 0) {
            console.log(`[AI RESOLVE] ${unknownOriginalNames.length} ingrediente necunoscute trimise la AI:`, unknownOriginalNames);

            const aiResults = await resolveUnknownIngredients(unknownOriginalNames);

            const synonymNamesToQuery = [];
            const synonymMap = new Map(); // inci uppercase -> originalName
            const trulyNewIngredients = [];

            for (const result of aiResults) {
                if (!result || !result.input) continue;

                if (result.is_synonym && result.inci_name) {
                    // Sinonim -> vom re-interoga DB dupa INCI name
                    const inciUpper = result.inci_name.toUpperCase().trim();
                    synonymNamesToQuery.push(inciUpper);
                    synonymMap.set(inciUpper, result.input);
                } else if (!result.is_synonym) {
                    // Ingredient cu adevarat necunoscut -> vom insera in DB
                    trulyNewIngredients.push(result);
                }
            }

            // Re-interogheaza DB pentru sinonimele rezolvate
            if (synonymNamesToQuery.length > 0) {
                const { data: synonymData } = await supabase
                    .from('ingredients')
                    .select('inci_name, score, description, "Restriction", "Function"')
                    .in('inci_name', synonymNamesToQuery);

                if (synonymData) {
                    for (const ing of synonymData) {
                        const inciUpper = ing.inci_name.toUpperCase();
                        // Adauga in dbMap atat dupa INCI cat si dupa numele original
                        dbMap.set(inciUpper, ing);
                        const originalName = synonymMap.get(inciUpper);
                        if (originalName) {
                            dbMap.set(originalName.toUpperCase(), ing);
                            console.log(`[AI RESOLVE] Sinonim rezolvat: "${originalName}" -> ${ing.inci_name}`);
                        }
                    }
                }
            }

            // Insereaza ingrediente cu adevarat noi in DB (evaluare AI)
            if (trulyNewIngredients.length > 0) {
                const toInsert = trulyNewIngredients
                    .filter(r => r.inci_name !== null || r.input)
                    .map(r => ({
                        inci_name: (r.inci_name || r.input).toUpperCase().trim(),
                        score: (typeof r.score === 'number' && r.score >= -10 && r.score <= 10) ? r.score : 0,
                        description: `[AI] ${r.description || 'Ingredient evaluat de AI - nu exista in CosIng UE'}`,
                        Restriction: null,
                        Function: r.function || 'UNKNOWN'
                    }));

                const { data: insertedData, error: insertError } = await supabase
                    .from('ingredients')
                    .upsert(toInsert, { onConflict: 'inci_name', ignoreDuplicates: true })
                    .select('inci_name, score, description, "Restriction", "Function"');

                if (insertError) {
                    console.error('[AI RESOLVE] Eroare la insertie:', insertError.message);
                } else if (insertedData) {
                    for (const ing of insertedData) {
                        dbMap.set(ing.inci_name.toUpperCase(), ing);
                        // Adauga si dupa numele original scris pe produs
                        const originalResult = trulyNewIngredients.find(
                            r => (r.inci_name || r.input).toUpperCase().trim() === ing.inci_name.toUpperCase()
                        );
                        if (originalResult) {
                            dbMap.set(originalResult.input.toUpperCase(), ing);
                        }
                        console.log(`[AI RESOLVE] Ingredient nou inserat in DB: ${ing.inci_name} (score: ${ing.score})`);
                    }
                }
            }
        }
    } catch (aiError) {
        // AI fallback a esuat - continuam fara el, loop-ul va trata ca 'unknown'
        console.error('[AI RESOLVE] AI fallback esuat, continuam fara:', aiError.message);
    }

    // ============================================================
    // Construim breakdown-ul per ingredient
    // ============================================================
    const ingredientsBreakdown = [];

    for (let i = 0; i < ingredientNames.length; i++) {
        const originalName = ingredientNames[i].trim();

        // Ignora artefacte OCR: cifre singure, siruri de 1 caracter
        if (originalName.length <= 1 || /^\d+$/.test(originalName)) {
            continue;
        }

        // Incercam toate variantele generate pentru acest ingredient
        const variants = variantsPerIngredient[i];
        let dbMatch = null;
        for (const variant of variants) {
            const found = dbMap.get(variant);
            if (found) { dbMatch = found; break; }
        }

        if (dbMatch) {
            // Ingredient gasit in baza de date CosIng
            const dbRiskLevel = scoreToRiskLevel(dbMatch.score, dbMatch.Function);
            const category = getCategoryFromDescription(dbMatch.score, dbMatch.description);
            const dbDescription = buildDescription(dbMatch.description, dbMatch.Function);

            // Overlay watchlist: daca ingredientul e "safe" in CosIng (scor 10)
            // dar apare in watchlist-ul comercial, aplicam nivelul de risc din watchlist.
            // CosIng = legalitate UE, Watchlist = preocupari stiintifice/consumer suplimentare.
            const watchlistMatch = dbMatch.score === 10 ? checkCommercialWatchlist(dbMatch.inci_name) : null;
            const finalRiskLevel = watchlistMatch ? Math.max(dbRiskLevel, watchlistMatch.riskLevel) : dbRiskLevel;
            const finalCategory = watchlistMatch ? watchlistMatch.category : category;
            const finalDescription = watchlistMatch
                ? `${dbDescription} | ⚠️ ${watchlistMatch.desc}`
                : dbDescription;

            ingredientsBreakdown.push({
                name: dbMatch.inci_name,
                score: dbMatch.score,
                riskLevel: finalRiskLevel,
                riskCategory: finalCategory,
                description: finalDescription,
                restriction: dbMatch.Restriction || null,
                function: dbMatch.Function || null
            });
        } else {
            // NU s-a gasit in DB. Posibil: nume diferit, prescurtare, sau ingredient foarte nou.
            // Incercam fallback pe watchlist-ul comercial
            const watchlistMatch = checkCommercialWatchlist(originalName);

            ingredientsBreakdown.push({
                name: originalName,
                score: null,
                riskLevel: watchlistMatch ? watchlistMatch.riskLevel : 0,
                riskCategory: watchlistMatch ? watchlistMatch.category : 'unknown',
                description: watchlistMatch
                    ? `Ingredient negasit in CosIng/UE | ⚠️ ${watchlistMatch.desc}`
                    : 'Ingredient negasit in baza de date CosIng/UE',
                restriction: null,
                function: null
            });
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
