// Test direct de conexiune Supabase - standalone
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('\n🔍 Testing Supabase Connection...\n');
console.log('URL:', supabaseUrl);
console.log('Key (first 20 chars):', supabaseKey?.substring(0, 20) + '...');
console.log('Key length:', supabaseKey?.length);

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing credentials!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test 1: Simple query
console.log('\n📊 Test 1: Count ingredients...');
try {
    const { count, error } = await supabase
        .from('ingredients')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('❌ Error:', error.message);
        console.error('Full error:', JSON.stringify(error, null, 2));
    } else {
        console.log('✅ SUCCESS! Total ingredients:', count);
    }
} catch (err) {
    console.error('❌ Exception:', err.message);
    console.error('Stack:', err.stack);
}

// Test 2: Actual data fetch
console.log('\n📊 Test 2: Fetch 3 ingredients...');
try {
    const { data, error } = await supabase
        .from('ingredients')
        .select('name, score, description')
        .limit(3);

    if (error) {
        console.error('❌ Error:', error.message);
    } else {
        console.log('✅ SUCCESS! Fetched ingredients:');
        data.forEach((ing, i) => {
            console.log(`  ${i + 1}. ${ing.name} (score: ${ing.score})`);
        });
    }
} catch (err) {
    console.error('❌ Exception:', err.message);
    console.error('Stack:', err.stack);
}

console.log('\n✨ Test complete!\n');
