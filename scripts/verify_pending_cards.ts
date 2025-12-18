
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from .env file
config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Try to get service role key from env, but since it might not be in .env, we log a warning if missing.
// Note: In local dev, we might not have the service key in the .env file if it was not added manually.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
    console.error("Missing VITE_SUPABASE_URL in .env");
    process.exit(1);
}

if (!supabaseKey) {
    console.warn("WARNING: Missing SUPABASE_SERVICE_ROLE_KEY. Access might be restricted by RLS if using anon key.");
    console.warn("If you are an admin, this might still work if you had a session, but as a script it will fail RLS policies that require auth.uid() = admin");
}

const keyToUse = supabaseKey || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, keyToUse);

async function checkPendingCards() {
    console.log("Checking pending_review_cards table...");
    console.log("Using URL:", supabaseUrl);

    const { data, error } = await supabase
        .from('pending_review_cards')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error("Error fetching cards:", error);
        return;
    }

    console.log(`Found ${data.length} recent cards:`);
    data.forEach(card => {
        console.log(`- ID: ${card.id}, Type: ${card.card_type}, Status: ${card.status}, Client: ${card.client_id}`);
    });
}

checkPendingCards();
