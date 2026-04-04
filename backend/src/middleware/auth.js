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
            return next(); 
        }
        const token = authHeader.split(' ')[1];
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) {
            req.user = user; 
        }
        next();
    } catch {
        next(); 
    }
};

export const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized: No token provided' });
        }

        const token = authHeader.split(' ')[1];

       
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            console.error('Auth Error:', error?.message);
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }

        
        req.user = user;
        next();

    } catch (error) {
        console.error('Unexpected Auth Error:', error);
        res.status(500).json({ error: 'Internal Server Error during authentication' });
    }
};
