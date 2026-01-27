import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogin(email, password) {
    console.log(`Testing login for ${email}...`);
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        console.error('❌ Login failed:', error.message);
    } else {
        console.log('✅ Login successful!');
        console.log('User ID:', data.user.id);
    }
}

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
    console.log('Usage: node test-login.js <email> <password>');
    process.exit(1);
}

testLogin(email, password);
