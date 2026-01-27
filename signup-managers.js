import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

const managers = [
    { email: 'sheizenwellness@gmail.com', password: 'Allah@31' },
    { email: 'teamsheizenwellness@gmail.com', password: 'Aysha@1' }
];

for (const m of managers) {
    console.log(`Signing up ${m.email}...`);
    const { data, error } = await s.auth.signUp({
        email: m.email,
        password: m.password,
    });
    if (error) console.log('Error:', error.message);
    else console.log('Check email for confirmation (if enabled) or user created with ID:', data.user?.id);
}
