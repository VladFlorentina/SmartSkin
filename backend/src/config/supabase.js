import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials in .env file');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Test connection
export async function testConnection() {
  try {
    const { data, error } = await supabase.from('ingredients').select('count');
    if (error) throw error;
    console.log('[INFO] Supabase connection successful');
    return true;
  } catch (error) {
    console.error('[ERROR] Supabase connection failed:', error.message);
    return false;
  }
}
