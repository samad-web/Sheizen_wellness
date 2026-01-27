import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

const emails = ['sheizenwellness@gmail.com', 'teamsheizenwellness@gmail.com'];

async function verifyAll() {
    for (const email of emails) {
        console.log(`Checking ${email}...`);
        const { data: profile } = await s.from('profiles').select('id, email').eq('email', email).maybeSingle();
        if (profile) {
            const { data: role } = await s.from('user_roles').select('role').eq('user_id', profile.id).maybeSingle();
            console.log(`  Profile ID: ${profile.id}`);
            console.log(`  Role in DB: ${role?.role}`);
        } else {
            console.log(`  No profile found for ${email}`);
        }
    }
}

verifyAll();
