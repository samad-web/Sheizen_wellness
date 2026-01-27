import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const managers = [
    {
        email: 'sheizenwellness@gmail.com',
        password: 'Allah@31',
        userData: { name: 'Sheizen Wellness Manager' }
    },
    {
        email: 'teamsheizenwellness@gmail.com',
        password: 'Aysha@1',
        userData: { name: 'Team Sheizen Manager' }
    }
];

async function fixManagers() {
    console.log('🚀 Fixing manager accounts via create-admin Edge Function...');

    for (const manager of managers) {
        process.stdout.write(`⏳ Processing ${manager.email}... `);

        try {
            const { data, error } = await supabase.functions.invoke('create-admin', {
                body: {
                    email: manager.email,
                    password: manager.password,
                    userData: manager.userData,
                    role: 'manager'
                }
            });

            if (error) {
                console.log('❌ Error invoking function');
                console.error(error);
            } else if (data && data.error) {
                console.log('❌ Error from function');
                console.error(data.error);

                if (data.error.includes('already exists')) {
                    console.log(`   Trying to update password for existing user...`);
                    const { data: updateData, error: updateError } = await supabase.functions.invoke('update-manager-password', {
                        body: {
                            email: manager.email,
                            newPassword: manager.password
                        }
                    });
                    if (updateError || (updateData && updateData.error)) {
                        console.error('   ❌ Password update failed:', updateError || updateData.error);
                    } else {
                        console.log('   ✅ Password updated successfully!');
                    }
                }
            } else {
                console.log('✅ Success!');
            }
        } catch (err) {
            console.log('❌ Unexpected error');
            console.error(err);
        }
    }
    console.log('\n✨ Finished fixing managers.');
}

fixManagers();
