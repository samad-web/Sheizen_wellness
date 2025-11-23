import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ChevronLeft, ChevronRight, FileText } from "lucide-react";

const assessmentSchema = z.object({
  // Step 1: Diet Recall
  breakfast: z.string().min(5, "Please describe your typical breakfast"),
  lunch: z.string().min(5, "Please describe your typical lunch"),
  dinner: z.string().min(5, "Please describe your typical dinner"),
  snacks: z.string().optional(),
  eatingPatterns: z.string().min(10, "Please describe your eating patterns"),
  
  // Step 2: Sleep Quality
  sleepHours: z.string().min(1, "Sleep hours required"),
  sleepSchedule: z.string().min(5, "Please describe your sleep schedule"),
  sleepQuality: z.enum(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]),
  
  // Step 3: Hydration
  dailyWater: z.string().min(1, "Water intake required"),
  beverageHabits: z.string().min(5, "Please describe beverage habits"),
  
  // Step 4: Physical Activity
  activityType: z.string().min(3, "Activity type required"),
  activityFrequency: z.string().min(1, "Frequency required"),
  activityDuration: z.string().min(1, "Duration required"),
  activityIntensity: z.enum(["low", "moderate", "high"]),
  
  // Step 5: Medical History
  medicalConditions: z.string().optional(),
  medications: z.string().optional(),
  supplements: z.string().optional(),
  allergies: z.string().optional(),
  
  // Step 6: Goals
  weightGoals: z.string().min(5, "Please describe your goals"),
  timeline: z.string().min(1, "Timeline required"),
  dietaryRestrictions: z.string().optional(),
});

type AssessmentFormData = z.infer<typeof assessmentSchema>;

interface HealthAssessmentFormProps {
  clientId: string;
  clientName: string;
  onComplete?: () => void;
}

const steps = [
  { title: "Diet Recall", description: "Your typical daily meals" },
  { title: "Sleep Quality", description: "Your sleep patterns" },
  { title: "Hydration", description: "Water and beverage intake" },
  { title: "Physical Activity", description: "Exercise and movement" },
  { title: "Medical History", description: "Health conditions and medications" },
  { title: "Goals & Preferences", description: "Your wellness objectives" },
];

