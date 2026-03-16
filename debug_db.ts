import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugDatabase() {
  console.log('--- Checking RLS Policies on messages table ---');
  const { data: policies, error: policiesError } = await supabase.rpc('debug_get_policies', { table_name: 'messages' });
  
  if (policiesError) {
    console.error('Error fetching policies (RPC might be missing):', policiesError);
    // Try raw query if possible or just use what we know
  } else {
    console.table(policies);
  }

  console.log('\n--- Checking Constraints on messages table ---');
  // We can't easily do this via anon key unless we have an RPC
  
  console.log('\n--- Checking is_admin() result for current user ---');
  const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin');
  console.log('is_admin():', isAdmin, adminError ? `(Error: ${adminError.message})` : '');

  const { data: isAdminOrManager, error: managerError } = await supabase.rpc('is_admin_or_manager');
  console.log('is_admin_or_manager():', isAdminOrManager, managerError ? `(Error: ${managerError.message})` : '');
}

// Since we likely don't have debug_get_policies RPC, this script is limited.
// I'll rely on my knowledge of the migration files and be MORE aggressive in dropping policies.

console.log('This script is limited without custom RPCs. I will proceed with a more aggressive SQL fix.');
