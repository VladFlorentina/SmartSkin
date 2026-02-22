import axios from 'axios';

const OBF_API_BASE = 'https://world.openbeautyfacts.org/api/v2';

/**
 * Cauta un produs dupa barcode in Open Beauty Facts / Open Food Facts
 * @param {string} barcode - Codul de bare EAN-13/UPC
 * @returns {Promise<Object>} - Datele produsului sau null
 */
export async function fetchProductByBarcode(barcode) {
    try {
        const response = await axios.get(`${OBF_API_BASE}/product/${barcode}.json`);

        if (response.data.status === 0) {
            console.log(`[WARN] Product not found (status 0): ${barcode}`);
            throw { response: { status: 404 } }; // Triggers fallback
        }

        const product = response.data.product;

        // Daca produsul exista in baza de date OBF, dar nu are lista de ingrediente completata (foarte des intalnit),
        // il consideram NEGASIT pentru a forta utilizatorul sa foloseasca functia OCR (poza la eticheta).
        if (!product.ingredients_text || product.ingredients_text.trim() === '') {
            console.log(`[WARN] Product found but has ZERO ingredients: ${barcode}. Forcing 404 for OCR fallback.`);
            throw { response: { status: 404 } };
        }

        // Extrage datele relevante
        return {
            barcode: product.code,
            name: product.product_name || 'Unknown Product',
            brand: product.brands || 'Unknown Brand',
            // Ingredientele sunt in campul 'ingredients_text'
            ingredientsText: product.ingredients_text || '',
            // Array de ingrediente parsate (daca exista)
            ingredientsArray: product.ingredients || [],
            imageUrl: product.image_url || product.image_front_url || null,
            categories: product.categories || '',
            // Open Beauty Facts are si un field pentru cosmetice
            categoriesTags: product.categories_tags || []
        };
    } catch (error) {
        if (error.response && error.response.status === 404) {
            console.log(`[WARN] Product not found: ${barcode}`);
            throw new Error('Not Found');
        }

        console.error('Error fetching from Open Beauty Facts:', error.message);
        throw new Error('Failed to fetch product data');
    }
}

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
 * Verifica daca produsul este cosmetic (nu alimentar)
 * @param {Object} product - Obiectul produs de la OBF
 * @returns {boolean}
 */
export function isCosmeticProduct(product) {
    const cosmeticCategories = [
        'cosmetics', 'beauty', 'skincare', 'makeup',
        'hair-care', 'personal-care', 'hygiene'
    ];

    const categories = product.categories?.toLowerCase() || '';
    const tags = product.categoriesTags || [];

    return cosmeticCategories.some(cat =>
        categories.includes(cat) || tags.some(tag => tag.includes(cat))
    );
}
