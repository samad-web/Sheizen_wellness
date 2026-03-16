
import { supabase } from "./src/integrations/supabase/client";

async function checkTable() {
  try {
    const { data, error } = await supabase
      .from('client_measurements')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error("Table error:", error);
    } else {
      console.log("Table exists, data:", data);
    }
  } catch (err) {
    console.error("Catch error:", err);
  }
}

checkTable();
