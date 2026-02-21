export const API_BASE_URL = 'http://192.168.100.26:3000/api';

/**
 * Fetch product details and safety score from the backend
 */
export async function fetchProductDetails(barcode) {
    try {
        const response = await fetch(`${API_BASE_URL}/products/${barcode}`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch product data');
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}
