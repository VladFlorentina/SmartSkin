import axios from 'axios';

const OBF_API_BASE = 'https://world.openbeautyfacts.org/api/v2';

/**
 * Caută un produs după barcode în Open Beauty Facts / Open Food Facts
 * @param {string} barcode - Codul de bare EAN-13/UPC
 * @returns {Promise<Object>} - Datele produsului sau null
 */
export async function fetchProductByBarcode(barcode) {
    try {
        const response = await axios.get(`${OBF_API_BASE}/product/${barcode}.json`);

        if (response.data.status === 0) {
            console.log(`⚠️ Product not found: ${barcode}`);
            return null;
        }

        const product = response.data.product;

        // Extrage datele relevante
        return {
            barcode: product.code,
            name: product.product_name || 'Unknown Product',
            brand: product.brands || 'Unknown Brand',
            // Ingredientele sunt în câmpul 'ingredients_text'
            ingredientsText: product.ingredients_text || '',
            // Array de ingrediente parsate (dacă există)
            ingredientsArray: product.ingredients || [],
            imageUrl: product.image_url || product.image_front_url || null,
            categories: product.categories || '',
            // Open Beauty Facts are și un field pentru cosmetice
            categoriesTags: product.categories_tags || []
        };
    } catch (error) {
        console.error('Error fetching from Open Beauty Facts:', error.message);
        throw new Error('Failed to fetch product data');
    }
}

/**
 * Verifică dacă produsul este cosmetic (nu alimentar)
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
