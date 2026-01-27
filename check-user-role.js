import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

const email = 'teamsheizenwellness@gmail.com';

async function check() {
    console.log(`Checking role for ${email}...`);
    const { data: roleData } = await s.from('user_roles').select('role, user_id').eq('users.email', email).single();
    // Note: The above query might not work because of how relations are set up. 
    // Let's just fetch all roles and filter.
    const { data: allRoles } = await s.from('user_roles').select('role, user_id');
    console.log('All Roles:', allRoles);
}

check();
