import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const eventSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
  eventType: z.string().min(1, "Event type is required"),
  time: z.string().optional(),
  duration: z.coerce.number().min(5).max(480).optional(),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
});

type EventFormData = z.infer<typeof eventSchema>;

interface EventScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  clientId: string;
  onEventCreated?: () => void;
}

export function EventScheduleDialog({ open, onOpenChange, date, clientId, onEventCreated }: EventScheduleDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      eventType: "",
      time: "",
      duration: undefined,
      description: "",
    },
  });

  const onSubmit = async (data: EventFormData) => {
    setIsSubmitting(true);
    try {
      const metadata: any = {};
      if (data.time) metadata.time = data.time;
      if (data.duration) metadata.duration = data.duration;
      metadata.meeting_type = data.eventType;

      const { error } = await supabase
        .from('calendar_events')
        .insert({
          client_id: clientId,
          event_date: format(date, 'yyyy-MM-dd'),
          event_type: 'custom',
          title: data.title,
          description: data.description || null,
          metadata: Object.keys(metadata).length > 0 ? metadata : null,
        });

      if (error) throw error;

      toast.success("Meeting scheduled successfully!");
      form.reset();
      onOpenChange(false);
      onEventCreated?.();
    } catch (error: any) {
      console.error('Error scheduling meeting:', error);
      toast.error(error.message || "Failed to schedule meeting");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Schedule Meeting</DialogTitle>
          <DialogDescription>
            Create a new meeting or event for {format(date, 'MMMM d, yyyy')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Weekly Check-in Call" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="eventType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select event type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="consultation">Consultation</SelectItem>
                      <SelectItem value="follow_up">Follow-up Call</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="appointment">Appointment</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (min)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="30" min={5} max={480} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional details about this meeting..." 
                      className="resize-none"
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Schedule Meeting
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
