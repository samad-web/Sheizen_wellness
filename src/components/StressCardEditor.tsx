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

  const pssLabels0to4 = ['Never', 'Almost Never', 'Sometimes', 'Fairly Often', 'Very Often'];
  const pssLabels1to5 = ['Never', 'Rarely', 'Sometimes', 'Often', 'Very Often'];

  const pssQuestions = [
    { key: 'pss_q1_upset_unexpectedly', text: 'How often have you been upset because of something that happened unexpectedly?', scale: '0-4' },
    { key: 'pss_q2_unable_to_control', text: 'How often have you felt that you were unable to control the important things in your life?', scale: '0-4' },
    { key: 'pss_q3_nervous_stressed', text: 'How often have you felt nervous and stressed?', scale: '1-5' },
    { key: 'pss_q4_confident_handling_problems', text: 'How often have you felt confident about your ability to handle your personal problems?', scale: '1-5' },
    { key: 'pss_q5_things_going_your_way', text: 'How often have you felt that things were going your way?', scale: '1-5' },
    { key: 'pss_q6_could_not_cope', text: 'How often have you found that you could not cope with all the things that you had to do?', scale: '1-5' },
    { key: 'pss_q7_control_irritations', text: 'How often have you been able to control irritations in your life?', scale: '1-5' },
    { key: 'pss_q8_on_top_of_things', text: 'How often have you felt that you were on top of things?', scale: '1-5' },
    { key: 'pss_q9_angered_outside_control', text: 'How often have you been angered because of things that were outside of your control?', scale: '1-5' },
    { key: 'pss_q10_difficulties_piling_up', text: 'How often have you felt difficulties were piling up so high that you could not overcome them?', scale: '1-5' }
  ];

  const calculatePSSScore = () => {
    const responses = formData.form_responses || {};
    let total = 0;
    
    // Questions with 0-4 scale
    total += parseInt(responses.pss_q1_upset_unexpectedly || '0');
    total += parseInt(responses.pss_q2_unable_to_control || '0');
    
    // Questions with 1-5 scale (convert to 0-4)
    total += Math.max(0, parseInt(responses.pss_q3_nervous_stressed || '1') - 1);
    total += Math.max(0, parseInt(responses.pss_q4_confident_handling_problems || '1') - 1);
    total += Math.max(0, parseInt(responses.pss_q5_things_going_your_way || '1') - 1);
    total += Math.max(0, parseInt(responses.pss_q6_could_not_cope || '1') - 1);
    total += Math.max(0, parseInt(responses.pss_q7_control_irritations || '1') - 1);
    total += Math.max(0, parseInt(responses.pss_q8_on_top_of_things || '1') - 1);
    total += Math.max(0, parseInt(responses.pss_q9_angered_outside_control || '1') - 1);
    total += Math.max(0, parseInt(responses.pss_q10_difficulties_piling_up || '1') - 1);
    
    return total;
  };

  const interpretPSSScore = (score: number) => {
    if (score <= 13) return 'Low stress';
    if (score <= 26) return 'Moderate stress';
    return 'High stress';
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
                <CardTitle className="text-lg">Perceived Stress Scale (PSS-10) Responses</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Total PSS Score: <span className="font-semibold">{calculatePSSScore()}</span> ({interpretPSSScore(calculatePSSScore())})
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {pssQuestions.map((q, idx) => {
                  const value = formData.form_responses?.[q.key];
                  const labels = q.scale === '0-4' ? pssLabels0to4 : pssLabels1to5;
                  const labelText = value ? labels[parseInt(value) - (q.scale === '1-5' ? 1 : 0)] : 'Not answered';
                  
                  return (
                    <div key={q.key} className="border-b pb-3 last:border-0">
                      <Label className="text-sm font-medium">
                        Q{idx + 1}. {q.text}
                      </Label>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-sm font-semibold text-primary">
                          Score: {value || 'N/A'}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          ({labelText})
                        </span>
                      </div>
                    </div>
                  );
                })}
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
                      <h4 className="font-medium mb-3">Perceived Stress Scale (PSS-10) Results</h4>
                      <div className="bg-secondary/30 p-3 rounded-md mb-3">
                        <p className="text-sm">
                          <span className="font-semibold">Total PSS Score:</span> {calculatePSSScore()} / 40
                        </p>
                        <p className="text-sm mt-1">
                          <span className="font-semibold">Interpretation:</span> {interpretPSSScore(calculatePSSScore())}
                        </p>
                      </div>
                      
                      <div className="space-y-3 text-sm">
                        {pssQuestions.map((q, idx) => {
                          const value = formData.form_responses?.[q.key];
                          const labels = q.scale === '0-4' ? pssLabels0to4 : pssLabels1to5;
                          const labelText = value ? labels[parseInt(value) - (q.scale === '1-5' ? 1 : 0)] : 'Not answered';
                          
                          return (
                            <div key={q.key} className="border-l-2 border-primary/20 pl-3">
                              <p className="font-medium">Q{idx + 1}. {q.text}</p>
                              <p className="text-muted-foreground mt-1">
                                Score: <span className="font-semibold">{value || 'N/A'}</span> - {labelText}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Professional Stress Assessment</h4>
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