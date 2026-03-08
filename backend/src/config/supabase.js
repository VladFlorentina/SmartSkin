import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
// Backend-ul foloseste Service Role Key pentru acces complet la DB (bypass RLS)
// Anon Key se foloseste DOAR pe frontend (client-side, cu RLS activ) - NU pe backend
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials in .env file (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Test connection - verifica accesul la tabelul ingredients (CosIng ~30,000 ingrediente)
export async function testConnection() {
  try {
    const { count, error } = await supabase
      .from('ingredients')
      .select('inci_name', { count: 'exact', head: true });
    if (error) throw error;
    console.log(`[INFO] Supabase connection successful - ${count || '?'} ingredients in database`);
    return true;
  } catch (error) {
    console.error('[ERROR] Supabase connection failed:', error.message);
    return false;
  }
}
