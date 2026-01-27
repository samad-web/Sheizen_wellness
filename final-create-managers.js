import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

async function run() {
    dotenv.config();

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const managers = [
        {
            email: 'sheizenwellness@gmail.com',
            password: 'Allah@31',
            name: 'Sheizen Wellness Manager',
            phone: '9663541327'
        }
    ];

    for (const manager of managers) {
        console.log(`Processing ${manager.email}...`);
        const { data, error } = await supabase.functions.invoke('create-admin', {
            body: {
                email: manager.email,
                password: manager.password,
                role: 'manager',
                userData: {
                    name: manager.name,
                    phone: manager.phone
                }
            }
        });

        console.log('Data:', JSON.stringify(data, null, 2));
        console.log('Error:', JSON.stringify(error, null, 2));
    }
}

run();
