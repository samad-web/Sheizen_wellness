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

async function testFetchRole() {
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

    console.log('🔄 Fetching user role...');
    // Set a timeout to detect hang
    const timeout = setTimeout(() => {
        console.error('❌ TIMEOUT: Fetching user role took too long!');
        process.exit(1);
    }, 5000);

    try {
        const { data, error } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id)
            .single();

        clearTimeout(timeout);

        if (error) {
            console.error('❌ Error fetching role:', error);
        } else {
            console.log('✅ User role fetched:', data);
        }
    } catch (err) {
        console.error('❌ Unexpected error:', err);
    }
}

testFetchRole();
