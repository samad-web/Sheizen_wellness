
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ljxgaycjomnyfihdsgke.supabase.co";
const SUPABASE_KEY = "sb_publishable_aigLL4D3NGCWwNQrbHPxNw_gIGhVVVT";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testInsert() {
    console.log("Attempting insert into assessments...");

    // 1. Try to get a valid client ID
    const { data: clients, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .limit(1);

    let clientId = "00000000-0000-0000-0000-000000000000";
    if (clients && clients.length > 0) {
        clientId = clients[0].id;
        console.log("Using existing client ID:", clientId);
    } else {
        console.log("No clients found/accessible (RLS likely blocking public select), using dummy ID.");
        if (clientError) console.error("Client fetch error:", clientError);
    }

    // 2. Insert
    const { data, error } = await supabase
        .from('assessments')
        .insert({
            client_id: clientId,
            assessment_type: "custom",
            display_name: "Debug Insert Test",
            form_responses: { test: "data" },
            status: "completed",
            notes: "Debug notes"
        })
        .select();

    if (error) {
        console.error("Insert FAILED:", error);
    } else {
        console.log("Insert SUCCEEDED:", data);
    }
}

testInsert();
