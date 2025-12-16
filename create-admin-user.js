import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import readline from 'readline';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing environment variables!');
    console.error('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are set in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function createAdminUser() {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🔧 CREATE ADMIN USER');
    console.log('═══════════════════════════════════════════════════════\n');

    try {
        const name = await question('Enter admin name: ');
        const email = await question('Enter admin email: ');
        const phone = await question('Enter admin phone: ');
        const password = await question('Enter admin password (min 6 characters): ');

        if (!name || !email || !phone || !password) {
            console.error('\n❌ All fields are required!');
            rl.close();
            return;
        }

        if (password.length < 6) {
            console.error('\n❌ Password must be at least 6 characters!');
            rl.close();
            return;
        }

        console.log('\n⏳ Creating admin user...');

        // Sign up the user
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name,
                    phone,
                }
            }
        });

        if (signUpError) {
            console.error('\n❌ Error creating user:', signUpError.message);
            rl.close();
            return;
        }

        if (!authData.user) {
            console.error('\n❌ User creation failed - no user data returned');
            rl.close();
            return;
        }

        console.log('✅ User created in auth.users');
        console.log('   User ID:', authData.user.id);

        // Create profile
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: authData.user.id,
                email: email,
                name: name,
                phone: phone,
            });

        if (profileError) {
            console.error('⚠️  Profile creation error:', profileError.message);
        } else {
            console.log('✅ Profile created');
        }

        // Assign admin role
        const { error: roleError } = await supabase
            .from('user_roles')
            .upsert({
                user_id: authData.user.id,
                role: 'admin'
            });

        if (roleError) {
            console.error('⚠️  Role assignment error:', roleError.message);
            console.log('\n⚠️  IMPORTANT: You need to manually assign the admin role in Supabase Dashboard');
            console.log('   1. Go to Supabase Dashboard → Table Editor → user_roles');
            console.log('   2. Add a new row:');
            console.log('      - user_id:', authData.user.id);
            console.log('      - role: admin');
        } else {
            console.log('✅ Admin role assigned');
        }

        console.log('\n═══════════════════════════════════════════════════════');
        console.log('✅ ADMIN USER CREATED SUCCESSFULLY!');
        console.log('═══════════════════════════════════════════════════════');
        console.log('Email:', email);
        console.log('Password:', password);
        console.log('\n⚠️  IMPORTANT: Check your email to confirm your account!');
        console.log('If email confirmation is required by Supabase, you must');
        console.log('confirm your email before you can log in.');
        console.log('\nTo disable email confirmation:');
        console.log('1. Go to Supabase Dashboard → Authentication → Providers');
        console.log('2. Click on Email provider');
        console.log('3. Disable "Confirm email"');
        console.log('═══════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    } finally {
        rl.close();
    }
}

createAdminUser();
