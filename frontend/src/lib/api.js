import { supabase } from './supabase';
import Constants from 'expo-constants';

// IP-ul serverului backend se ia din configurarea Expo (app.json -> extra)
// Fallback la localhost pentru development
const BACKEND_IP = Constants.expoConfig?.extra?.backendIp || '192.168.100.26';
const BACKEND_PORT = Constants.expoConfig?.extra?.backendPort || '3000';
export const API_BASE_URL = `http://${BACKEND_IP}:${BACKEND_PORT}/api`;

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
 * Arunca o eroare cu .isNetworkError=true daca serverul nu raspunde in 12 secunde
 */
export async function fetchProductDetails(barcode) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

    try {
        // Trimitem si auth headers (optional) - daca userul e logat, backend-ul personalizeaza analiza
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/products/${barcode}`, {
            method: 'GET',
            headers,
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch product data');
        }

        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId);
        // Marcam eroarea ca network error daca a expirat timeout-ul sau nu a putut conecta
        if (error.name === 'AbortError' || error.message === 'Network request failed') {
            const networkError = new Error('Serverul nu raspunde. Verifica conexiunea la retea.');
            networkError.isNetworkError = true;
            throw networkError;
        }
        console.error('API Error:', error);
        throw error;
    }
}

/**
 * Send a message to the AI CosmetiBot
 * @param {string} message - User's chat message
 * @param {object} product - Product context data
 * @param {Array} history - Conversation history [{sender, text}]
 */
export async function sendChatMessage(message, product = null, history = []) {
    try {
        let contextData = null;
        if (product) {
            contextData = {
                productName: product.name,
                brand: product.brand,
                safetyScore: product.analysis?.safetyScore,
                ingredientsList: product.ingredients_list,
                riskyIngredients: product.analysis?.ingredientsBreakdown
                    ?.filter(i => i.riskLevel >= 3)
                    .map(i => ({ name: i.name, risk: i.riskLevel }))
            };
        }

        // Convertim istoricul in formatul asteptat de backend: [{role, text}]
        const formattedHistory = history.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            text: msg.text,
        }));

        const headers = await getAuthHeaders();

        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
            body: JSON.stringify({
                message: message,
                productId: product?.id || null,
                contextData: contextData,
                history: formattedHistory,
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
 * Search products by name across Supabase cache, Open Beauty Facts and Makeup API
 * @param {string} query - Search term
 */
export async function searchProducts(query) {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(
            `${API_BASE_URL}/products/search?q=${encodeURIComponent(query)}`,
            { method: 'GET', headers }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Search failed');
        }

        return await response.json();
    } catch (error) {
        console.error('Search API Error:', error);
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
