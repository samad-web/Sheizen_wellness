import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testHungRPC() {
    console.log("Starting RPC test...");

    // 1. Sign in to get a valid user context (triggers 'authenticated' role)
    // Using credentials from test-recipe-insert.js if valid, or just random if we want to fail login?
    // We need to be authenticated to call the RPC (I set GRANT TO authenticated)
    const email = 'aakashkummar1258@gmail.com';
    const password = 'Admin123!';

    console.log(`Signing in as ${email}...`);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (authError) {
        console.error("Login failed:", authError.message);
        return;
    }
    console.log("Logged in. User ID:", authData.session.user.id);

    // 2. Call the RPC
    console.log("Calling get_user_role RPC...");
    const startTime = Date.now();

    // Set a timeout to detect hang locally
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout detection")), 5000)
    );

    try {
        const result = await Promise.race([
            supabase.rpc('get_user_role', { target_user_id: authData.session.user.id }),
            timeoutPromise
        ]);

        const duration = Date.now() - startTime;
        console.log(`RPC returned in ${duration}ms`);
        if (result.error) {
            console.error("RPC Error:", result.error);
        } else {
            console.log("RPC Data:", result.data);
        }

    } catch (err) {
        console.error("RPC Failed/Timed out:", err);
    }
}

testHungRPC();
