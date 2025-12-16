import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing environment variables!');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testIngredientInsert() {
    console.log('🔄 Attempting to sign in...');
    const email = 'aakashkummar1258@gmail.com';
    const password = 'Admin123!';

    const { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (signInError) {
        console.error('❌ Sign in error:', signInError.message);
        return;
    }

    console.log('✅ Signed in as:', session.user.id);

    // Test creating an ingredient
    console.log('🔄 Attempting to insert test ingredient...');

    const testIngredient = {
        name: `Test Ingredient ${Date.now()}`,
        serving_size: '100',
        serving_unit: 'g',
        kcal_per_serving: 100,
        protein: 20,
        carbs: 0,
        fats: 5
    };

    const { data, error } = await supabase
        .from('ingredients')
        .insert(testIngredient)
        .select()
        .single();

    if (error) {
        console.error('❌ Insert failed:', error.message);
        console.error('Details:', error.details);
        console.error('Hint:', error.hint);
        console.error('Code:', error.code);
    } else {
        console.log('✅ Insert successful:', data);

        // Clean up
        console.log('🧹 Cleaning up...');
        await supabase.from('ingredients').delete().eq('id', data.id);
    }
}

testIngredientInsert();
