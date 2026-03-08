import { supabase } from './supabase';
import Constants from 'expo-constants';

// URL-ul backend-ului se ia din app.json -> extra
// Optiunea 1 (recomandata): backendUrl = URL complet (ngrok / Render / Railway)
//   ex: "backendUrl": "https://abc123.ngrok.io"
// Optiunea 2 (retea locala): backendIp + backendPort
//   ex: "backendIp": "192.168.1.137", "backendPort": "3000"
const extra = Constants.expoConfig?.extra || {};

let API_BASE_URL;
if (extra.backendUrl) {
    // URL complet (ngrok / cloud) - prioritate maxima
    API_BASE_URL = `${extra.backendUrl.replace(/\/$/, '')}/api`;
} else if (extra.backendIp) {
    // IP local + port
    const port = extra.backendPort || '3000';
    API_BASE_URL = `http://${extra.backendIp}:${port}/api`;
} else {
    // Nimic configurat - afisam avertisment clar in loc sa esuam silentios
    console.error('[CONFIG ERROR] Backend URL nu este configurat in app.json!\nAdauga in app.json -> extra: { "backendUrl": "..." } sau { "backendIp": "...", "backendPort": "3000" }');
    API_BASE_URL = 'http://localhost:3000/api'; // fallback vizibil in dev
}

export { API_BASE_URL };

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
 * Arunca o eroare cu .isNetworkError=true daca serverul nu raspunde in 45 secunde
 */
export async function fetchProductDetails(barcode, lang = 'ro') {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout - AI resolve poate dura 25-30s

    try {
        // Trimitem si auth headers (optional) - daca userul e logat, backend-ul personalizeaza analiza
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/products/${barcode}?lang=${lang}`, {
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
            const networkError = new Error('Server not responding. Please check your network connection.');
            networkError.isNetworkError = true;
            networkError.isTimeoutError = error.name === 'AbortError'; // timeout vs lipsa retea
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
export async function sendChatMessage(message, product = null, history = [], lang = 'ro') {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

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
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
            body: JSON.stringify({
                message: message,
                productId: product?.id || null,
                contextData: contextData,
                history: formattedHistory,
                lang: lang,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || data.error || 'Failed to communicate with the AI.');
        }

        return data.response; // Textul returnat de Gemini
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('AI did not respond in time. Please try again.');
        }
        console.error('AI Chat Error:', error);
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * Search products by name across Supabase cache, Open Beauty Facts and Makeup API
 * @param {string} query - Search term
 */
export async function searchProducts(query) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
        const headers = await getAuthHeaders();
        const response = await fetch(
            `${API_BASE_URL}/products/search?q=${encodeURIComponent(query)}`,
            { method: 'GET', headers, signal: controller.signal }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Search failed');
        }

        return await response.json();
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('Search took too long. Please try again.');
        }
        console.error('Search API Error:', error);
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * Fetch the current user's scanned product history
 */
export async function fetchUserHistory() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/history`, {
            method: 'GET',
            headers,
            signal: controller.signal,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch history');
        }

        return await response.json();
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('Could not load history. Please check your connection.');
        }
        console.error('API Error fetching history:', error);
        throw error;
    } finally {
        clearTimeout(timeoutId);
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
