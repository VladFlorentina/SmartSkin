import axios from 'axios';

const OBF_API_BASE = 'https://world.openbeautyfacts.org/api/v2';

/**
 * Cauta DOAR metadatele unui produs (nume, brand, poza) in OBF.
 * NU arunca erori daca produsul nu e gasit sau nu are ingrediente.
 * Folosit ca supliment pentru a pre-completa formularul OCR.
 * @param {string} barcode
 * @param {number} timeoutMs - Timeout in milisecunde (default: 3000ms)
 * @returns {Promise<Object|null>} - Metadate sau null
 */
export async function fetchProductMetadata(barcode, timeoutMs = 3000) {
    try {
        const response = await axios.get(`${OBF_API_BASE}/product/${barcode}.json`, {
            timeout: timeoutMs
        });

        if (response.data.status === 0 || !response.data.product) {
            return null;
        }

        const product = response.data.product;

        return {
            name: product.product_name || null,
            brand: product.brands || null,
            imageUrl: product.image_url || product.image_front_url || null,
            // Ingredientele le includem DOAR daca exista (bonus, nu obligatoriu)
            ingredientsText: product.ingredients_text?.trim() || null,
            categories: product.categories || '',
        };
    } catch (error) {
        // Nu aruncam erori - e o cautare optionala
        console.log(`[OBF METADATA] Nu am gasit metadata pentru ${barcode}: ${error.message}`);
        return null;
    }
}

/**
 * Cauta produse dupa text (nume/brand) in Open Beauty Facts.
 * @param {string} searchText - Textul de cautat
 * @param {number} limit - Numar maxim de rezultate
 * @returns {Promise<Array>}
 */
export async function searchProductsByName(searchText, limit = 50) {
    try {
        const response = await axios.get('https://world.openbeautyfacts.org/cgi/search.pl', {
            params: {
                search_terms: searchText,
                search_simple: 1,
                action: 'process',
                json: 1,
                page_size: limit,
                fields: 'code,product_name,brands,image_front_url,image_url,ingredients_text,categories',
            },
            timeout: 12000,
        });

        const products = response.data?.products;
        if (!Array.isArray(products)) return [];

        return products
            .filter(p => p.product_name && p.product_name.trim() !== '')
            .map(p => ({
                name: p.product_name || 'Produs necunoscut',
                brand: p.brands || null,
                barcode: p.code || null,
                imageUrl: p.image_front_url || p.image_url || null,
                category: p.categories || '',
                hasIngredients: !!(p.ingredients_text && p.ingredients_text.trim()),
                source: 'obf',
            }));
    } catch (error) {
        console.log(`[OBF SEARCH] Eroare la cautarea "${searchText}": ${error.message}`);
        return [];
    }
}
