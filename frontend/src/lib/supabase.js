import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Verificare preventiva - evita crash-uri criptice la startup
if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
        '[SUPABASE] Lipsesc variabilele de mediu EXPO_PUBLIC_SUPABASE_URL si/sau EXPO_PUBLIC_SUPABASE_ANON_KEY.\n' +
        'Creeaza un fisier .env in folderul frontend cu aceste valori.'
    );
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
