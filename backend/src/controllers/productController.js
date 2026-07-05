import { supabase } from '../config/supabase.js';
import { fetchProductMetadata, searchProductsByName } from '../services/openBeautyFacts.js';
import { analyzeToxicity } from '../services/toxicityAnalyzer.js';
import { extractIngredientsFromImage } from '../services/geminiService.js';
import { searchMakeupByName } from '../services/makeupApiService.js';
import { randomUUID } from 'crypto';

/**
 * Salveaza legaturile dintre un produs si ingredientele sale in tabelul de jonctiune product_ingredients.
 * Apelata dupa fiecare analiza reusita, pentru a mentine relatia normalizata (1NF).
 *
 * @param {string} productId - UUID-ul produsului din tabela products
 * @param {Array}  ingredientsBreakdown - Lista returnata de analyzeToxicity()
 */
async function saveProductIngredients(productId, ingredientsBreakdown) {
    if (!productId || !ingredientsBreakdown || ingredientsBreakdown.length === 0) return;

    // Retinem doar ingredientele gasite efectiv in tabela ingredients (nu cele 'unknown')
    const foundIngredients = ingredientsBreakdown.filter(i => i.riskCategory !== 'unknown' && i.name);
    if (foundIngredients.length === 0) return;

    // Citim ID-urile numerice din tabela ingredients dupa inci_name
    const inciNames = foundIngredients.map(i => i.name);
    const { data: ingRows, error: ingError } = await supabase
        .from('ingredients')
        .select('id, inci_name')
        .in('inci_name', inciNames);

    if (ingError || !ingRows || ingRows.length === 0) {
        console.error('[product_ingredients] Eroare la citirea ID-urilor din ingredients:', ingError?.message);
        return;
    }

    // Map rapid: INCI_NAME (uppercase) -> id numeric
    const ingMap = new Map(ingRows.map(r => [r.inci_name.toUpperCase(), r.id]));

    // Construim randurile de inserat (product_id + ingredient_id + pozitia INCI)
    const toInsert = foundIngredients
        .map((ing, index) => {
            const ingId = ingMap.get(ing.name.toUpperCase());
            if (!ingId) return null;
            return {
                product_id:    productId,
                ingredient_id: ingId,
                position:      index  // pozitia 0 = concentratie maxima in formula
            };
        })
        .filter(Boolean);

    if (toInsert.length === 0) return;

    const { error: upsertError } = await supabase
        .from('product_ingredients')
        .upsert(toInsert, { onConflict: 'product_id,ingredient_id', ignoreDuplicates: true });

    if (upsertError) {
        console.error('[product_ingredients] Eroare la salvarea legaturilor:', upsertError.message);
    } else {
        console.log(`[product_ingredients] ${toInsert.length} ingrediente legate de produsul ${productId}`);
    }
}

/**
 * GET /api/products/search?q=text
 * Cauta produse dupa nume in:
 * 1. Cache Supabase (produse deja analizate de comunitate)
 * 2. Open Beauty Facts API (skincare, creme, sampoane)
 * 3. Makeup API (produse de machiaj)
 */
