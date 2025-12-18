
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
    const { data, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .limit(1);

    if (error) {
        // If we can't select, maybe we can't infer type easily from JS client 
        // without inspecting error or using rpc? 
        // Let's try to just insert a known UUID string and see if it works?
        // Or better, let's use the error message from a bad query to tell us the type?
        console.log('Error selecting:', error);
    }

    // actually we can't query information_schema easily via client unless exposed.
    // But we can try to filter with a number and see error?
    // Or just rely on the previous error 'uuid = text'.

    console.log('Attempting cross-type query to infer type...');

    // This is a bit hacky.
    // If user_id is UUID, .eq('user_id', 'not-a-uuid') should fail with specific error?
    const { error: uuidError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', 'not-a-uuid');

    if (uuidError) {
        console.log('Query with non-UUID string returned error:', uuidError.message);
        if (uuidError.message.includes('invalid input syntax for type uuid')) {
            console.log('CONCLUSION: user_id is UUID');
        }
    } else {
        console.log('Query with non-UUID string succeeded (returned empty or data).');
        console.log('CONCLUSION: user_id is likely TEXT');
    }
}

checkSchema();
