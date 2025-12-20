const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jphqfuxfihasvktpysia.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is required');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log('Checking community_posts...');
    const { data: posts, error: postsError } = await supabase
        .from('community_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (postsError) {
        console.error('Error fetching posts:', postsError);
    } else {
        console.log('Recent posts:', posts.map(p => ({ id: p.id, title: p.title, author: p.author_display_name, visibility: p.visibility })));
    }

    console.log('\nChecking messages...');
    const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (messagesError) {
        console.error('Error fetching messages:', messagesError);
    } else {
        console.log('Recent messages:', messages.map(m => ({ id: m.id, client_id: m.client_id, sender_type: m.sender_type, content: m.content.slice(0, 30) })));
    }
}

checkData();
