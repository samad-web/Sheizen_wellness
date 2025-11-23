import { useEffect, useRef } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, User } from "lucide-react";
import type { Message } from "@/lib/messages";

interface MessageFeedProps {
  messages: Message[];
  currentUserType: 'admin' | 'client';
}

export function MessageFeed({ messages, currentUserType }: MessageFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: Record<string, Message[]> = {};

    messages.forEach((message) => {
      const date = new Date(message.created_at);
      let dateKey: string;

      if (isToday(date)) {
        dateKey = 'Today';
      } else if (isYesterday(date)) {
        dateKey = 'Yesterday';
      } else {
        dateKey = format(date, 'MMM d, yyyy');
      }

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });

    return groups;
  };

  const groupedMessages = groupMessagesByDate(messages);

  return (
    <ScrollArea className="flex-1 p-4" ref={scrollRef}>
      <div className="space-y-6">
        {Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <div key={date} className="space-y-4">
            <div className="flex items-center justify-center">
              <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                {date}
              </span>
            </div>
            {dateMessages.map((message) => {
              const isSystem = message.sender_type === 'system';
              const isCurrentUser = message.sender_type === currentUserType;

              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className={isSystem ? 'bg-primary/10' : 'bg-secondary'}>
                      {isSystem ? <Bot className="h-4 w-4 text-primary" /> : <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`flex flex-col gap-1 max-w-[70%] ${isCurrentUser ? 'items-end' : ''}`}>
                    <div
                      className={`rounded-2xl px-4 py-2 ${
                        isSystem
                          ? 'bg-primary/5 border border-primary/20'
                          : isCurrentUser
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    </div>
                    <span className="text-xs text-muted-foreground px-2">
                      {format(new Date(message.created_at), 'h:mm a')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
