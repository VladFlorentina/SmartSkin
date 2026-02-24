import { supabase } from '../config/supabase.js';
import { fetchProductMetadata, searchProductsByName } from '../services/openBeautyFacts.js';
import { analyzeToxicity } from '../services/toxicityAnalyzer.js';
import { extractIngredientsFromImage } from '../services/geminiService.js';
import { searchMakeupByName } from '../services/makeupApiService.js';

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
            return res.status(400).json({ error: 'Termenul de cautare trebuie sa aiba minim 2 caractere' });
        }

        const searchText = q.trim();

        // Rulam cautarile in paralel pentru viteza maxima
        const [supabaseResults, obfResults, makeupResults] = await Promise.allSettled([
            // 1. Cache Supabase - produse deja analizate (cautam dupa nume SAU brand)
            supabase
                .from('products')
                .select('barcode, name, brand, image_url')
                .or(`name.ilike.%${searchText}%,brand.ilike.%${searchText}%`)
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
                    safetyScore: null, // Nu recalculam scorul la search pentru viteza
                    source: 'cache',
                });
            }
        }

        // 2. Adauga rezultate OBF (fara duplicate dupa barcode)
        if (obfResults.status === 'fulfilled') {
            for (const p of obfResults.value) {
                if (p.barcode && seenBarcodes.has(p.barcode)) continue;
                if (p.barcode) seenBarcodes.add(p.barcode);
                combined.push(p);
            }
        }

        // 3. Adauga rezultate Makeup API
        if (makeupResults.status === 'fulfilled') {
            for (const p of makeupResults.value) {
                combined.push(p);
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
 * Extrage preferintele utilizatorului din user_metadata Supabase.
 * Returneaza null daca userul nu e autentificat sau nu are preferinte setate.
 */
function getUserPreferences(req) {
    const metadata = req.user?.user_metadata;
    if (!metadata) return null;
    const { skin_type, allergies } = metadata;
    if (!skin_type && (!allergies || allergies.length === 0)) return null;
    return { skin_type: skin_type || null, allergies: allergies || [] };
}

/**
 * GET /api/products/:barcode
 * Returneaza informatii despre produs + analiza de toxicitate
 */
export async function getProductByBarcode(req, res) {
    try {
        const { barcode } = req.params;

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
            // Daca produsul este pushe in cache dar nu are ingrediente (fantoma) il ignoram
            if (!cachedProduct.ingredients_list || cachedProduct.ingredients_list.trim() === '') {
                console.log(`[WARN] Product found in cache but has ZERO ingredients: ${barcode}. Ignoring cache...`);
            } else {
                console.log(`[CACHE] Product found in cache: ${barcode}`);

                // Analizeaza toxicitatea cu preferintele utilizatorului (daca e logat)
                const userPrefs = getUserPreferences(req);
                const analysis = await analyzeToxicity(cachedProduct.ingredients_list, userPrefs);
                if (userPrefs) console.log(`[PERSONALIZED] Analysis personalized for skin_type=${userPrefs.skin_type}, allergies=${userPrefs.allergies.length}`);

                return res.json({
                    ...cachedProduct,
                    analysis,
                    source: 'cache'
                });
            }
        }

        // 2. Incearca OBF pentru metadata (non-blocking, cu timeout scurt)
        console.log(`[OBF] Cautam metadata pentru: ${barcode}`);
        const obfData = await fetchProductMetadata(barcode, 3000);

        // 3. Daca OBF a gasit ingrediente -> analizeaza, salveaza in cache, returneaza
        if (obfData?.ingredientsText) {
            console.log(`[OBF] Ingrediente gasite pentru ${barcode} - analizam...`);
            const userPrefs = getUserPreferences(req);
            const analysis = await analyzeToxicity(obfData.ingredientsText, userPrefs);

            // Salveaza in cache Supabase
            const { data: savedProduct, error: saveError } = await supabase
                .from('products')
                .insert({
                    barcode: barcode,
                    name: obfData.name || 'Produs Necunoscut',
                    brand: obfData.brand || 'Brand Necunoscut',
                    ingredients_list: obfData.ingredientsText,
                    image_url: obfData.imageUrl,
                    category: obfData.categories || '',
                    last_updated: new Date().toISOString()
                })
                .select()
                .single();

            if (saveError) {
                console.error('Error saving OBF product to cache:', saveError);
            }

            return res.json({
                id: savedProduct?.id || null,
                barcode,
                name: obfData.name || 'Produs Necunoscut',
                brand: obfData.brand || 'Brand Necunoscut',
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
            message: 'Produsul nu a fost analizat inca. Fotografiaza eticheta cu ingredientele!'
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

        // Verifica daca produsul exista
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

        // Check if this product already exists in the user's history
        const { data: existing, error: fetchError } = await supabase
            .from('scanned_products')
            .select('id, scan_count')
            .eq('user_id', userId)
            .eq('product_id', productDbId)
            .maybeSingle();

        if (fetchError) {
            console.error('Error checking existing history entry:', fetchError);
            return res.status(500).json({ error: 'Failed to check history' });
        }

        let data, error;

        if (existing) {
            // Product already in history — update timestamp, score and increment scan_count
            ({ data, error } = await supabase
                .from('scanned_products')
                .update({
                    safety_score: safetyScore || existing.safety_score || 0,
                    scanned_at: new Date().toISOString(),
                    scan_count: (existing.scan_count || 1) + 1
                })
                .eq('id', existing.id)
                .select()
                .single());
        } else {
            // First time scanning this product — insert with scan_count = 1
            ({ data, error } = await supabase
                .from('scanned_products')
                .insert({
                    user_id: userId,
                    product_id: productDbId,
                    safety_score: safetyScore || 0,
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
            .order('scanned_at', { ascending: false });

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

        // Validare input
        if (!name || !base64Image) {
            return res.status(400).json({ error: 'Numele produsului si imaginea cu eticheta sunt obligatorii' });
        }

        // Validare format base64 (verifica ca nu depaseste 10MB decodat)
        const estimatedSizeBytes = (base64Image.length * 3) / 4;
        const maxSizeMB = 10;
        if (estimatedSizeBytes > maxSizeMB * 1024 * 1024) {
            return res.status(400).json({ error: `Imaginea este prea mare (max ${maxSizeMB}MB)` });
        }

        // Validare mimeType
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedMimeTypes.includes(mimeType)) {
            return res.status(400).json({ error: 'Format imagine invalid. Acceptam: JPEG, PNG, WebP' });
        }

        // Validare lungime nume
        if (name.trim().length < 2 || name.trim().length > 200) {
            return res.status(400).json({ error: 'Numele produsului trebuie sa aiba intre 2 si 200 caractere' });
        }

        console.log(`[MANUAL ADD] Procesare imagine pentru produsul: ${name}`);

        // 1. Extrage ingredientele din poza folosind Gemini (OCR)
        const ingredientsText = await extractIngredientsFromImage(base64Image, mimeType);

        console.log(`[OCR SUCCESS] Ingrediente extrase: ${ingredientsText.substring(0, 100)}...`);

        // 2. Analizeaza toxicitatea cu preferintele utilizatorului (daca e logat)
        const userPrefs = getUserPreferences(req);
        const analysis = await analyzeToxicity(ingredientsText, userPrefs);

        // 3. Salveaza produsul public in Supabase pentru toti utilizatorii
        const productDataToSave = {
            barcode: barcode || `MANUAL-${Date.now()}`, // Genereaza un cod fals daca lipseste
            name: name,
            brand: brand || 'Necunoscut',
            ingredients_list: ingredientsText,
            image_url: null, // Deocamdata nu salvam in bucket poza intreaga
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
            return res.status(500).json({ error: 'Eroare la salvarea in baza de date' });
        }

        // 4. Returneaza rezultatul
        return res.json({
            barcode: savedProduct.barcode,
            name: savedProduct.name,
            brand: savedProduct.brand,
            ingredientsText: savedProduct.ingredients_list,
            imageUrl: null,
            analysis,
            source: 'manual_ocr',
            message: 'Produs analizat si salvat cu succes in cloud!'
        });

    } catch (error) {
        console.error('Error in addManualProduct:', error);
        return res.status(500).json({
            error: error.message || 'Eroare la procesarea produsului manual'
        });
    }
}
