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

async function testRecipeInsert() {
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

    // Test creating a recipe
    console.log('🔄 Attempting to insert test recipe...');

    const testRecipe = {
        name: `Test Recipe ${Date.now()}`,
        description: 'A test recipe for debugging RLS',
        servings: 2,
        total_kcal: 500
    };

    const { data, error } = await supabase
        .from('recipes')
        .insert(testRecipe)
        .select()
        .single();

    if (error) {
        console.error('❌ Insert failed:', error.message);
        console.error('Code:', error.code);
    } else {
        console.log('✅ Insert successful:', data);

        // Clean up
        console.log('🧹 Cleaning up...');
        await supabase.from('recipes').delete().eq('id', data.id);
    }
}

testRecipeInsert();
