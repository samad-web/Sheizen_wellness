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

async function testRecipeIngredientInsert() {
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

    // 1. Create a temporary recipe
    console.log('🔄 Creating temp recipe...');
    const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({ name: 'Temp Recipe', servings: 1 })
        .select()
        .single();

    if (recipeError) {
        console.error('❌ Recipe creation failed (fix previous issue first?):', recipeError.message);
        return;
    }

    // 2. Create a temporary ingredient
    console.log('🔄 Creating temp ingredient...');
    const { data: ingredient, error: ingredientError } = await supabase
        .from('ingredients')
        .insert({
            name: 'Temp Ing',
            serving_size: '100',
            serving_unit: 'g',
            kcal_per_serving: 100
        })
        .select()
        .single();

    if (ingredientError) {
        console.error('❌ Ingredient creation failed:', ingredientError.message);
        // cleanup recipe
        await supabase.from('recipes').delete().eq('id', recipe.id);
        return;
    }

    // 3. Test insert into recipe_ingredients
    console.log('🔄 Attempting to insert recipe ingredient...');

    const testRecipeIngredient = {
        recipe_id: recipe.id,
        ingredient_id: ingredient.id,
        quantity: 50,
        unit: 'g'
    };

    const { data, error } = await supabase
        .from('recipe_ingredients')
        .insert(testRecipeIngredient)
        .select()
        .single();

    if (error) {
        console.error('❌ Insert failed:', error.message);
        console.error('Code:', error.code);
    } else {
        console.log('✅ Insert successful:', data);
    }

    // Clean up
    console.log('🧹 Cleaning up...');
    await supabase.from('recipe_ingredients').delete().eq('id', data?.id);
    await supabase.from('recipes').delete().eq('id', recipe.id);
    await supabase.from('ingredients').delete().eq('id', ingredient.id);
}

testRecipeIngredientInsert();
