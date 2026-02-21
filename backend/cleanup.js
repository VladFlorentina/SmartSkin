import { supabase } from './src/config/supabase.js';

async function cleanup() {
    console.log('Cleaning up fake demo products...');
    const { data, error } = await supabase
        .from('products')
        .delete()
        .eq('name', 'Cosmetic Demo (Produs Nou)');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Successfully deleted fake products.');
    }
    process.exit(0);
}

cleanup();
