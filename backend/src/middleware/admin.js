import { supabase } from '../config/supabase.js';

export const adminMiddleware = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized: User not found in request' });
        }

        // Fetch user profile to check role
        const { data, error } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', userId)
            .single();

        if (error || !data) {
            console.error('Admin Middleware - Error fetching profile:', error);
            return res.status(403).json({ error: 'Forbidden: Could not verify admin status' });
        }

        if (data.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden: Requires admin role' });
        }

        // User is admin, proceed
        next();
    } catch (error) {
        console.error('Unexpected Admin Middleware Error:', error);
        res.status(500).json({ error: 'Internal Server Error during admin verification' });
    }
};
