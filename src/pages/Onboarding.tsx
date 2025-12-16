import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { z } from "zod";
import { Leaf, ArrowRight } from "lucide-react";

const onboardingSchema = z.object({
  age: z.number().min(10).max(120),
  gender: z.enum(["male", "female", "other"]),
  goals: z.string().min(10).max(1000),
  programType: z.enum(["weight_loss", "weight_gain", "maintenance", "muscle_building", "general_wellness"]),
});

export default function Onboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // URL param only for admins
  const urlClientId = searchParams.get("clientId");
  const [targetClientId, setTargetClientId] = useState<string | null>(null);
  const [initialData, setInitialData] = useState<any>(null);

  useEffect(() => {
    const fetchClientData = async () => {
      // If admin passed a clientId, use it. Otherwise use current user's client record.
      let query = supabase.from("clients").select("*");

      if (urlClientId) {
        query = query.eq("id", urlClientId);
      } else if (user?.id) {
        query = query.eq("user_id", user.id);
      } else {
        return;
      }

      const { data, error } = await query.maybeSingle();

      if (data) {
        setTargetClientId(data.id);
        setInitialData({
          age: data.age,
          gender: data.gender,
          goals: data.goals,
          programType: data.program_type
        });
      }
    };

    fetchClientData();
  }, [user, urlClientId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const data = {
      age: parseInt(formData.get("age") as string),
      gender: formData.get("gender") as string,
      goals: formData.get("goals") as string,
      programType: formData.get("programType") as string,
    };

    try {
      onboardingSchema.parse(data);

      const updatePayload = {
        age: data.age,
        gender: data.gender as any,
        goals: data.goals,
        program_type: data.programType as any,
        status: "active" as any, // Activate client on onboarding complete
      };

      let error;

      if (targetClientId) {
        // Update existing record
        const { error: updateError } = await supabase
          .from("clients")
          .update(updatePayload)
          .eq("id", targetClientId);
        error = updateError;
      } else {
        // Create new record (fallback if somehow no record exists yet)
        // Fetch profile data first
        const { data: profileData } = await supabase
          .from("profiles")
          .select("name, email, phone")
          .eq("id", user?.id)
          .single();

        const { error: insertError } = await supabase
          .from("clients")
          .insert({
            user_id: user?.id,
            name: profileData?.name || "",
            email: profileData?.email || user?.email || "",
            phone: profileData?.phone || "",
            ...updatePayload
          });
        error = insertError;
      }

      if (error) {
        toast.error(error.message);
        return;
      }

      // Create initial daily log if not exists
      const clientId = targetClientId; // or fetched from insert
      if (clientId) {
        const today = new Date().toISOString().split("T")[0];
        await supabase.from("daily_logs").upsert({
          client_id: clientId,
          log_date: today,
          water_intake: 0,
          activity_minutes: 0
        }, { onConflict: 'client_id, log_date' });
      }

      toast.success("Profile setup complete!");

      // If admin, go back to dashboard, else go to user dashboard
      if (urlClientId) {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }

    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-wellness-light via-background to-wellness-light/30 p-4">
      <div className="w-full max-w-2xl animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4 shadow-lg">
            <Leaf className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {urlClientId ? "Client Setup" : "Complete Your Profile"}
          </h1>
          <p className="text-muted-foreground">
            {urlClientId ? "Setup initial program details for the client" : "Tell us about yourself to get personalized guidance"}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>This information helps us create the best plan</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    name="age"
                    type="number"
                    min="10"
                    max="120"
                    placeholder="25"
                    defaultValue={initialData?.age}
                    key={initialData?.age ? "age-loaded" : "age-empty"}
                    required
                    className={errors.age ? "border-destructive" : ""}
                  />
                  {errors.age && <p className="text-sm text-destructive">{errors.age}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select name="gender" required defaultValue={initialData?.gender} key={initialData?.gender ? "gender-loaded" : "gender-empty"}>
                    <SelectTrigger className={errors.gender ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.gender && <p className="text-sm text-destructive">{errors.gender}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="programType">Program Type</Label>
                <Select name="programType" required defaultValue={initialData?.programType} key={initialData?.programType ? "pt-loaded" : "pt-empty"}>
                  <SelectTrigger className={errors.programType ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select program type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weight_loss">Weight Loss</SelectItem>
                    <SelectItem value="weight_gain">Weight Gain</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="muscle_building">Muscle Building</SelectItem>
                    <SelectItem value="general_wellness">General Wellness</SelectItem>
                  </SelectContent>
                </Select>
                {errors.programType && <p className="text-sm text-destructive">{errors.programType}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="goals">Your Goals</Label>
                <Textarea
                  id="goals"
                  name="goals"
                  placeholder="Tell us about your health and wellness goals..."
                  rows={4}
                  defaultValue={initialData?.goals}
                  key={initialData?.goals ? "goals-loaded" : "goals-empty"}
                  required
                  className={errors.goals ? "border-destructive" : ""}
                />
                {errors.goals && <p className="text-sm text-destructive">{errors.goals}</p>}
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? "Saving Profile..." : (
                  <>
                    Complete Setup
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}