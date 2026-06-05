import { supabase } from '../config/supabase.js';
import { analyzeToxicity } from '../services/toxicityAnalyzer.js';

/**
 * GET /api/admin/stats
 * Fetch high-level statistics for the admin dashboard.
 */
export async function getStats(req, res) {
    try {
        // Run all count queries in parallel
        const [
            usersCountResult,
            reportsCountResult,
            totalProductsResult,
            manualProductsResult
        ] = await Promise.all([
            supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
            supabase.from('product_reports').select('*', { count: 'exact', head: true }),
            supabase.from('products').select('*', { count: 'exact', head: true }),
            supabase.from('products').select('*', { count: 'exact', head: true }).eq('category', 'manual_entry')
        ]);

        const stats = {
            totalUsers: usersCountResult.count || 0,
            activeReports: reportsCountResult.count || 0,
            totalProducts: totalProductsResult.count || 0,
            manualProducts: manualProductsResult.count || 0,
            apiProducts: (totalProductsResult.count || 0) - (manualProductsResult.count || 0)
        };

        return res.status(200).json(stats);
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * GET /api/admin/reports
 * Fetch all product reports, including product details and user details.
 */
export async function getReports(req, res) {
    try {
        const { data, error } = await supabase
            .from('product_reports')
            .select(`
                id,
                issue_category,
                user_comment,
                created_at,
                user_profiles ( id, full_name, email ),
                products ( id, name, brand, barcode, image_url )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching reports:', error);
            return res.status(500).json({ error: 'Failed to fetch reports' });
        }

        return res.status(200).json(data);
    } catch (error) {
        console.error('Error in getReports:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * DELETE /api/admin/reports/:id
 * Delete a specific report.
 */
export async function deleteReport(req, res) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: 'Report ID is required' });
        }

        const { error } = await supabase
            .from('product_reports')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting report:', error);
            return res.status(500).json({ error: 'Failed to delete report' });
        }

        return res.status(200).json({ message: 'Report deleted successfully' });
    } catch (error) {
        console.error('Error in deleteReport:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * GET /api/admin/users
 * Fetch all users ordered by created_at DESC with scan and allergy counts.
 */
export async function getUsers(req, res) {
    try {
        const { data: users, error: usersError } = await supabase
            .from('user_profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (usersError) {
            console.error('Error fetching users:', usersError);
            return res.status(500).json({ error: 'Failed to fetch users' });
        }

        const [scansResult, allergiesResult] = await Promise.all([
            supabase.from('scanned_products').select('user_id'),
            supabase.from('user_allergies').select('user_id')
        ]);

        const scanCounts = {};
        if (scansResult.data) {
            for (const scan of scansResult.data) {
                scanCounts[scan.user_id] = (scanCounts[scan.user_id] || 0) + 1;
            }
        }

        const allergyCounts = {};
        if (allergiesResult.data) {
            for (const allergy of allergiesResult.data) {
                allergyCounts[allergy.user_id] = (allergyCounts[allergy.user_id] || 0) + 1;
            }
        }

        const enrichedUsers = users.map(user => ({
            ...user,
            scanCount: scanCounts[user.id] || 0,
            allergyCount: allergyCounts[user.id] || 0
        }));

        return res.status(200).json(enrichedUsers);
    } catch (error) {
        console.error('Error in getUsers:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * GET /api/admin/products
 * Fetch products, filter by type
 */
export async function getProducts(req, res) {
    try {
        const { type } = req.query; // 'api' sau 'manual'
        let query = supabase.from('products').select('*, scanned_products(id)').order('last_updated', { ascending: false });

        if (type === 'manual') {
            query = query.eq('category', 'manual_entry');
        } else {
            query = query.neq('category', 'manual_entry');
        }

        const { data: products, error } = await query;

        if (error) {
            console.error('Error fetching products:', error);
            return res.status(500).json({ error: 'Failed to fetch products' });
        }

        const enrichedProducts = products.map(product => {
            const scans = product.scanned_products ? product.scanned_products.length : 0;
            delete product.scanned_products;
            return {
                ...product,
                scanCount: scans
            };
        });

        return res.status(200).json(enrichedProducts);
    } catch (error) {
        console.error('Error in getProducts:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * PUT /api/admin/products/:id
 * Update product ingredients and re-run analysis
 */
export async function updateProductIngredients(req, res) {
    try {
        const { id } = req.params;
        const { ingredients_list } = req.body;

        if (!ingredients_list || typeof ingredients_list !== 'string') {
            return res.status(400).json({ error: 'Valid ingredients_list is required' });
        }

        // Fetch current product to keep name, brand etc for context
        const { data: product, error: fetchError } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Re-run analysis
        const analysis = await analyzeToxicity(ingredients_list, null, 'ro', {
            name: product.name,
            brand: product.brand,
            category: product.category
        });

        // Update product table
        const { data: updatedProduct, error: updateError } = await supabase
            .from('products')
            .update({
                ingredients_list,
                last_updated: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating product:', updateError);
            return res.status(500).json({ error: 'Failed to update product' });
        }

        // Delete old ingredients mapping
        await supabase.from('product_ingredients').delete().eq('product_id', id);

        // Save new ingredients mapping (re-implementing saveProductIngredients logic)
        const ingredientsBreakdown = analysis.ingredientsBreakdown;
        const foundIngredients = ingredientsBreakdown.filter(i => i.riskCategory !== 'unknown' && i.name);
        if (foundIngredients.length > 0) {
            const inciNames = foundIngredients.map(i => i.name);
            const { data: ingRows } = await supabase
                .from('ingredients')
                .select('id, inci_name')
                .in('inci_name', inciNames);

            if (ingRows && ingRows.length > 0) {
                const ingMap = new Map(ingRows.map(r => [r.inci_name.toUpperCase(), r.id]));
                const toInsert = foundIngredients
                    .map((ing, index) => {
                        const ingId = ingMap.get(ing.name.toUpperCase());
                        if (!ingId) return null;
                        return { product_id: id, ingredient_id: ingId, position: index };
                    })
                    .filter(Boolean);

                if (toInsert.length > 0) {
                    await supabase.from('product_ingredients').upsert(toInsert, { onConflict: 'product_id,ingredient_id', ignoreDuplicates: true });
                }
            }
        }

        return res.status(200).json({
            ...updatedProduct,
            analysis
        });

    } catch (error) {
        console.error('Error in updateProductIngredients:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * DELETE /api/admin/products/:id
 */
export async function deleteProduct(req, res) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: 'Product ID is required' });
        }

        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting product:', error);
            return res.status(500).json({ error: 'Failed to delete product' });
        }

        return res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error in deleteProduct:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
