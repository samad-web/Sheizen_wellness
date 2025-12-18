
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

const TARGET_USER_ID = '891d5d56-93f3-4345-ada5-405620e0f352';

async function checkUser() {
    console.log(`Checking role for user: ${TARGET_USER_ID}`);

    // Check 1: Does the user exist in user_roles?
    const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        // We try querying with the ID as is
        .eq('user_id', TARGET_USER_ID);

    if (roleError) {
        console.error('Error fetching from user_roles:', roleError);
    } else {
        console.log('Role Data Found:', roleData);
        if (roleData.length === 0) {
            console.log('⚠️  NO ROLE FOUND for this user.');
        } else {
            console.log('✅ Role exists in DB:', roleData[0]);
        }
    }

    // Check 2: Inspect the table structure (types) if possible by causing a type error
    // or just inferring from what we found.
    // If we found data, we know it matches.
}

checkUser();
