import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL) {
    console.error('❌ Missing VITE_SUPABASE_URL in .env');
    process.exit(1);
}

const supabaseKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
if (!supabaseKey) {
    console.error('❌ Missing Supabase key in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, supabaseKey);

async function applyMigration() {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🔧 APPLYING RLS FIX MIGRATION');
    console.log('═══════════════════════════════════════════════════════\n');

    try {
        const migrationPath = process.argv[2] || './supabase/migrations/20251215000000_fix_user_registration_rls.sql';
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('⏳ Applying migration...\n');
        console.log(sql);
        console.log('\n');

        // Split SQL into individual statements
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const statement of statements) {
            if (statement.trim()) {
                console.log(`Executing: ${statement.substring(0, 60)}...`);
                const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });

                if (error) {
                    console.error('❌ Error:', error.message);
                } else {
                    console.log('✅ Success');
                }
            }
        }

        console.log('\n═══════════════════════════════════════════════════════');
        console.log('✅ MIGRATION APPLIED');
        console.log('═══════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.log('\n⚠️  MANUAL ACTION REQUIRED:');
        console.log('Please apply the migration manually in Supabase Dashboard:');
        console.log('1. Go to Supabase Dashboard → SQL Editor');
        console.log('2. Copy the contents of:');
        console.log('   supabase/migrations/20251215000000_fix_user_registration_rls.sql');
        console.log('3. Paste and run the SQL\n');
        process.exit(1);
    }
}

applyMigration();
