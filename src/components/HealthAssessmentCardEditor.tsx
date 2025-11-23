import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, Send, FileText, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface HealthAssessmentCardEditorProps {
  cardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
}

export function HealthAssessmentCardEditor({
  cardId,
  open,
  onOpenChange,
  onSave,
}: HealthAssessmentCardEditorProps) {
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
        description: "Failed to load health assessment card",
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
        description: "Health assessment card saved as draft",
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
        description: "Health assessment card sent to client",
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
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-center py-12">
            <Activity className="h-8 w-8 animate-spin text-wellness-green" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="px-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-wellness-green/20 to-wellness-mint/20 rounded-lg">
              <FileText className="h-5 w-5 text-wellness-green" />
            </div>
            <div>
              <DialogTitle>Review Health Assessment Card</DialogTitle>
              <DialogDescription>Review and edit AI-generated health assessment</DialogDescription>
            </div>
            <Badge variant="outline" className="ml-auto">Draft</Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="grid grid-cols-2 gap-6 pb-6">
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
                    value={formData.client_details?.name || ''}
                    onChange={(e) => updateField('client_details.name', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Age</Label>
                    <Input
                      type="number"
                      value={formData.client_details?.age || ''}
                      onChange={(e) => updateField('client_details.age', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Gender</Label>
                    <Input
                      value={formData.client_details?.gender || ''}
                      onChange={(e) => updateField('client_details.gender', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Key Findings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Height (cm)</Label>
                    <Input
                      type="number"
                      value={formData.key_findings?.height || ''}
                      onChange={(e) => updateField('key_findings.height', parseFloat(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Weight (kg)</Label>
                    <Input
                      type="number"
                      value={formData.key_findings?.weight || ''}
                      onChange={(e) => updateField('key_findings.weight', parseFloat(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>BMI</Label>
                    <Input
                      type="number"
                      value={formData.key_findings?.bmi || ''}
                      onChange={(e) => updateField('key_findings.bmi', parseFloat(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>BMR (kcal)</Label>
                    <Input
                      type="number"
                      value={formData.key_findings?.bmr || ''}
                      onChange={(e) => updateField('key_findings.bmr', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Ideal Weight (kg)</Label>
                    <Input
                      type="number"
                      value={formData.key_findings?.ideal_weight || ''}
                      onChange={(e) => updateField('key_findings.ideal_weight', parseFloat(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Calorie Intake (kcal)</Label>
                    <Input
                      type="number"
                      value={formData.key_findings?.calorie_intake || ''}
                      onChange={(e) => updateField('key_findings.calorie_intake', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Protein Intake (g)</Label>
                    <Input
                      type="number"
                      value={formData.key_findings?.protein_intake || ''}
                      onChange={(e) => updateField('key_findings.protein_intake', parseFloat(e.target.value))}
                    />
                  </div>
                </div>
                <div>
                  <Label>Medical Condition</Label>
                  <Textarea
                    value={formData.key_findings?.medical_condition || ''}
                    onChange={(e) => updateField('key_findings.medical_condition', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">AI Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  rows={8}
                  value={formData.ai_analysis || ''}
                  onChange={(e) => updateField('ai_analysis', e.target.value)}
                  placeholder="Edit AI-generated analysis..."
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
                  <h3 className="font-semibold text-lg mb-2">
                    {formData.client_details?.name}'s Health Assessment
                  </h3>
                  <div className="text-sm text-muted-foreground mb-4">
                    Age: {formData.client_details?.age} | Gender: {formData.client_details?.gender}
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium mb-2">Key Findings</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>Height: {formData.key_findings?.height} cm</div>
                        <div>Weight: {formData.key_findings?.weight} kg</div>
                        <div>BMI: {formData.key_findings?.bmi}</div>
                        <div>BMR: {formData.key_findings?.bmr} kcal</div>
                        <div>Ideal Weight: {formData.key_findings?.ideal_weight} kg</div>
                        <div>Target Calories: {formData.key_findings?.calorie_intake} kcal</div>
                        <div>Protein: {formData.key_findings?.protein_intake} g/day</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Analysis</h4>
                      <p className="text-sm whitespace-pre-wrap">{formData.ai_analysis}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 px-6 py-4 border-t bg-muted/30">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="outline" onClick={handleSave} disabled={saving} className="group">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" />
            Save Draft
          </Button>
          <Button onClick={handleSend} disabled={sending} className="bg-wellness-green hover:bg-wellness-green/90 group">
            {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Send className="mr-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            Save & Send to Client
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
