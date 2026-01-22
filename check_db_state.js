
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Try to load env vars from .env file or process.env (assuming user has them reachable)
// Since this is node, we need to manually read or hope they are in env.
// Let's hardcode a safeguard to read from .env if we can't find them.
// Actually, in this environment, I can read the .env file content directly if needed.
// But let's try assuming standard process.env first if run via 'node -r dotenv/config'.
// Better yet, I'll read the .env file to get the keys.

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY; // Using anon key is fine for public check if RLS allows, but we need admin rights to inspect schema ideally.
// Actually, we can just try to SELECT with the extra column.

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking interest_forms table...");

    // Try to select the 'deleted_at' column. if it doesn't exist, this should error.
    const { data, error } = await supabase
        .from('interest_forms')
        .select('id, deleted_at')
        .limit(1);

    if (error) {
        console.log("Error selecting deleted_at:", error.message);
        if (error.message.includes('create the column') || error.message.includes('does not exist')) {
            console.log("VERDICT: Migration NOT applied. 'deleted_at' column is missing.");
        }
    } else {
        console.log("Success! 'deleted_at' column exists.");
    }

    // Check for has_role function via RPC if possible, or just assume policy based on above.
}

check();
