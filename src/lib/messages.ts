import { supabase } from "@/integrations/supabase/client";

export interface Message {
  id: string;
  client_id: string;
  sender_id: string | null;
  sender_type: 'system' | 'admin' | 'client';
  message_type: string;
  content: string;
  metadata: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

export const fillTemplate = (template: string, variables: Record<string, any>): string => {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }
  return result;
};

export const sendAutomatedMessage = async (
  clientId: string,
  templateName: string,
  variables: Record<string, any>
): Promise<void> => {
  try {
    const { error } = await supabase.functions.invoke('send-automated-message', {
      body: {
        client_id: clientId,
        template_name: templateName,
        variables,
      },
    });

    if (error) {
      console.error('Error sending automated message:', error);
    }
  } catch (error) {
    console.error('Error invoking send-automated-message function:', error);
  }
};

export const getUnreadCount = async (clientId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('is_read', false);

    if (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getUnreadCount:', error);
    return 0;
  }
};

export const markMessagesAsRead = async (clientId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('client_id', clientId)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking messages as read:', error);
    }
  } catch (error) {
    console.error('Error in markMessagesAsRead:', error);
  }
};
