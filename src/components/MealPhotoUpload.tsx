import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { MAX_FILE_SIZE, getAcceptString, getFileIcon, getFileDisplayName } from "@/lib/fileUtils";

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
      if (selectedFile.size > MAX_FILE_SIZE) {
        toast.error("File size must be less than 50MB");
        return;
      }
      
      setFile(selectedFile);
      
      // Create preview for images only
      if (selectedFile.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        setPreview(null);
      }
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
    // Validate clientId first
    if (!clientId || clientId === "undefined") {
      console.error("Invalid clientId:", clientId);
      toast.error("Unable to identify your account. Please refresh the page.");
      return;
    }

    if (!file || !mealType) {
      toast.error("Please select a file and meal type");
      return;
    }

    console.log("Attempting to log meal:", {
      clientId,
      mealType,
      hasFile: !!file,
    });

    setUploading(true);

    try {
      // Upload image to storage
      const fileName = `${clientId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("meal-photos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

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

      // Insert meal log with file path and file type
      const { error: dbError } = await supabase
        .from("meal_logs")
        .insert({
          client_id: clientId,
          daily_log_id: dailyLogId,
          meal_type: mealType as "breakfast" | "lunch" | "evening_snack" | "dinner",
          meal_name: mealName || null,
          photo_url: fileName, // Store path, not public URL
          file_type: file.type, // Store file MIME type
          notes: notes || null,
          kcal: kcal ? parseInt(kcal) : null,
          logged_at: new Date().toISOString(),
        });

      if (dbError) throw dbError;

      toast.success("Meal file uploaded successfully!");
      clearForm();
      onSuccess();
    } catch (error: any) {
      console.error("Meal log error:", error);
      toast.error(error.message || "Failed to upload meal file");
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
          <Label htmlFor="photo">Meal File (Photo, PDF, Document, etc.)</Label>
          <div className="mt-2">
            {file ? (
              <div className="relative">
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
                  <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted">
                    {(() => {
                      const FileIcon = getFileIcon(file.type);
                      return <FileIcon className="h-8 w-8 text-muted-foreground flex-shrink-0" />;
                    })()}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {getFileDisplayName(file.type)} • {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFile(null);
                        setPreview(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors">
                <Upload className="h-12 w-12 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground mb-1">Click to select file</span>
                <span className="text-xs text-muted-foreground">Images, PDFs, Documents, Audio, Video (max 50MB)</span>
                <Input
                  id="photo"
                  type="file"
                  accept={getAcceptString()}
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
