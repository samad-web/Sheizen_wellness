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

async function testFoodItemInsert() {
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

    // Test creating a food item
    console.log('🔄 Attempting to insert test food item...');

    const testFoodItem = {
        name: `Test Food Item ${Date.now()}`,
        serving_size: '100',
        serving_unit: 'g',
        kcal_per_serving: 150,
        protein: 10,
        carbs: 20,
        fats: 5
    };

    const { data, error } = await supabase
        .from('food_items')
        .insert(testFoodItem)
        .select()
        .single();

    if (error) {
        console.error('❌ Insert failed:', error.message);
        console.error('Code:', error.code);
    } else {
        console.log('✅ Insert successful:', data);

        // Clean up
        console.log('🧹 Cleaning up...');
        await supabase.from('food_items').delete().eq('id', data.id);
    }
}

testFoodItemInsert();
