import { supabase } from '../config/supabase.js';

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
