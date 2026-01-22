import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function applyFix() {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🔧 APPLYING USER_ROLES RLS FIX');
    console.log('═══════════════════════════════════════════════════════\n');

    try {
        const migrationPath = './supabase/migrations/20260112000000_fix_user_roles_circular_rls.sql';
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Migration SQL:');
        console.log('─'.repeat(60));
        console.log(sql);
        console.log('─'.repeat(60));
        console.log('\n⚠️  Please apply this SQL manually in Supabase Dashboard:');
        console.log('1. Go to: https://ljxgaycjomnyfihdsgke.supabase.co/project/ljxgaycjomnyfihdsgke/sql');
        console.log('2. Paste the SQL shown above');
        console.log('3. Click "Run"');
        console.log('4. Once applied, refresh your browser and try logging in again\n');

    } catch (error) {
        console.error('❌ Error reading migration file:', error.message);
        process.exit(1);
    }
}

applyFix();
