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
                    role: 'admin' // Pass role in metadata for the trigger to pick up
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

        // Profile and role should be created by trigger
        // We can verify if they exist, or just fetch the role to confirm.

        console.log('⏳ Verifying admin role...');
        // Wait a moment for trigger to fire
        await new Promise(resolve => setTimeout(resolve, 2000));

        const { data: roleData, error: roleCheckError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', authData.user.id)
            .single();

        if (roleCheckError || !roleData) {
            console.warn('⚠️  Could not verify role automatically. Trigger might not have fired yet.');
            console.log('   Attempting manual assignment as fallback...');

            const { error: roleError } = await supabase
                .from('user_roles')
                .upsert({
                    user_id: authData.user.id,
                    role: 'admin'
                });

            if (roleError) {
                console.error('⚠️  Manual role assignment failed:', roleError.message);
                console.log('   Please check Supabase Dashboard to ensure user has "admin" role.');
            } else {
                console.log('✅ Admin role assigned manually.');
            }
        } else if (roleData.role !== 'admin') {
            console.warn(`⚠️  User created but has role "${roleData.role}" instead of "admin".`);
            console.log('   Please update the role in Supabase Dashboard.');
        } else {
            console.log('✅ Admin role verified!');
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
