import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase environment variables! Check your .env file.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const newManagers = [
    {
        email: 'sheizenwellness@gmail.com',
        password: 'Allah@31',
        name: 'Sheizen Wellness Manager'
    },
    {
        email: 'teamsheizenwellness@gmail.com',
        password: 'Aysha@1',
        name: 'Team Sheizen Manager'
    }
];

async function createManagers() {
    console.log('🚀 Starting manager creation via signUp...\n');

    for (const manager of newManagers) {
        process.stdout.write(`⏳ Registering ${manager.email}... `);

        try {
            const { data, error } = await supabase.auth.signUp({
                email: manager.email,
                password: manager.password,
                options: {
                    data: {
                        name: manager.name,
                        role: 'manager'
                    }
                }
            });

            if (error) {
                console.log('❌ Failed');
                console.error(`   Error during signUp: ${error.message}`);
            } else if (!data.user) {
                console.log('❌ Failed');
                console.error('   No user record returned. Email confirmation might be required.');
            } else {
                console.log('✅ Success!');
                console.log(`   User ID: ${data.user.id}`);
            }
        } catch (err) {
            console.log('❌ Failed');
            console.error(`   Unexpected error: ${err.message}`);
        }
    }

    console.log('\n✨ Manager registration finished.');
    console.log('⚠️  IMPORTANT: If registration was successful but login fails,');
    console.log('   ensure that "Email confirmation" is disabled in Supabase');
    console.log('   or that the emails have been confirmed manually.');
}

createManagers();
