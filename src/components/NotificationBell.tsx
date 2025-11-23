import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, addDays } from "date-fns";

interface NotificationBellProps {
  clientId: string;
  onNavigate: (date: Date) => void;
}

export function NotificationBell({ clientId, onNavigate }: NotificationBellProps) {
  const [upcomingMeetings, setUpcomingMeetings] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadUpcomingMeetings();

    // Real-time subscription for new events
    const channel = supabase
      .channel('calendar-events-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'calendar_events',
        filter: `client_id=eq.${clientId}`
      }, () => {
        loadUpcomingMeetings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId]);

  const loadUpcomingMeetings = async () => {
    const today = new Date();
    const nextMonth = addDays(today, 30);

    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('client_id', clientId)
      .gte('event_date', format(today, 'yyyy-MM-dd'))
      .lte('event_date', format(nextMonth, 'yyyy-MM-dd'))
      .order('event_date', { ascending: true });

    if (!error && data) {
      setUpcomingMeetings(data);
    }
  };

  const handleMeetingClick = (meeting: any) => {
    onNavigate(parseISO(meeting.event_date));
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {upcomingMeetings.length > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              variant="destructive"
            >
              {upcomingMeetings.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Upcoming Meetings</h4>
          {upcomingMeetings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming meetings</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {upcomingMeetings.map((meeting) => (
                <button
                  key={meeting.id}
                  onClick={() => handleMeetingClick(meeting)}
                  className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="font-medium text-sm">{meeting.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {format(parseISO(meeting.event_date), 'MMM d, yyyy')}
                    {meeting.metadata?.time && ` at ${meeting.metadata.time}`}
                  </div>
                  {meeting.metadata?.meeting_type && (
                    <Badge variant="secondary" className="mt-2 text-xs">
                      {meeting.metadata.meeting_type}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}