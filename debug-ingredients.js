
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
    console.log('--- Debugging DB Relationships ---');

    // 1. Check Recipes Count
    const { count: recipeCount, error: rCountErr } = await supabase.from('recipes').select('*', { count: 'exact', head: true });
    if (rCountErr) console.error('Error counting recipes:', rCountErr);
    else console.log('Total Recipes:', recipeCount);

    // 2. Check Ingredients Count
    const { count: ingCount, error: iCountErr } = await supabase.from('ingredients').select('*', { count: 'exact', head: true });
    if (iCountErr) console.error('Error counting ingredients:', iCountErr);
    else console.log('Total Ingredients:', ingCount);

    let recipeId;

    if (recipeCount === 0) {
        console.log('No recipes to test join against. Inserting dummy recipe...');
        const { data: newRecipe, error: createError } = await supabase.from('recipes').insert({
            name: 'Debug Recipe',
            servings: 1,
            total_kcal: 100
        }).select().single();

        if (createError) {
            console.error('Failed to create dummy recipe:', createError);
            return;
        }
        console.log('Created dummy recipe:', newRecipe.id);
        recipeId = newRecipe.id;
    } else {
        // 3. Fetch one recipe
        const { data: recipes } = await supabase.from('recipes').select('id').limit(1);
        recipeId = recipes[0].id;
    }

    await testJoin(recipeId);
}

async function testJoin(recipeId) {
    console.log('Testing with Recipe ID:', recipeId);

    // 4. Test Join
    console.log('Attempting fetch recipe_ingredients with ingredients join...');
    const { data, error } = await supabase
        .from('recipe_ingredients')
        .select('*, ingredients(*)')
        .eq('recipe_id', recipeId);

    if (error) {
        console.error('❌ JOIN QUERY FAILED:', JSON.stringify(error, null, 2));

        // 5. Fallback: try fetching without join
        console.log('Attempting fetch WITHOUT join...');
        const { data: rawData, error: rawError } = await supabase
            .from('recipe_ingredients')
            .select('*')
            .eq('recipe_id', recipeId);

        if (rawError) {
            console.error('❌ RAW SELECT FAILED:', rawError);
        } else {
            console.log('✅ RAW SELECT SUCCESS. Found:', rawData.length, 'rows.');
            if (rawData.length > 0) console.log('First item:', rawData[0]);
        }

    } else {
        console.log('✅ JOIN QUERY SUCCESS!');
        console.log('Data found:', data.length);
        if (data.length > 0) console.log('Sample:', JSON.stringify(data[0], null, 2));
    }
}

debug();
