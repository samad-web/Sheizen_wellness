import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Brain } from "lucide-react";

interface StressAssessmentFormProps {
  clientId: string;
  clientName: string;
  onComplete?: () => void;
}

export const StressAssessmentForm = ({ clientId, clientName, onComplete }: StressAssessmentFormProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({
    workStressLevel: 5,
    sleepQuality: 5,
    stressTriggers: "",
    copingMechanisms: "",
    physicalSymptoms: "",
  });

  const handleGenerate = async () => {
    if (!formData.stressTriggers.trim() || !formData.copingMechanisms.trim()) {
      toast.error("Please answer all required questions");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-stress-assessment', {
        body: {
          client_id: clientId,
          client_name: clientName,
          form_data: formData,
        },
      });

      if (error) throw error;

      toast.success("Stress assessment generated successfully!");
      onComplete?.();
    } catch (error) {
      console.error('Error generating stress assessment:', error);
      toast.error("Failed to generate stress assessment");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Stress Assessment</h3>
      </div>

      <div className="space-y-4">
        <div>
          <Label>Work Stress Level (1-10)</Label>
          <div className="flex items-center gap-4 mt-2">
            <Slider
              value={[formData.workStressLevel]}
              onValueChange={(value) => setFormData({ ...formData, workStressLevel: value[0] })}
              max={10}
              min={1}
              step={1}
              className="flex-1"
            />
            <span className="text-sm font-medium w-8">{formData.workStressLevel}</span>
          </div>
        </div>

        <div>
          <Label>Sleep Quality Due to Stress (1-10)</Label>
          <div className="flex items-center gap-4 mt-2">
            <Slider
              value={[formData.sleepQuality]}
              onValueChange={(value) => setFormData({ ...formData, sleepQuality: value[0] })}
              max={10}
              min={1}
              step={1}
              className="flex-1"
            />
            <span className="text-sm font-medium w-8">{formData.sleepQuality}</span>
          </div>
        </div>

        <div>
          <Label htmlFor="triggers">Main Stress Triggers *</Label>
          <Textarea
            id="triggers"
            placeholder="What situations, people, or activities cause you the most stress?"
            value={formData.stressTriggers}
            onChange={(e) => setFormData({ ...formData, stressTriggers: e.target.value })}
            rows={3}
            className="mt-2"
          />
        </div>

        <div>
          <Label htmlFor="coping">Current Coping Mechanisms *</Label>
          <Textarea
            id="coping"
            placeholder="How do you currently manage or cope with stress?"
            value={formData.copingMechanisms}
            onChange={(e) => setFormData({ ...formData, copingMechanisms: e.target.value })}
            rows={3}
            className="mt-2"
          />
        </div>

        <div>
          <Label htmlFor="symptoms">Physical Symptoms (Optional)</Label>
          <Textarea
            id="symptoms"
            placeholder="Do you experience headaches, fatigue, muscle tension, etc.?"
            value={formData.physicalSymptoms}
            onChange={(e) => setFormData({ ...formData, physicalSymptoms: e.target.value })}
            rows={3}
            className="mt-2"
          />
        </div>
      </div>

      <Button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating Assessment...
          </>
        ) : (
          <>
            <Brain className="mr-2 h-4 w-4" />
            Generate Stress Assessment
          </>
        )}
      </Button>
    </Card>
  );
};
