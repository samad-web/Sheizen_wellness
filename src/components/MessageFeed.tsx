import { useEffect, useRef, useState } from "react";
import * as React from "react";
import { format, isToday, isYesterday } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Bot, User, Download, ExternalLink } from "lucide-react";
import type { Message } from "@/lib/messages";
import { getSignedUrl } from "@/lib/storage";
import { formatFileSize, isImageFile, getFileIcon } from "@/lib/fileUtils";
import { toast } from "@/hooks/use-toast";

interface MessageFeedProps {
  messages: Message[];
  currentUserType: 'admin' | 'client';
  onStartAssessment?: (requestId: string, type: string) => void;
}

export function MessageFeed({ messages, currentUserType, onStartAssessment }: MessageFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Load signed URLs for attachments
  useEffect(() => {
    const loadSignedUrls = async () => {
      const attachments = messages
        .filter(m => m.attachment_url)
        .map(m => m.attachment_url as string);

      if (attachments.length === 0) return;

      const urls: Record<string, string> = {};
      await Promise.all(
        attachments.map(async (path) => {
          try {
            const url = await getSignedUrl('message-attachments', path);
            urls[path] = url;
          } catch (error) {
            console.error('Error loading signed URL:', error);
          }
        })
      );

      setSignedUrls(urls);
    };

    loadSignedUrls();
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

  const handleDownload = async (attachmentUrl: string, attachmentName: string) => {
    try {
      const url = signedUrls[attachmentUrl];
      if (!url) {
        toast({
          title: "Download failed",
          description: "File URL not found",
          variant: "destructive",
        });
        return;
      }
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Download failed",
        description: "Could not download the file",
        variant: "destructive",
      });
    }
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

                      {/* Assessment Request Action Button */}
                      {message.message_type === 'assessment_request' && onStartAssessment && currentUserType === 'client' && (
                        <div className="mt-3">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              const requestId = message.metadata?.request_id;
                              const assessmentType = message.metadata?.assessment_type;
                              if (requestId && assessmentType) {
                                onStartAssessment(requestId, assessmentType);
                              }
                            }}
                            className="w-full"
                          >
                            <ExternalLink className="mr-2 h-3 w-3" />
                            Complete Assessment
                          </Button>
                        </div>
                      )}

                      {/* File Attachment Display */}
                      {message.attachment_url && (
                        <div className="mt-3 p-3 bg-background/50 rounded-lg border">
                          <div className="flex items-center gap-2 mb-2">
                            {React.createElement(getFileIcon(message.attachment_type || ''), { 
                              className: "h-4 w-4 text-muted-foreground shrink-0" 
                            })}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {message.attachment_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {message.attachment_size ? formatFileSize(message.attachment_size) : 'Unknown size'}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(message.attachment_url!, message.attachment_name!)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Inline preview for images */}
                          {message.attachment_type && isImageFile(message.attachment_type) && signedUrls[message.attachment_url] && (
                            <img
                              src={signedUrls[message.attachment_url]}
                              alt={message.attachment_name || "Attachment"}
                              className="mt-2 rounded max-h-48 object-cover w-full"
                            />
                          )}
                        </div>
                      )}
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
