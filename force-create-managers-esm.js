import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
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
    },
    {
        email: 'teamsheizenwellness@gmail.com',
        password: 'Aysha@1',
        name: 'Team Sheizen Wellness',
        phone: '9663541328'
    }
];

async function createManagers() {
    for (const manager of managers) {
        console.log(`Attempting to create manager: ${manager.email}`);
        try {
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

            if (error) {
                console.error(`Error invoking function for ${manager.email}:`, error);
            } else if (data?.error) {
                console.error(`Function returned error for ${manager.email}:`, data.error);
            } else {
                console.log(`Successfully created manager: ${manager.email}`);
            }
        } catch (err) {
            console.error(`Exception creating ${manager.email}:`, err);
        }
    }
}

createManagers();