export async function searchProducts(req, res) {
    try {
        const { q } = req.query;

        if (!q || q.trim().length < 2) {
            return res.status(400).json({ error: 'Search term must be at least 2 characters' });
        }

        // searchText - folosit pentru OBF si Makeup API 
        const searchText = q.trim();
        // supabaseSearchText - sanitizat pentru a preveni injectia in filtrul PostgREST .or()
        
        const supabaseSearchText = searchText.replace(/[(),.'"%;]/g, '');


        const [supabaseResults, obfResults, makeupResults] = await Promise.allSettled([
            // 1. Cache Supabase - produse deja analizate (cautam dupa nume SAU brand)
            supabase
                .from('products')
                .select('barcode, name, brand, image_url')
                .or(`name.ilike.%${supabaseSearchText}%,brand.ilike.%${supabaseSearchText}%`)
                .limit(50),

            // 2. Open Beauty Facts - skincare
            searchProductsByName(searchText, 50),

            // 3. Makeup API - machiaj
            searchMakeupByName(searchText, 30),
        ]);

        const combined = [];
        const seenBarcodes = new Set();

        // 1. Adauga rezultate Supabase (au prioritate - deja analizate)
        if (supabaseResults.status === 'fulfilled' && supabaseResults.value.data) {
            for (const p of supabaseResults.value.data) {
                if (p.barcode) seenBarcodes.add(p.barcode);
                combined.push({
                    name: p.name,
                    brand: p.brand,
                    barcode: p.barcode,
                    imageUrl: p.image_url,
                    safetyScore: null, 
                    source: 'cache',
                });
            }
        }

        
        if (obfResults.status === 'fulfilled') {
            for (const p of obfResults.value) {
                if (p.barcode && seenBarcodes.has(p.barcode)) continue;
                if (p.barcode) seenBarcodes.add(p.barcode);
                combined.push(p);
            }
        }

      
        if (makeupResults.status === 'fulfilled') {
            for (const p of makeupResults.value) {
                combined.push(p);
            }
        }

        
        const obfBarcodes = combined
            .filter(p => p.source === 'obf' && p.barcode)
            .map(p => p.barcode);

        if (obfBarcodes.length > 0) {
            const { data: cachedBarcodes } = await supabase
                .from('products')
                .select('barcode')
                .in('barcode', obfBarcodes);

            if (cachedBarcodes && cachedBarcodes.length > 0) {
                const cachedSet = new Set(cachedBarcodes.map(r => r.barcode));
                for (const p of combined) {
                    if (p.source === 'obf' && p.barcode && cachedSet.has(p.barcode)) {
                        p.source = 'cache';
                    }
                }
            }
        }

        console.log(`[SEARCH] "${searchText}" -> ${combined.length} rezultate (cache: ${supabaseResults.value?.data?.length || 0}, OBF: ${obfResults.value?.length || 0}, makeup: ${makeupResults.value?.length || 0})`);

        return res.json(combined);

    } catch (error) {
        console.error('Error in searchProducts:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * Extrage preferintele utilizatorului:
 *   - skin_type: din user_metadata (Supabase Auth)
 *   - allergies: din tabelul user_allergies (normalizat, 1NF)
 * Returneaza null daca userul nu e autentificat sau nu are preferinte setate.
 */
async function getUserPreferences(req) {
    const userId = req.user?.id;
    const metadata = req.user?.user_metadata;
    if (!userId) return null;

    const skin_type = metadata?.skin_type || null;

    // Citeste alergiile din tabelul normalizat user_allergies
    const { data: allergyRows, error: allergyError } = await supabase
        .from('user_allergies')
        .select('allergy_label')
        .eq('user_id', userId);

    if (allergyError) {
        console.error('[getUserPreferences] Eroare la citirea alergiilor:', allergyError.message);
    }

    const allergies = allergyRows?.map(r => r.allergy_label) || [];

    if (!skin_type && allergies.length === 0) return null;
    return { skin_type, allergies };
}

/**
 * GET /api/products/:barcode
 * Returneaza informatii despre produs + analiza de toxicitate
 */
export async function getProductByBarcode(req, res) {
    try {
        const { barcode } = req.params;
        const lang = req.query.lang || 'ro';

        if (!barcode || barcode.length < 8) {
            return res.status(400).json({
                error: 'Invalid barcode format'
            });
        }

        // 1. Verifica cache in Supabase
        const { data: cachedProduct, error: cacheError } = await supabase
            .from('products')
            .select('*')
            .eq('barcode', barcode)
            .single();

        if (cachedProduct && !cacheError) {
            // Daca produsul este pushe in cache dar nu are ingrediente il ignoram
            if (!cachedProduct.ingredients_list || cachedProduct.ingredients_list.trim() === '') {
                console.log(`[WARN] Product found in cache but has ZERO ingredients: ${barcode}. Ignoring cache...`);
            } else {
                console.log(`[CACHE] Product found in cache: ${barcode}`);

                // Analizeaza toxicitatea cu preferintele utilizatorului (daca e logat)
                const userPrefs = await getUserPreferences(req);
                const analysis = await analyzeToxicity(cachedProduct.ingredients_list, userPrefs, lang, {
                    name: cachedProduct.name,
                    brand: cachedProduct.brand,
                    category: cachedProduct.category,
                });
                if (userPrefs) console.log(`[PERSONALIZED] Analysis personalized for skin_type=${userPrefs.skin_type}, allergies=${userPrefs.allergies.length}`);

                return res.json({
                    ...cachedProduct,
                    analysis,
                    source: 'cache'
                });
            }
        }

        
        console.log(`[OBF] Cautam metadata pentru: ${barcode}`);
        const obfData = await fetchProductMetadata(barcode, 3000);

        
        if (obfData?.ingredientsText) {
            console.log(`[OBF] Ingrediente gasite pentru ${barcode} - analizam...`);
            const userPrefs = await getUserPreferences(req);
            const analysis = await analyzeToxicity(obfData.ingredientsText, userPrefs, lang, {
                name: obfData.name,
                brand: obfData.brand,
                category: obfData.categories || null,
                description: obfData.description || null,
            });

            
            const { data: savedProduct, error: saveError } = await supabase
                .from('products')
                .upsert({
                    barcode: barcode,
                    name: obfData.name || null,
                    brand: obfData.brand || null,
                    ingredients_list: obfData.ingredientsText,
                    image_url: obfData.imageUrl,
                    category: obfData.categories || '',
                    last_updated: new Date().toISOString()
                }, { onConflict: 'barcode' })
                .select()
                .single();

            if (saveError) {
                console.error('Error saving OBF product to cache:', saveError);
            }

            // Salveaza legaturile in tabelul de jonctiune product_ingredients
            if (savedProduct?.id) {
                await saveProductIngredients(savedProduct.id, analysis.ingredientsBreakdown);
            }

            return res.json({
                id: savedProduct?.id || null,
                barcode,
                name: obfData.name || 'Produs Necunoscut',
                brand: obfData.brand || 'Brand Necunoscut',
                category: obfData.categories || null,
                imageUrl: obfData.imageUrl,
                ingredients_list: obfData.ingredientsText,
                analysis,
                source: 'live'
            });
        }

        // 4. Produsul NU are ingrediente -> necesita OCR
        //    Returnam 200 cu flag needsOcr + orice metadata am gasit de la OBF
        console.log(`[OCR NEEDED] Produsul ${barcode} necesita scanare OCR a etichetei.`);
        return res.json({
            needsOcr: true,
            barcode,
            name: obfData?.name || null,
            brand: obfData?.brand || null,
            imageUrl: obfData?.imageUrl || null,
            message: 'Product not yet analyzed. Please photograph the ingredients label!'
        });

    } catch (error) {
        console.error('Error in getProductByBarcode:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
}

/**
 * POST /api/history
 * Salveaza un produs scanat in istoricul utilizatorului
 */
export async function saveToHistory(req, res) {
    try {
        const userId = req.user?.id; // Din middleware de autentificare
        const { productId, barcode, safetyScore } = req.body;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        
        let productDbId = productId;

        if (!productDbId && barcode) {
            const { data: product } = await supabase
                .from('products')
                .select('id')
                .eq('barcode', barcode)
                .single();

            productDbId = product?.id;
        }

        if (!productDbId) {
            return res.status(400).json({ error: 'Product not found' });
        }

        
        const { data: existing, error: fetchError } = await supabase
            .from('scanned_products')
            .select('id, scan_count, safety_score')
            .eq('user_id', userId)
            .eq('product_id', productDbId)
            .maybeSingle();

        if (fetchError) {
            console.error('Error checking existing history entry:', fetchError);
            return res.status(500).json({ error: 'Failed to check history' });
        }

        let data, error;

        if (existing) {
            
            ({ data, error } = await supabase
                .from('scanned_products')
                .update({
                    safety_score: safetyScore ?? existing.safety_score ?? 0,
                    scanned_at: new Date().toISOString(),
                    scan_count: (existing.scan_count || 1) + 1
                })
                .eq('id', existing.id)
                .select()
                .single());
        } else {
            
            ({ data, error } = await supabase
                .from('scanned_products')
                .insert({
                    user_id: userId,
                    product_id: productDbId,
                    safety_score: safetyScore ?? 0,
                    scanned_at: new Date().toISOString(),
                    is_favorite: false,
                    scan_count: 1
                })
                .select()
                .single());
        }

        if (error) {
            console.error('Error saving to history:', error);
            return res.status(500).json({ error: 'Failed to save to history' });
        }

        return res.status(existing ? 200 : 201).json(data);

    } catch (error) {
        console.error('Error in saveToHistory:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * GET /api/history
 * Returneaza istoricul scanarilor utilizatorului
 */
export async function getUserHistory(req, res) {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { data, error } = await supabase
            .from('scanned_products')
            .select(`
        *,
        products (
          barcode,
          name,
          brand,
          image_url
        )
      `)
            .eq('user_id', userId)
            .order('scanned_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Error fetching history:', error);
            return res.status(500).json({ error: 'Failed to fetch history' });
        }

        return res.json(data);

    } catch (error) {
        console.error('Error in getUserHistory:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * POST /api/products/manual
 * Adauga un produs manual folosind OCR (Gemini Vision) pentru eticheta de ingrediente
 */
export async function addManualProduct(req, res) {
    try {
        const { barcode, name, brand, base64Image, mimeType = 'image/jpeg' } = req.body;
        const lang = req.body.lang || 'ro';

        
        if (!name || !base64Image) {
            return res.status(400).json({ error: 'Product name and ingredient label image are required' });
        }

        
        const estimatedSizeBytes = (base64Image.length * 3) / 4;
        const maxSizeMB = 10;
        if (estimatedSizeBytes > maxSizeMB * 1024 * 1024) {
            return res.status(400).json({ error: `Image is too large (max ${maxSizeMB}MB)` });
        }

        
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedMimeTypes.includes(mimeType)) {
            return res.status(400).json({ error: 'Invalid image format. Accepted: JPEG, PNG, WebP' });
        }

        
        if (name.trim().length < 2 || name.trim().length > 200) {
            return res.status(400).json({ error: 'Product name must be between 2 and 200 characters' });
        }

        console.log(`[MANUAL ADD] Procesare imagine pentru produsul: ${name}`);

        
        const ingredientsText = await extractIngredientsFromImage(base64Image, mimeType);

        console.log(`[OCR SUCCESS] Ingrediente extrase: ${ingredientsText.substring(0, 100)}...`);

        
        const userPrefs = await getUserPreferences(req);
        const analysis = await analyzeToxicity(ingredientsText, userPrefs, lang, {
            name,
            brand,
            category: 'manual_entry',
        });
        const productDataToSave = {
            barcode: barcode || `MANUAL-${randomUUID()}`, 
            name: name,
            brand: brand || null,
            ingredients_list: ingredientsText,
            image_url: null, 
            category: 'manual_entry',
            last_updated: new Date().toISOString()
        };

        const { data: savedProduct, error: saveError } = await supabase
            .from('products')
            .upsert(productDataToSave, { onConflict: 'barcode' })
            .select()
            .single();

        if (saveError) {
            console.error('[DB ERROR] Nu am putut salva produsul manual:', saveError);
            return res.status(500).json({ error: 'Failed to save product to database' });
        }

        // Salveaza legaturile in tabelul de jonctiune product_ingredients
        if (savedProduct?.id) {
            await saveProductIngredients(savedProduct.id, analysis.ingredientsBreakdown);
        }

        // 4. Returneaza rezultatul
        // Folosesc cheia ingredients_list 
        // pentru ca ProductScreen si ChatScreen sa citeasca corect ingredientele
        return res.json({
            barcode: savedProduct.barcode,
            name: savedProduct.name,
            brand: savedProduct.brand,
            category: savedProduct.category,
            ingredients_list: savedProduct.ingredients_list,
            imageUrl: null,
            analysis,
            source: 'manual_ocr',
            message: 'Product analyzed and saved successfully!'
        });

    } catch (error) {
        console.error('Error in addManualProduct:', error);
        return res.status(500).json({
            error: error.message || 'Error processing manual product'
        });
    }
}

/**
 * POST /api/products/report
 * Raporteaza o problema cu un produs (feedback)
 */
export async function reportProductIssue(req, res) {
    try {
        const userId = req.user?.id;
        const { productId, issueCategory, userComment } = req.body;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!productId || !issueCategory) {
            return res.status(400).json({ error: 'Product ID and Issue Category are required' });
        }

        const { data, error } = await supabase
            .from('product_reports')
            .insert({
                user_id: userId,
                product_id: productId,
                issue_category: issueCategory,
                user_comment: userComment || null,
                created_at: new Date().toISOString()
            });

        if (error) {
            console.error('Error saving product report:', error);
            return res.status(500).json({ error: 'Failed to submit report' });
        }

        return res.status(201).json({ message: 'Report submitted successfully' });

    } catch (error) {
        console.error('Error in reportProductIssue:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
