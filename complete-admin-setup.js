import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing environment variables!');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function addAdminRole() {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🔧 ADD ADMIN ROLE TO USER');
    console.log('═══════════════════════════════════════════════════════\n');

    const userId = '7d5268a1-7ccd-4470-986e-b7a72f4c77b5';
    const email = 'abduljinnah641@gmail.com';

    try {
        console.log('User ID:', userId);
        console.log('Email:', email);
        console.log('\n⏳ Adding profile...');

        // First, sign in as the user to get authenticated context
        const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
            email: email,
            password: 'Admin123!'
        });

        if (signInError) {
            console.error('❌ Sign in error:', signInError.message);
            console.log('\n⚠️  The user needs to confirm their email first!');
            console.log('Check the inbox for:', email);
            process.exit(1);
        }

        console.log('✅ Signed in successfully');

        // Now create profile
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                email: email,
                name: 'Samad',
                phone: '7806966124',
            });

        if (profileError) {
            console.error('❌ Profile error:', profileError.message);
        } else {
            console.log('✅ Profile created');
        }

        // Create role
        const { error: roleError } = await supabase
            .from('user_roles')
            .upsert({
                user_id: userId,
                role: 'admin'
            });

        if (roleError) {
            console.error('❌ Role error:', roleError.message);
        } else {
            console.log('✅ Admin role assigned');
        }

        console.log('\n═══════════════════════════════════════════════════════');
        console.log('✅ ADMIN SETUP COMPLETE!');
        console.log('═══════════════════════════════════════════════════════');
        console.log('You can now log in with:');
        console.log('Email:', email);
        console.log('Password: Admin123!');
        console.log('═══════════════════════════════════════════════════════\n');

        // Sign out
        await supabase.auth.signOut();

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

addAdminRole();
