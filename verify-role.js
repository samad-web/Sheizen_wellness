import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

const email = 'teamsheizenwellness@gmail.com';

async function verify() {
    const { data: profile } = await s.from('profiles').select('id, email').eq('email', email).single();
    if (profile) {
        console.log(`User ID for ${email}: ${profile.id}`);
        const { data: role } = await s.from('user_roles').select('*').eq('user_id', profile.id).single();
        console.log('Role in user_roles table:', role);
    } else {
        console.log(`No profile found for ${email}`);
    }
}

verify();
