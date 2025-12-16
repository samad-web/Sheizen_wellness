import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('🔍 Testing Supabase Database Connection...\n');
console.log('Configuration:');
console.log('- URL:', SUPABASE_URL);
console.log('- Key:', SUPABASE_KEY ? `${SUPABASE_KEY.substring(0, 20)}...` : 'NOT FOUND');
console.log('');

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing environment variables!');
    console.error('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are set in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testConnection() {
    try {
        console.log('1️⃣ Testing basic connection...');

        // Test 1: Check if we can query the database
        const { data: tables, error: tablesError } = await supabase
            .from('clients')
            .select('count')
            .limit(1);

        if (tablesError) {
            console.error('❌ Failed to query clients table:', tablesError.message);
        } else {
            console.log('✅ Successfully connected to database');
            console.log('✅ Can query clients table');
        }

        // Test 2: Check authentication
        console.log('\n2️⃣ Testing authentication...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
            console.log('⚠️  No active session (this is normal if not logged in)');
        } else if (session) {
            console.log('✅ Active session found:', session.user.email);
        } else {
            console.log('ℹ️  No active session (not logged in)');
        }

        // Test 3: List all tables we can access
        console.log('\n3️⃣ Testing table access...');
        const tablesToTest = [
            'clients',
            'user_roles',
            'daily_logs',
            'meal_logs',
            'interest_forms',
            'ingredients'
        ];

        for (const table of tablesToTest) {
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .limit(1);

            if (error) {
                console.log(`❌ ${table}: ${error.message}`);
            } else {
                console.log(`✅ ${table}: Accessible (${data ? data.length : 0} rows in sample)`);
            }
        }

        // Test 4: Check storage buckets
        console.log('\n4️⃣ Testing storage access...');
        const { data: buckets, error: bucketsError } = await supabase
            .storage
            .listBuckets();

        if (bucketsError) {
            console.log('❌ Storage access failed:', bucketsError.message);
        } else {
            console.log('✅ Storage accessible');
            console.log('   Buckets:', buckets.map(b => b.name).join(', ') || 'None');
        }

        console.log('\n✅ Database connection test completed!');

    } catch (error) {
        console.error('\n❌ Connection test failed:', error.message);
        process.exit(1);
    }
}

testConnection();
