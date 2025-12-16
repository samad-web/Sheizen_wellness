import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing environment variables!');
    console.error('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are set in .env');
    process.exit(1);
}

// Use service role key if available (for admin access), otherwise use anon key
const supabase = SUPABASE_SERVICE_ROLE_KEY 
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
    : createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getUsers() {
    try {
        console.log('🔍 Fetching user information...\n');
        
        if (SUPABASE_SERVICE_ROLE_KEY) {
            console.log('✅ Using service role key - can access auth.users directly\n');
        } else {
            console.log('⚠️  Using anon key - limited access. For full access, set SUPABASE_SERVICE_ROLE_KEY in .env\n');
        }

        let usersWithRoles = [];

        // Try to get users from auth.users if we have service role key
        if (SUPABASE_SERVICE_ROLE_KEY) {
            try {
                const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
                
                if (!authError && users) {
                    // Get user roles
                    const { data: roles } = await supabase
                        .from('user_roles')
                        .select('user_id, role');

                    // Get profiles
                    const { data: profiles } = await supabase
                        .from('profiles')
                        .select('id, name, email, phone');

                    usersWithRoles = users.map(user => {
                        const profile = profiles?.find(p => p.id === user.id);
                        const userRole = roles?.find(r => r.user_id === user.id);
                        return {
                            user_id: user.id,
                            email: user.email,
                            name: profile?.name || user.user_metadata?.name || 'N/A',
                            phone: profile?.phone || user.user_metadata?.phone || 'N/A',
                            role: userRole?.role || 'unknown',
                            email_confirmed: user.email_confirmed_at ? 'Yes' : 'No',
                            created_at: user.created_at
                        };
                    });
                }
            } catch (err) {
                console.log('⚠️  Could not access auth.users, trying profiles table...\n');
            }
        }

        // Fallback: Get from profiles table (works with anon key)
        if (usersWithRoles.length === 0) {
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, name, email, phone');

            if (profilesError) {
                console.error('❌ Error fetching profiles:', profilesError.message);
                return;
            }

            // Get all user roles
            const { data: roles, error: rolesError } = await supabase
                .from('user_roles')
                .select('user_id, role');

            if (rolesError) {
                console.error('⚠️  Error fetching roles:', rolesError.message);
            }

            // Combine the data
            usersWithRoles = profiles.map(profile => {
                const userRole = roles?.find(r => r.user_id === profile.id);
                return {
                    user_id: profile.id,
                    name: profile.name,
                    email: profile.email,
                    phone: profile.phone,
                    role: userRole?.role || 'unknown',
                    email_confirmed: 'Unknown',
                    created_at: 'Unknown'
                };
            });
        }

        // Separate admins and clients
        const admins = usersWithRoles.filter(u => u.role === 'admin');
        const clients = usersWithRoles.filter(u => u.role === 'client');

        console.log('═══════════════════════════════════════════════════════');
        console.log('👑 ADMIN USERS');
        console.log('═══════════════════════════════════════════════════════');
        if (admins.length === 0) {
            console.log('No admin users found.');
            console.log('\n💡 To create an admin user:');
            console.log('   1. Visit /setup-admin in your app');
            console.log('   2. Or use Supabase Dashboard > Authentication > Users');
        } else {
            admins.forEach((admin, index) => {
                console.log(`\n${index + 1}. Admin User:`);
                console.log(`   User ID: ${admin.user_id}`);
                console.log(`   Name: ${admin.name || 'N/A'}`);
                console.log(`   Email: ${admin.email || 'N/A'}`);
                console.log(`   Phone: ${admin.phone || 'N/A'}`);
                console.log(`   Role: ${admin.role}`);
                if (admin.email_confirmed !== 'Unknown') {
                    console.log(`   Email Confirmed: ${admin.email_confirmed}`);
                }
                if (admin.created_at !== 'Unknown') {
                    console.log(`   Created: ${new Date(admin.created_at).toLocaleString()}`);
                }
            });
        }

        console.log('\n═══════════════════════════════════════════════════════');
        console.log('👤 CLIENT USERS');
        console.log('═══════════════════════════════════════════════════════');
        if (clients.length === 0) {
            console.log('No client users found.');
        } else {
            clients.forEach((client, index) => {
                console.log(`\n${index + 1}. Client User:`);
                console.log(`   User ID: ${client.user_id}`);
                console.log(`   Name: ${client.name || 'N/A'}`);
                console.log(`   Email: ${client.email || 'N/A'}`);
                console.log(`   Phone: ${client.phone || 'N/A'}`);
                console.log(`   Role: ${client.role}`);
                if (client.email_confirmed !== 'Unknown') {
                    console.log(`   Email Confirmed: ${client.email_confirmed}`);
                }
                if (client.created_at !== 'Unknown') {
                    console.log(`   Created: ${new Date(client.created_at).toLocaleString()}`);
                }
            });
        }

        console.log('\n═══════════════════════════════════════════════════════');
        console.log('⚠️  IMPORTANT: PASSWORD INFORMATION');
        console.log('═══════════════════════════════════════════════════════');
        console.log('Passwords are securely hashed by Supabase Auth and');
        console.log('cannot be retrieved. To reset a password:');
        console.log('1. Use Supabase Dashboard > Authentication > Users');
        console.log('2. Or use password reset functionality in the app');
        console.log('3. Or use Supabase Admin API to reset password');
        console.log('═══════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

getUsers();

