import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Leaf, CheckCircle2, Loader2 } from "lucide-react";
import { z } from "zod";

const interestFormSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters"),
  age: z.number().int().min(10, "Age must be at least 10").max(120, "Age must be less than 120"),
  gender: z.enum(["male", "female", "other"], { required_error: "Please select a gender" }),
  contact_number: z.string().trim().min(10, "Contact number must be at least 10 digits").max(15, "Contact number must be less than 15 digits"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  health_goal: z.enum(["weight_loss", "muscle_gain", "diabetes", "pcos", "lifestyle_correction"], { required_error: "Please select a health goal" }),
});

export default function InterestForm() {
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    gender: "",
    contact_number: "",
    email: "",
    health_goal: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate form data
      const validatedData = interestFormSchema.parse({
        ...formData,
        age: parseInt(formData.age),
      });

      // Submit to database
      const { error } = await supabase
        .from("interest_form_submissions")
        .insert({
          name: validatedData.name,
          age: validatedData.age,
          gender: validatedData.gender,
          contact_number: validatedData.contact_number,
          email: validatedData.email,
          health_goal: validatedData.health_goal,
        });

      if (error) throw error;

      setSubmitted(true);
      toast.success("Thank you for your interest! We'll contact you soon.");
      
      // Reset form
      setFormData({
        name: "",
        age: "",
        gender: "",
        contact_number: "",
        email: "",
        health_goal: "",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast.error(firstError.message);
      } else {
        console.error("Error submitting form:", error);
        toast.error("Failed to submit form. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-wellness-light via-background to-wellness-light/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg animate-fade-in">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Thank You!</h2>
            <p className="text-muted-foreground mb-6">
              We've received your information and will get in touch with you soon to discuss your wellness journey.
            </p>
            <Button onClick={() => setSubmitted(false)} variant="outline">
              Submit Another Response
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-wellness-light via-background to-wellness-light/30">
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center shadow-lg mx-auto mb-4">
            <Leaf className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3">Sheizen AI Nutritionist</h1>
          <p className="text-xl text-muted-foreground">Start Your Wellness Journey Today</p>
        </div>

        {/* Interest Form */}
        <Card className="animate-fade-in shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl">Express Your Interest</CardTitle>
            <CardDescription>
              Fill out the form below and our team will reach out to discuss a personalized nutrition plan for you
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  maxLength={100}
                />
              </div>

              {/* Age & Gender */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Age *</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="25"
                    min="10"
                    max="120"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gender *</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => setFormData({ ...formData, gender: value })}
                    required
                  >
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Contact Number */}
              <div className="space-y-2">
                <Label htmlFor="contact">Contact Number *</Label>
                <Input
                  id="contact"
                  type="tel"
                  placeholder="+91 9876543210"
                  value={formData.contact_number}
                  onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                  required
                  maxLength={15}
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email ID *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  maxLength={255}
                />
              </div>

              {/* Health Goal */}
              <div className="space-y-2">
                <Label htmlFor="health-goal">Health Goal *</Label>
                <Select
                  value={formData.health_goal}
                  onValueChange={(value) => setFormData({ ...formData, health_goal: value })}
                  required
                >
                  <SelectTrigger id="health-goal">
                    <SelectValue placeholder="Select your primary health goal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weight_loss">Weight Loss</SelectItem>
                    <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                    <SelectItem value="diabetes">Diabetes Management</SelectItem>
                    <SelectItem value="pcos">PCOS Management</SelectItem>
                    <SelectItem value="lifestyle_correction">Lifestyle Correction</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Submit Button */}
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Interest Form"
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                By submitting this form, you agree to be contacted by our team regarding your wellness journey.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