export function HealthAssessmentForm({ clientId, clientName, onComplete }: HealthAssessmentFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  const form = useForm<AssessmentFormData>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      breakfast: "",
      lunch: "",
      dinner: "",
      snacks: "",
      eatingPatterns: "",
      sleepHours: "",
      sleepSchedule: "",
      sleepQuality: "5",
      dailyWater: "",
      beverageHabits: "",
      activityType: "",
      activityFrequency: "",
      activityDuration: "",
      activityIntensity: "moderate",
      medicalConditions: "",
      medications: "",
      supplements: "",
      allergies: "",
      weightGoals: "",
      timeline: "",
      dietaryRestrictions: "",
    },
  });

  const onSubmit = async (data: AssessmentFormData) => {
    setIsGenerating(true);
    try {
      // Call edge function to generate health assessment
      const { data: result, error } = await supabase.functions.invoke('generate-health-assessment', {
        body: {
          client_id: clientId,
          client_name: clientName,
          form_data: data,
        },
      });

      if (error) throw error;

      toast({
        title: "Assessment Generated",
        description: "Health assessment has been created successfully.",
      });

      onComplete?.();
    } catch (error: any) {
      console.error('Error generating assessment:', error);
      if (error.message?.includes('429')) {
        toast({
          title: "Rate Limit Reached",
          description: "AI service is busy. Please try again in a few minutes.",
          variant: "destructive",
        });
      } else if (error.message?.includes('402')) {
        toast({
          title: "Credits Depleted",
          description: "AI credits depleted. Please contact support.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Generation Failed",
          description: "Failed to generate assessment. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const nextStep = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep);
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getFieldsForStep = (step: number): (keyof AssessmentFormData)[] => {
    switch (step) {
      case 0: return ["breakfast", "lunch", "dinner", "snacks", "eatingPatterns"];
      case 1: return ["sleepHours", "sleepSchedule", "sleepQuality"];
      case 2: return ["dailyWater", "beverageHabits"];
      case 3: return ["activityType", "activityFrequency", "activityDuration", "activityIntensity"];
      case 4: return ["medicalConditions", "medications", "supplements", "allergies"];
      case 5: return ["weightGoals", "timeline", "dietaryRestrictions"];
      default: return [];
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Health Assessment for {clientName}
        </CardTitle>
        <CardDescription>
          Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}
        </CardDescription>
        <div className="flex gap-1 mt-4">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 flex-1 rounded-full transition-colors ${
                index <= currentStep ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Step 1: Diet Recall */}
            {currentStep === 0 && (
              <div className="space-y-4 animate-in fade-in-50 duration-300">
                <FormField
                  control={form.control}
                  name="breakfast"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Typical Breakfast</FormLabel>
                      <FormControl>
                        <Textarea placeholder="e.g., Oats with milk, banana, 2 eggs" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lunch"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Typical Lunch</FormLabel>
                      <FormControl>
                        <Textarea placeholder="e.g., Roti, dal, rice, salad" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dinner"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Typical Dinner</FormLabel>
                      <FormControl>
                        <Textarea placeholder="e.g., Grilled chicken, vegetables, quinoa" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="snacks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Snacks (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Fruits, nuts, protein bar" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="eatingPatterns"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Eating Patterns & Habits</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Meal timings, eating out frequency, portion sizes, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Step 2: Sleep Quality */}
            {currentStep === 1 && (
              <div className="space-y-4 animate-in fade-in-50 duration-300">
                <FormField
                  control={form.control}
                  name="sleepHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Average Sleep Hours</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 7" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sleepSchedule"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sleep Schedule</FormLabel>
                      <FormControl>
                        <Textarea placeholder="e.g., Sleep at 11 PM, wake at 6 AM" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sleepQuality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sleep Quality (1-10)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Rate your sleep quality" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[...Array(10)].map((_, i) => (
                            <SelectItem key={i + 1} value={`${i + 1}`}>
                              {i + 1} {i < 3 ? "- Poor" : i < 7 ? "- Fair" : "- Excellent"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Step 3: Hydration */}
            {currentStep === 2 && (
              <div className="space-y-4 animate-in fade-in-50 duration-300">
                <FormField
                  control={form.control}
                  name="dailyWater"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Daily Water Intake (ml)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 2000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="beverageHabits"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Other Beverage Habits</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Coffee, tea, soft drinks, alcohol consumption, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Step 4: Physical Activity */}
            {currentStep === 3 && (
              <div className="space-y-4 animate-in fade-in-50 duration-300">
                <FormField
                  control={form.control}
                  name="activityType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type of Activities</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Walking, gym, yoga, sports" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="activityFrequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frequency (times per week)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="activityDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (minutes per session)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 30" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="activityIntensity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Intensity Level</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low (light walking, stretching)</SelectItem>
                          <SelectItem value="moderate">Moderate (brisk walking, cycling)</SelectItem>
                          <SelectItem value="high">High (running, HIIT, sports)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Step 5: Medical History */}
            {currentStep === 4 && (
              <div className="space-y-4 animate-in fade-in-50 duration-300">
                <FormField
                  control={form.control}
                  name="medicalConditions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Medical Conditions (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Diabetes, hypertension, PCOS, thyroid, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="medications"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Medications (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="List any medications you're taking" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="supplements"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplements (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Vitamins, protein powder, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="allergies"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Food Allergies (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Nuts, dairy, gluten, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Step 6: Goals & Preferences */}
            {currentStep === 5 && (
              <div className="space-y-4 animate-in fade-in-50 duration-300">
                <FormField
                  control={form.control}
                  name="weightGoals"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight & Health Goals</FormLabel>
                      <FormControl>
                        <Textarea placeholder="e.g., Lose 10kg, improve energy, build muscle" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="timeline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Timeline</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 3 months, 100 days" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dietaryRestrictions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dietary Restrictions (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Vegetarian, vegan, religious restrictions, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0 || isGenerating}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>
              {currentStep < steps.length - 1 ? (
                <Button type="button" onClick={nextStep} disabled={isGenerating}>
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={isGenerating}>
                  {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isGenerating ? "Generating..." : "Generate Assessment"}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
