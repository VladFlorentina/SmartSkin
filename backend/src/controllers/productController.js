import { supabase } from '../config/supabase.js';
import { fetchProductByBarcode, fetchProductMetadata } from '../services/openBeautyFacts.js';
import { analyzeToxicity } from '../services/toxicityAnalyzer.js';
import { extractIngredientsFromImage } from '../services/geminiService.js';

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

                // Analizeaza toxicitatea
                const analysis = await analyzeToxicity(cachedProduct.ingredients_list);

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
            const analysis = await analyzeToxicity(obfData.ingredientsText);

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

        // Salveaza in istoric
        const { data, error } = await supabase
            .from('scanned_products')
            .insert({
                user_id: userId,
                product_id: productDbId,
                safety_score: safetyScore || 0,
                scanned_at: new Date().toISOString(),
                is_favorite: false
            })
            .select()
            .single();

        if (error) {
            console.error('Error saving to history:', error);
            return res.status(500).json({ error: 'Failed to save to history' });
        }

        return res.status(201).json(data);

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

        // 2. Analizeaza toxicitatea (Regulile UE)
        const analysis = await analyzeToxicity(ingredientsText);

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
