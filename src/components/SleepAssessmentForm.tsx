import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Moon } from "lucide-react";

interface SleepAssessmentFormProps {
  clientId: string;
  clientName: string;
  onComplete?: () => void;
}

export const SleepAssessmentForm = ({ clientId, clientName, onComplete }: SleepAssessmentFormProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({
    sleepHours: "",
    sleepTime: "",
    wakeTime: "",
    sleepQuality: 5,
    preBedRoutine: "",
    screenTime: "",
    sleepDisruptions: "",
    energyLevels: 5,
  });

  const handleGenerate = async () => {
    if (!formData.sleepHours || !formData.sleepTime || !formData.wakeTime || !formData.preBedRoutine.trim()) {
      toast.error("Please answer all required questions");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-sleep-assessment', {
        body: {
          client_id: clientId,
          client_name: clientName,
          form_data: formData,
        },
      });

      if (error) throw error;

      toast.success("Sleep assessment generated successfully!");
      onComplete?.();
    } catch (error) {
      console.error('Error generating sleep assessment:', error);
      toast.error("Failed to generate sleep assessment");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Moon className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Sleep Assessment</h3>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="sleepHours">Average Sleep Hours *</Label>
          <Input
            id="sleepHours"
            type="number"
            placeholder="e.g., 6.5"
            value={formData.sleepHours}
            onChange={(e) => setFormData({ ...formData, sleepHours: e.target.value })}
            step="0.5"
            min="0"
            max="24"
            className="mt-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="sleepTime">Usual Bedtime *</Label>
            <Input
              id="sleepTime"
              type="time"
              value={formData.sleepTime}
              onChange={(e) => setFormData({ ...formData, sleepTime: e.target.value })}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="wakeTime">Usual Wake Time *</Label>
            <Input
              id="wakeTime"
              type="time"
              value={formData.wakeTime}
              onChange={(e) => setFormData({ ...formData, wakeTime: e.target.value })}
              className="mt-2"
            />
          </div>
        </div>

        <div>
          <Label>Sleep Quality (1-10)</Label>
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
          <Label htmlFor="routine">Pre-Bed Routine *</Label>
          <Textarea
            id="routine"
            placeholder="What do you typically do before going to bed?"
            value={formData.preBedRoutine}
            onChange={(e) => setFormData({ ...formData, preBedRoutine: e.target.value })}
            rows={3}
            className="mt-2"
          />
        </div>

        <div>
          <Label htmlFor="screenTime">Screen Time Before Sleep (Optional)</Label>
          <Input
            id="screenTime"
            placeholder="e.g., 2 hours on phone"
            value={formData.screenTime}
            onChange={(e) => setFormData({ ...formData, screenTime: e.target.value })}
            className="mt-2"
          />
        </div>

        <div>
          <Label htmlFor="disruptions">Sleep Disruptions (Optional)</Label>
          <Textarea
            id="disruptions"
            placeholder="Do you wake up frequently? Any issues staying asleep?"
            value={formData.sleepDisruptions}
            onChange={(e) => setFormData({ ...formData, sleepDisruptions: e.target.value })}
            rows={3}
            className="mt-2"
          />
        </div>

        <div>
          <Label>Daytime Energy Levels (1-10)</Label>
          <div className="flex items-center gap-4 mt-2">
            <Slider
              value={[formData.energyLevels]}
              onValueChange={(value) => setFormData({ ...formData, energyLevels: value[0] })}
              max={10}
              min={1}
              step={1}
              className="flex-1"
            />
            <span className="text-sm font-medium w-8">{formData.energyLevels}</span>
          </div>
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
            <Moon className="mr-2 h-4 w-4" />
            Generate Sleep Assessment
          </>
        )}
      </Button>
    </Card>
  );
};
