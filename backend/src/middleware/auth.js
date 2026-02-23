import { supabase } from '../config/supabase.js';

/**
 * Middleware optional: daca exista token valid il decodifica si populeaza req.user.
 * Daca nu exista token sau e invalid, continua fara a bloca request-ul.
 * Folosit pentru endpoint-uri publice care ofera functionalitate suplimentara utilizatorilor logati.
 */
export const optionalAuthMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(); // Nu e niciun token - continua fara user
        }
        const token = authHeader.split(' ')[1];
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) {
            req.user = user; // Injecteaza userul daca token-ul e valid
        }
        next();
    } catch {
        next(); // Orice eroare -> continua fara user
    }
};

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
