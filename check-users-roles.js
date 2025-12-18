
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUsersRoles() {
    console.log('Fetching all users...');
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
        console.error('Error fetching users:', usersError);
        return;
    }

    console.log(`Found ${users.length} users.`);

    console.log('Fetching user_roles...');
    const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

    if (rolesError) {
        console.error('Error fetching user_roles:', rolesError);
        return;
    }

    console.log(`Found ${userRoles.length} role entries.`);

    const usersWithoutRoles = users.filter(user =>
        !userRoles.some(role => role.user_id === user.id)
    );

    if (usersWithoutRoles.length > 0) {
        console.log('Users without roles:');
        usersWithoutRoles.forEach(user => {
            console.log(`- ${user.email} (ID: ${user.id})`);
        });
    } else {
        console.log('All users have roles.');
    }
}

checkUsersRoles();
