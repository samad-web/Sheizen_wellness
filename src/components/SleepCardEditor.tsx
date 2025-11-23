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
                <CardTitle className="text-lg">Form Responses</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Sleep Hours</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={formData.form_responses?.sleepHours || ''}
                      onChange={(e) => updateField('form_responses.sleepHours', parseFloat(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Sleep Quality</Label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      value={formData.form_responses?.sleepQuality || ''}
                      onChange={(e) => updateField('form_responses.sleepQuality', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Bedtime</Label>
                    <Input
                      value={formData.form_responses?.sleepTime || ''}
                      onChange={(e) => updateField('form_responses.sleepTime', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Wake Time</Label>
                    <Input
                      value={formData.form_responses?.wakeTime || ''}
                      onChange={(e) => updateField('form_responses.wakeTime', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Energy Levels</Label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      value={formData.form_responses?.energyLevels || ''}
                      onChange={(e) => updateField('form_responses.energyLevels', parseInt(e.target.value))}
                    />
                  </div>
                </div>
                <div>
                  <Label>Pre-Bed Routine</Label>
                  <Textarea
                    value={formData.form_responses?.preBedRoutine || ''}
                    onChange={(e) => updateField('form_responses.preBedRoutine', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Screen Time Before Sleep</Label>
                  <Input
                    value={formData.form_responses?.screenTime || ''}
                    onChange={(e) => updateField('form_responses.screenTime', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Sleep Disruptions</Label>
                  <Textarea
                    value={formData.form_responses?.sleepDisruptions || ''}
                    onChange={(e) => updateField('form_responses.sleepDisruptions', e.target.value)}
                  />
                </div>
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
                      <h4 className="font-medium mb-2">Sleep Pattern Summary</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        <div>Sleep Hours: {formData.form_responses?.sleepHours} hrs</div>
                        <div>Sleep Quality: {formData.form_responses?.sleepQuality}/10</div>
                        <div>Bedtime: {formData.form_responses?.sleepTime}</div>
                        <div>Wake Time: {formData.form_responses?.wakeTime}</div>
                        <div>Energy Levels: {formData.form_responses?.energyLevels}/10</div>
                      </div>
                      <div className="text-sm space-y-2">
                        <div>
                          <span className="font-medium">Routine:</span> {formData.form_responses?.preBedRoutine}
                        </div>
                        <div>
                          <span className="font-medium">Screen Time:</span> {formData.form_responses?.screenTime}
                        </div>
                        <div>
                          <span className="font-medium">Disruptions:</span> {formData.form_responses?.sleepDisruptions}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Professional Analysis</h4>
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