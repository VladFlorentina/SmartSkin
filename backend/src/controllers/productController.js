import { supabase } from '../config/supabase.js';
import { fetchProductByBarcode } from '../services/openBeautyFacts.js';
import { analyzeToxicity } from '../services/toxicityAnalyzer.js';

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
            console.log(`[CACHE] Product found in cache: ${barcode}`);

            // Analizeaza toxicitatea (se poate face cache si pentru asta)
            const analysis = await analyzeToxicity(cachedProduct.ingredients_list);

            return res.json({
                ...cachedProduct,
                analysis,
                source: 'cache'
            });
        }

        // 2. Fetch de la Open Beauty Facts
        console.log(`[FETCH] Fetching product from OBF: ${barcode}`);
        const productData = await fetchProductByBarcode(barcode);

        if (!productData) {
            return res.status(404).json({
                error: 'Product not found in database'
            });
        }

        // 3. Analizeaza toxicitatea
        const analysis = await analyzeToxicity(productData.ingredientsText);

        // 4. Salveaza in cache (Supabase)
        const { data: savedProduct, error: saveError } = await supabase
            .from('products')
            .insert({
                barcode: productData.barcode,
                name: productData.name,
                brand: productData.brand,
                ingredients_list: productData.ingredientsText,
                image_url: productData.imageUrl,
                category: productData.categories,
                last_updated: new Date().toISOString()
            })
            .select()
            .single();

        if (saveError) {
            console.error('Error saving to cache:', saveError);
        }

        // 5. Returneaza rezultatul complet
        return res.json({
            ...productData,
            analysis,
            source: 'live'
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
