
import { supabase } from "./src/integrations/supabase/client";

async function checkMessages() {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .limit(10);
    
    if (error) {
      console.error("Messages error:", error);
    } else {
      console.log("Messages data:", data);
      
      // Also check unread count logic
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .neq('sender_type', 'client');
      
      console.log("Unread messages count (any client):", count);
    }
  } catch (err) {
    console.error("Catch error:", err);
  }
}

checkMessages();
