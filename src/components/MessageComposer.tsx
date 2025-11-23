import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface MessageComposerProps {
  clientId: string;
  senderId: string;
  senderType: 'admin' | 'client';
  onMessageSent?: () => void;
}

const quickTemplates = [
  { label: 'Encouragement', value: 'Great progress! Keep up the excellent work! 🌟' },
  { label: 'Check-in', value: 'How are you feeling today? Any challenges I can help with?' },
  { label: 'Reminder', value: 'Don\'t forget to log your meals and water intake today! 💧' },
  { label: 'Congratulations', value: 'Congratulations on reaching your milestone! 🎉' },
];

export function MessageComposer({ clientId, senderId, senderType, onMessageSent }: MessageComposerProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;

    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert({
        client_id: clientId,
        sender_id: senderId,
        sender_type: senderType,
        message_type: 'manual',
        content: message.trim(),
        metadata: {},
        is_read: false,
      });

      if (error) throw error;

      setMessage('');
      toast({
        title: "Message sent",
        description: "Your message has been delivered.",
      });
      onMessageSent?.();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Failed to send",
        description: "Could not send your message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleTemplateSelect = (template: string) => {
    setMessage(template);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t bg-background p-4 space-y-3">
      {senderType === 'admin' && (
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <Select onValueChange={handleTemplateSelect}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Quick templates..." />
            </SelectTrigger>
            <SelectContent>
              {quickTemplates.map((template) => (
                <SelectItem key={template.label} value={template.value}>
                  {template.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="flex gap-2">
        <Textarea
          placeholder="Type your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-[80px] resize-none"
          disabled={sending}
        />
        <Button
          onClick={handleSend}
          disabled={!message.trim() || sending}
          size="icon"
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}
