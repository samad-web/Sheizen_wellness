import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

const managers = [
    { email: 'sheizenwellness@gmail.com', password: 'Allah@31' },
    { email: 'teamsheizenwellness@gmail.com', password: 'Aysha@1' }
];

for (const m of managers) {
    const { data, error } = await s.auth.signUp({
        email: m.email,
        password: m.password,
    });
    if (data.user) {
        console.log(`${m.email}: ${data.user.id}`);
    } else {
        // If already exists, we might need to signIn to get ID (if we know password)
        const { data: signData, error: signError } = await s.auth.signInWithPassword({
            email: m.email,
            password: m.password
        });
        if (signData.user) {
            console.log(`${m.email}: ${signData.user.id}`);
        } else {
            console.log(`${m.email}: Error ${signError?.message}`);
        }
    }
}
