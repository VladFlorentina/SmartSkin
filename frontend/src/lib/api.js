import { supabase } from './supabase';
import Constants from 'expo-constants';


const extra = Constants.expoConfig?.extra || {};

let API_BASE_URL;
if (extra.backendUrl) {
    
    API_BASE_URL = `${extra.backendUrl.replace(/\/$/, '')}/api`;
} else if (extra.backendIp) {
    
    const port = extra.backendPort || '3000';
    API_BASE_URL = `http://${extra.backendIp}:${port}/api`;
} else {
    
    console.error('[CONFIG ERROR] Backend URL nu este configurat in app.json!\nAdauga in app.json -> extra: { "backendUrl": "..." } sau { "backendIp": "...", "backendPort": "3000" }');
    API_BASE_URL = 'http://localhost:3000/api'; // fallback vizibil in dev
}

export { API_BASE_URL };


async function getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return {};
    return {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
    };
}


export async function fetchProductDetails(barcode, lang = 'ro') {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s AI resolve poate dura 25-30s

    try {
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
        
        if (error.name === 'AbortError' || error.message === 'Network request failed') {
            const networkError = new Error('Server not responding. Please check your network connection.');
            networkError.isNetworkError = true;
            networkError.isTimeoutError = error.name === 'AbortError'; 
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
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s 

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

        return data.response; 
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

export async function fetchChatHistory(productId) {
    if (!productId) return [];
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/chat/history/${productId}`, { headers });
        if (!response.ok) return [];
        return await response.json();
    } catch (err) {
        console.error('API Error fetching chat history:', err);
        return [];
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


export async function fetchUserHistory() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // Mărit la 60s pentru "Cold Start-ul" Render.com

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


export async function saveToUserHistory(productId, barcode, safetyScore) {
    try {
        const headers = await getAuthHeaders();
        await fetch(`${API_BASE_URL}/history`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ productId, barcode, safetyScore })
        });
        
    } catch (error) {
        console.error('API Error saving history:', error);
    }
}

export async function reportProductIssue(productId, issueCategory, userComment) {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/products/report`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ productId, issueCategory, userComment })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to submit report');
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Error reporting issue:', error);
        throw error;
    }
}

export async function fetchAdminReports() {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/admin/reports`, {
            method: 'GET',
            headers
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch admin reports');
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Error fetching admin reports:', error);
        throw error;
    }
}

export async function fetchAdminStats() {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/admin/stats`, {
            method: 'GET',
            headers
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch admin stats');
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Error fetching admin stats:', error);
        throw error;
    }
}

export async function deleteAdminReport(reportId) {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/admin/reports/${reportId}`, {
            method: 'DELETE',
            headers
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete report');
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Error deleting admin report:', error);
        throw error;
    }
}

export async function fetchAdminUsers() {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/admin/users`, {
            method: 'GET',
            headers
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch admin users');
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Error fetching admin users:', error);
        throw error;
    }
}

export async function fetchAdminProducts(type = 'api') {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/admin/products?type=${type}`, {
            method: 'GET',
            headers
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch admin products');
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Error fetching admin products:', error);
        throw error;
    }
}

export async function updateAdminProductIngredients(id, ingredientsList) {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/admin/products/${id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ ingredients_list: ingredientsList })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update product');
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Error updating product:', error);
        throw error;
    }
}

export async function deleteAdminProduct(id) {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/admin/products/${id}`, {
            method: 'DELETE',
            headers
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete product');
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Error deleting product:', error);
        throw error;
    }
}
