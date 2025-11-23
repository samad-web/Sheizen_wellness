import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SleepCardEditorProps {
  cardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
}

export function SleepCardEditor({
  cardId,
  open,
  onOpenChange,
  onSave,
}: SleepCardEditorProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [cardData, setCardData] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (open && cardId) {
      fetchCardData();
    }
  }, [open, cardId]);

  const fetchCardData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pending_review_cards')
        .select('*')
        .eq('id', cardId)
        .single();

      if (error) throw error;

      setCardData(data);
      setFormData(data.generated_content);
    } catch (error) {
      console.error('Error fetching card:', error);
      toast({
        title: "Error",
        description: "Failed to load sleep card",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('pending_review_cards')
        .update({
          generated_content: formData,
          status: 'edited',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', cardId);

      if (error) throw error;

      toast({
        title: "Saved",
        description: "Sleep card saved as draft",
      });

      onSave?.();
    } catch (error) {
      console.error('Error saving card:', error);
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    setSending(true);
    try {
      // First save current changes
      await handleSave();

      // Then send the card
      const { error } = await supabase.functions.invoke('send-card-to-client', {
        body: { card_id: cardId }
      });

      if (error) throw error;

      toast({
        title: "Sent",
        description: "Sleep card sent to client",
      });

      onOpenChange(false);
      onSave?.();
    } catch (error: any) {
      console.error('Error sending card:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send card",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const updateField = (path: string, value: any) => {
    setFormData((prev: any) => {
      const newData = { ...prev };
      const keys = path.split('.');
      let current = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  const sleepFrequencyLabels: Record<string, string> = {
    'not_during_past_month': 'Not during past month',
    'once_a_week': 'Once a week',
    'once_or_twice_a_week': 'Once or twice a week',
    'three_plus_times_a_week': '3+ times a week',
    'less_than_once_a_week': 'Less than once a week',
    'one_to_two_times_a_week': '1-2 times a week'
  };

  const sleepQualityLabels: Record<string, string> = {
    'very_good': 'Very Good',
    'fairly_good': 'Fairly Good',
    'fairly_bad': 'Fairly Bad',
    'very_bad': 'Very Bad'
  };

  const problemLevelLabels: Record<string, string> = {
    'no_problem': 'No problem at all',
    'slight_problem': 'Only a very slight problem',
    'somewhat_problem': 'Somewhat of a problem',
    'big_problem': 'A very big problem'
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Sleep Assessment Card</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          {/* Edit Form */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Client Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={formData.client_name || ''}
                    onChange={(e) => updateField('client_name', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sleep Quality Index (PSQI) Responses</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Usual Bedtime</Label>
                    <Input
                      value={formData.form_responses?.bedtime_usual || ''}
                      onChange={(e) => updateField('form_responses.bedtime_usual', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Usual Wake Time</Label>
                    <Input
                      value={formData.form_responses?.wake_time_usual || ''}
                      onChange={(e) => updateField('form_responses.wake_time_usual', e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Sleep Latency (minutes)</Label>
                    <Input
                      type="number"
                      value={formData.form_responses?.sleep_latency_minutes || ''}
                      onChange={(e) => updateField('form_responses.sleep_latency_minutes', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Actual Sleep Hours</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={formData.form_responses?.actual_sleep_hours || ''}
                      onChange={(e) => updateField('form_responses.actual_sleep_hours', parseFloat(e.target.value))}
                    />
                  </div>
                </div>

                <div>
                  <Label>Sleep Trouble Frequency</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {sleepFrequencyLabels[formData.form_responses?.sleep_trouble_frequency] || formData.form_responses?.sleep_trouble_frequency || 'Not specified'}
                  </p>
                </div>

                <div>
                  <Label>Sleep Medicine Frequency</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {sleepFrequencyLabels[formData.form_responses?.sleep_medicine_frequency] || formData.form_responses?.sleep_medicine_frequency || 'Not specified'}
                  </p>
                </div>

                <div>
                  <Label>Daytime Sleepiness Frequency</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {sleepFrequencyLabels[formData.form_responses?.daytime_sleepiness_frequency] || formData.form_responses?.daytime_sleepiness_frequency || 'Not specified'}
                  </p>
                </div>

                <div>
                  <Label>Enthusiasm Problem Level</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {problemLevelLabels[formData.form_responses?.enthusiasm_problem_level] || formData.form_responses?.enthusiasm_problem_level || 'Not specified'}
                  </p>
                </div>

                <div>
                  <Label>Overall Sleep Quality Rating</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {sleepQualityLabels[formData.form_responses?.overall_sleep_quality_rating] || formData.form_responses?.overall_sleep_quality_rating || 'Not specified'}
                  </p>
                </div>

                {formData.form_responses?.sleep_symptoms_observed && formData.form_responses.sleep_symptoms_observed.length > 0 && (
                  <div>
                    <Label>Sleep Symptoms Observed</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.form_responses.sleep_symptoms_observed.map((symptom: string, idx: number) => (
                        <span key={idx} className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                          {symptom}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">AI Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  rows={12}
                  value={formData.assessment_text || ''}
                  onChange={(e) => updateField('assessment_text', e.target.value)}
                  placeholder="Edit AI-generated sleep assessment..."
                />
              </CardContent>
            </Card>
          </div>

          {/* Preview */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold text-lg mb-4">
                    {formData.client_name}'s Sleep Assessment
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-3">Pittsburgh Sleep Quality Index (PSQI)</h4>
                      <div className="space-y-3 text-sm">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="font-medium">Usual Bedtime:</span>
                            <p className="text-muted-foreground">{formData.form_responses?.bedtime_usual || 'Not specified'}</p>
                          </div>
                          <div>
                            <span className="font-medium">Usual Wake Time:</span>
                            <p className="text-muted-foreground">{formData.form_responses?.wake_time_usual || 'Not specified'}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="font-medium">Time to Fall Asleep:</span>
                            <p className="text-muted-foreground">{formData.form_responses?.sleep_latency_minutes ? `${formData.form_responses.sleep_latency_minutes} minutes` : 'Not specified'}</p>
                          </div>
                          <div>
                            <span className="font-medium">Actual Sleep Hours:</span>
                            <p className="text-muted-foreground">{formData.form_responses?.actual_sleep_hours ? `${formData.form_responses.actual_sleep_hours} hours` : 'Not specified'}</p>
                          </div>
                        </div>

                        <div>
                          <span className="font-medium">Sleep Trouble Frequency:</span>
                          <p className="text-muted-foreground">{sleepFrequencyLabels[formData.form_responses?.sleep_trouble_frequency] || 'Not specified'}</p>
                        </div>

                        <div>
                          <span className="font-medium">Sleep Medicine Use:</span>
                          <p className="text-muted-foreground">{sleepFrequencyLabels[formData.form_responses?.sleep_medicine_frequency] || 'Not specified'}</p>
                        </div>

                        <div>
                          <span className="font-medium">Daytime Sleepiness:</span>
                          <p className="text-muted-foreground">{sleepFrequencyLabels[formData.form_responses?.daytime_sleepiness_frequency] || 'Not specified'}</p>
                        </div>

                        <div>
                          <span className="font-medium">Enthusiasm Level:</span>
                          <p className="text-muted-foreground">{problemLevelLabels[formData.form_responses?.enthusiasm_problem_level] || 'Not specified'}</p>
                        </div>

                        <div>
                          <span className="font-medium">Overall Sleep Quality:</span>
                          <p className="text-muted-foreground">{sleepQualityLabels[formData.form_responses?.overall_sleep_quality_rating] || 'Not specified'}</p>
                        </div>

                        {formData.form_responses?.sleep_symptoms_observed && formData.form_responses.sleep_symptoms_observed.length > 0 && (
                          <div>
                            <span className="font-medium">Observed Symptoms:</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {formData.form_responses.sleep_symptoms_observed.map((symptom: string, idx: number) => (
                                <span key={idx} className="px-2 py-1 bg-secondary/50 rounded text-xs">
                                  {symptom}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Professional Sleep Assessment</h4>
                      <div className="text-sm whitespace-pre-wrap prose prose-sm max-w-none">
                        {formData.assessment_text}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="outline" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Send className="mr-2 h-4 w-4" />
            Save & Send to Client
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}