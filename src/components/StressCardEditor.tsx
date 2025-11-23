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

interface StressCardEditorProps {
  cardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
}

export function StressCardEditor({
  cardId,
  open,
  onOpenChange,
  onSave,
}: StressCardEditorProps) {
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
        description: "Failed to load stress card",
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
        description: "Stress card saved as draft",
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
        description: "Stress card sent to client",
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
          <DialogTitle>Edit Stress Assessment Card</DialogTitle>
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
                    <Label>Work Stress Level</Label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      value={formData.form_responses?.workStressLevel || ''}
                      onChange={(e) => updateField('form_responses.workStressLevel', parseInt(e.target.value))}
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
                </div>
                <div>
                  <Label>Stress Triggers</Label>
                  <Textarea
                    value={formData.form_responses?.stressTriggers || ''}
                    onChange={(e) => updateField('form_responses.stressTriggers', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Coping Mechanisms</Label>
                  <Textarea
                    value={formData.form_responses?.copingMechanisms || ''}
                    onChange={(e) => updateField('form_responses.copingMechanisms', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Physical Symptoms</Label>
                  <Textarea
                    value={formData.form_responses?.physicalSymptoms || ''}
                    onChange={(e) => updateField('form_responses.physicalSymptoms', e.target.value)}
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
                  placeholder="Edit AI-generated stress assessment..."
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
                    {formData.client_name}'s Stress Assessment
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Assessment Summary</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        <div>Work Stress: {formData.form_responses?.workStressLevel}/10</div>
                        <div>Sleep Quality: {formData.form_responses?.sleepQuality}/10</div>
                      </div>
                      <div className="text-sm space-y-2">
                        <div>
                          <span className="font-medium">Triggers:</span> {formData.form_responses?.stressTriggers}
                        </div>
                        <div>
                          <span className="font-medium">Coping:</span> {formData.form_responses?.copingMechanisms}
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