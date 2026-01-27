const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log('Testing Edge Function create-admin...');
    const payload = {
        email: 'sheizenwellness@gmail.com',
        password: 'Allah@31',
        role: 'manager',
        userData: { name: 'Manager 1' }
    };

    const { data, error } = await supabase.functions.invoke('create-admin', {
        body: payload
    });

    if (error) {
        console.log('Invoke Error:', error);
    } else {
        console.log('Invoke Data:', data);
    }
}

test();
