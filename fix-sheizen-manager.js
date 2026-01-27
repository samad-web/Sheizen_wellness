import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const email = 'sheizenwellness@gmail.com';
const password = 'Allah@31';

async function fix() {
    console.log(`Force fixing account: ${email}`);

    // We already signed them up, so let's just make sure they exist and have the right password
    // Actually, since I can't update user password without service role, I'll recommend the SQL way or Edge Function
    // But I can try to signUp again (it might error if exists)

    const { data: signData, error: signError } = await supabase.auth.signUp({
        email,
        password
    });

    if (signError) {
        console.log('SignUp result:', signError.message);
    } else {
        console.log('SignUp success or user already exists');
    }
}

fix();
