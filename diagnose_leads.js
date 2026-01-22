import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    console.log("=== LEADS DIAGNOSTIC ===\n");

    // 1. Check if user is authenticated
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
        console.log("❌ Session Error:", sessionError.message);
    } else if (!session) {
        console.log("⚠️  No active session. Please login as admin first!");
        console.log("   Run this script AFTER logging in to the app.");
        return;
    } else {
        console.log("✅ User authenticated:", session.user.email);
    }

    // 2. Check user role
    const { data: roleData, error: roleError } = await supabase
        .rpc('get_user_role', { target_user_id: session.user.id });

    if (roleError) {
        console.log("❌ Role check failed:", roleError.message);
    } else {
        console.log("✅ User role:", roleData || "NONE");
    }

    // 3. Try to fetch leads
    console.log("\n--- Fetching Leads ---");
    const { data, error, count } = await supabase
        .from('interest_forms')
        .select('*', { count: 'exact' })
        .is('deleted_at', null);

    if (error) {
        console.log("❌ Query Error:", error.message);
        console.log("   Details:", error.details);
        console.log("   Hint:", error.hint);
    } else {
        console.log("✅ Query successful!");
        console.log("   Total non-deleted records:", count);
        console.log("   Records returned:", data?.length || 0);

        if (data && data.length > 0) {
            console.log("\n   Sample record:");
            console.log("   -", data[0].name, "-", data[0].email);
        }
    }

    // 4. Check for any records (including deleted)
    console.log("\n--- Checking All Records (including deleted) ---");
    const { data: allData, error: allError, count: allCount } = await supabase
        .from('interest_forms')
        .select('id, name, created_at, deleted_at', { count: 'exact' });

    if (!allError) {
        console.log("   Total records (all):", allCount);
        const deletedCount = allData?.filter(r => r.deleted_at !== null).length || 0;
        console.log("   Deleted records:", deletedCount);
        console.log("   Active records:", allCount - deletedCount);
    }
}

diagnose();
