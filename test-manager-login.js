import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

const email = 'teamsheizenwellness@gmail.com';
const password = 'Aysha@1';

async function testLogin() {
    console.log(`Attempting login for ${email}...`);
    const { data: { user, session }, error } = await s.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        console.error('Login Error:', error.message);
        return;
    }

    console.log('Login Success!');
    console.log('User Email:', user.email);
    console.log('User ID:', user.id);
    console.log('User Metadata Role:', user.user_metadata?.role);

    // Fetch role from user_roles table
    const { data: roleData } = await s.from('user_roles').select('role').eq('user_id', user.id).single();
    console.log('Database Role:', roleData?.role);
}

testLogin();
