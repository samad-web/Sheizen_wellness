import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Loader2, Upload, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface MealPhotoUploadProps {
  clientId: string;
  onSuccess: () => void;
}

const MEAL_TYPES = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "evening_snack", label: "Evening Snack" },
  { value: "dinner", label: "Dinner" },
];

export function MealPhotoUpload({ clientId, onSuccess }: MealPhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mealType, setMealType] = useState<string>("");
  const [mealName, setMealName] = useState("");
  const [notes, setNotes] = useState("");
  const [kcal, setKcal] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error("Image size must be less than 10MB");
        return;
      }
      if (!selectedFile.type.startsWith("image/")) {
        toast.error("Only image files are allowed");
        return;
      }
      setFile(selectedFile);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const clearForm = () => {
    setFile(null);
    setPreview(null);
    setMealType("");
    setMealName("");
    setNotes("");
    setKcal("");
  };

  const handleUpload = async () => {
    if (!file || !mealType) {
      toast.error("Please select an image and meal type");
      return;
    }

    setUploading(true);

    try {
      // Upload image to storage
      const fileName = `${clientId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("meal-photos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("meal-photos")
        .getPublicUrl(fileName);

      // Get or create today's daily log
      const today = new Date().toISOString().split("T")[0];
      let dailyLogId = null;

      const { data: existingLog } = await supabase
        .from("daily_logs")
        .select("id")
        .eq("client_id", clientId)
        .eq("log_date", today)
        .maybeSingle();

      if (existingLog) {
        dailyLogId = existingLog.id;
      }

      // Insert meal log
      const { error: dbError } = await supabase
        .from("meal_logs")
        .insert({
          client_id: clientId,
          daily_log_id: dailyLogId,
          meal_type: mealType as "breakfast" | "lunch" | "evening_snack" | "dinner",
          meal_name: mealName || null,
          photo_url: urlData.publicUrl,
          notes: notes || null,
          kcal: kcal ? parseInt(kcal) : null,
          logged_at: new Date().toISOString(),
        });

      if (dbError) throw dbError;

      toast.success("Meal photo uploaded successfully!");
      clearForm();
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to upload meal photo");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Log Your Meal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="photo">Meal Photo</Label>
          <div className="mt-2">
            {preview ? (
              <div className="relative inline-block">
                <img src={preview} alt="Preview" className="max-w-full h-48 rounded-lg object-cover" />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors">
                <ImageIcon className="h-12 w-12 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Click to select photo</span>
                <Input
                  id="photo"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="mealType">Meal Type</Label>
          <Select value={mealType} onValueChange={setMealType} disabled={uploading}>
            <SelectTrigger id="mealType">
              <SelectValue placeholder="Select meal type" />
            </SelectTrigger>
            <SelectContent>
              {MEAL_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="mealName">Meal Name (Optional)</Label>
          <Input
            id="mealName"
            value={mealName}
            onChange={(e) => setMealName(e.target.value)}
            placeholder="e.g., Grilled Chicken Salad"
            disabled={uploading}
          />
        </div>

        <div>
          <Label htmlFor="kcal">Calories (Optional)</Label>
          <Input
            id="kcal"
            type="number"
            value={kcal}
            onChange={(e) => setKcal(e.target.value)}
            placeholder="e.g., 450"
            disabled={uploading}
          />
        </div>

        <div>
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes about this meal..."
            rows={3}
            disabled={uploading}
          />
        </div>

        <Button onClick={handleUpload} disabled={uploading || !file || !mealType} className="w-full">
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Log Meal
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
