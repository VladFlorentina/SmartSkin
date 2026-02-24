import axios from 'axios';

const MAKEUP_API_BASE = 'https://makeup-api.herokuapp.com/api/v1';

/**
 * Cauta produse de machiaj dupa denumire in Makeup API (gratuit, fara cheie).
 * @param {string} name - Numele produsului de cautat
 * @param {number} limit - Numar maxim de rezultate (default 5)
 * @returns {Promise<Array>} - Lista de produse
 */
export async function searchMakeupByName(name, limit = 30) {
    try {
        const response = await axios.get(`${MAKEUP_API_BASE}/products.json`, {
            params: { product_name: name },
            timeout: 5000,
        });

        if (!Array.isArray(response.data)) return [];

        return response.data.slice(0, limit).map(product => ({
            name: product.name || 'Produs necunoscut',
            brand: product.brand || null,
            imageUrl: product.image_link || null,
            barcode: null, // Makeup API nu are barcode
            category: product.product_type || 'makeup',
            description: product.description || null,
            ingredients: product.description || null,
            price: product.price || null,
            source: 'makeup',
        }));

    } catch (error) {
        console.log(`[MAKEUP API] Eroare la cautarea "${name}": ${error.message}`);
        return [];
    }
}
