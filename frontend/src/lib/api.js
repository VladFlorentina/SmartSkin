import { supabase } from './supabase';

export const API_BASE_URL = 'http://192.168.100.26:3000/api';

/**
 * Helper to get authorization headers with JWT
 */
async function getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return {};
    return {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
    };
}

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

/**
 * Send a message to the AI CosmetiBot
 * @param {string} message - User's chat message
 * @param {object} product - Product context data
 */
export async function sendChatMessage(message, product = null) {
    try {
        let contextData = null;
        if (product) {
            // Trimite un subset relevant din produs catre AI
            contextData = {
                productName: product.name,
                brand: product.brand,
                safetyScore: product.analysis?.safetyScore,
                // Trimitem lista de ingrediente ca string
                ingredientsList: product.ingredients_list,
                // Trimitem si un subset cu ingredientele de risc pentru context imediat
                riskyIngredients: product.analysis?.ingredientsBreakdown
                    ?.filter(i => i.riskLevel >= 3)
                    .map(i => ({ name: i.name, risk: i.riskLevel }))
            };
        }

        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                productId: product?.id || null, // Optional, pt istoric viitor
                contextData: contextData
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || data.error || 'Eroare la comunicarea cu AI-ul.');
        }

        return data.response; // Textul returnat de Gemini
    } catch (error) {
        console.error('AI Chat Error:', error);
        throw error;
    }
}

/**
 * Fetch the current user's scanned product history
 */
export async function fetchUserHistory() {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/history`, {
            method: 'GET',
            headers
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch history');
        }

        return await response.json();
    } catch (error) {
        console.error('API Error fetching history:', error);
        throw error;
    }
}

/**
 * Save a scanned product to the user's history
 */
export async function saveToUserHistory(productId, barcode, safetyScore) {
    try {
        const headers = await getAuthHeaders();
        await fetch(`${API_BASE_URL}/history`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ productId, barcode, safetyScore })
        });
        // Nu avem neaparat nevoie sa returnam ceva, doar fail silent daca e o eroare minora
    } catch (error) {
        console.error('API Error saving history:', error);
    }
}
