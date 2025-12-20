import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

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

// Define migrations to run in order
const MIGRATIONS_TO_RUN = [
    '20251219000400_create_achievements.sql',
    '20251219000500_achievement_triggers.sql'
];

async function applyMigrations() {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🔧 APPLYING ACHIEVEMENT MIGRATIONS');
    console.log('═══════════════════════════════════════════════════════\n');

    for (const filename of MIGRATIONS_TO_RUN) {
        try {
            const migrationPath = `./supabase/migrations/${filename}`;
            const sql = fs.readFileSync(migrationPath, 'utf8');

            console.log(`\n⏳ Applying migration: ${filename}...`);

            // Execute the entire file as a single block
            const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

            if (error) {
                console.error(`❌ Error applying ${filename}:`, error.message);

                // Since RPC is unreliable for some users, print instruction
                console.log('\n⚠️  MANUAL ACTION REQUIRED:');
                console.log('Please apply the migration manually in Supabase Dashboard:');
                console.log('1. Go to Supabase Dashboard → SQL Editor');
                console.log(`2. Copy the contents of: supabase/migrations/${filename}`);
                console.log('3. Paste and run the SQL\n');

                process.exit(1);
            } else {
                console.log(`✅ Success: ${filename}`);
            }

        } catch (error) {
            console.error(`\n❌ Fatal Error processing ${filename}:`, error.message);
            process.exit(1);
        }
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ MIGRATIONS COMPLETED');
    console.log('═══════════════════════════════════════════════════════\n');
}

applyMigrations();
