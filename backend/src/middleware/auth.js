import { supabase } from '../config/supabase.js';

/**
 * Middleware pentru a verifica daca request-ul vine de la un utilizator autentificat in Supabase.
 * Extrage JWT-ul din header-ul Authorization si il valideaza.
 */
export const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized: No token provided' });
        }

        const token = authHeader.split(' ')[1];

        // Decodificam token-ul folosind instanta Supabase de pe server
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            console.error('Auth Error:', error?.message);
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }

        // Injectam datele utilizatorului in request pentru a fi folosite in controllere
        req.user = user;
        next();

    } catch (error) {
        console.error('Unexpected Auth Error:', error);
        res.status(500).json({ error: 'Internal Server Error during authentication' });
    }
};
