import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

interface MealCard {
  day_number: number;
  meal_type: "breakfast" | "lunch" | "evening_snack" | "dinner";
  meal_name: string;
  description: string;
  ingredients: string;
  instructions: string;
  kcal: number;
}

interface WeeklyPlanEditorProps {
  clientId: string;
  planId?: string;
  onSuccess: () => void;
}

const MEAL_TYPES = ["breakfast", "lunch", "evening_snack", "dinner"] as const;
const MEAL_LABELS = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  evening_snack: "Evening Snack",
  dinner: "Dinner",
};

export function WeeklyPlanEditor({ clientId, planId, onSuccess }: WeeklyPlanEditorProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [weekNumber, setWeekNumber] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [mealCards, setMealCards] = useState<MealCard[]>([]);
  const [currentDay, setCurrentDay] = useState(1);

  useEffect(() => {
    if (planId && open) {
      loadPlan();
    } else if (open) {
      initializeEmptyPlan();
    }
  }, [planId, open]);

  const loadPlan = async () => {
    try {
      const { data: plan, error: planError } = await supabase
        .from("weekly_plans")
        .select("*")
        .eq("id", planId)
        .single();

      if (planError) throw planError;

      setWeekNumber(plan.week_number);
      setStartDate(plan.start_date);
      setEndDate(plan.end_date);
      setStatus((plan.status === "published" ? "published" : "draft") as "draft" | "published");

      // Initialize all 28 empty meal cards first
      const emptyCards: MealCard[] = [];
      for (let day = 1; day <= 7; day++) {
        MEAL_TYPES.forEach(type => {
          emptyCards.push({
            day_number: day,
            meal_type: type,
            meal_name: "",
            description: "",
            ingredients: "",
            instructions: "",
            kcal: 0,
          });
        });
      }

      // Fetch existing meal cards from database
      const { data: existingCards, error: cardsError } = await supabase
        .from("meal_cards")
        .select("*")
        .eq("plan_id", planId);

      if (cardsError) throw cardsError;

      // Merge existing data into the empty cards structure
      const mergedCards = emptyCards.map(emptyCard => {
        const existingCard = existingCards?.find(
          c => c.day_number === emptyCard.day_number && c.meal_type === emptyCard.meal_type
        );
        
        if (existingCard) {
          return {
            day_number: existingCard.day_number,
            meal_type: existingCard.meal_type,
            meal_name: existingCard.meal_name,
            description: existingCard.description || "",
            ingredients: existingCard.ingredients || "",
            instructions: existingCard.instructions || "",
            kcal: existingCard.kcal,
          };
        }
        
        return emptyCard;
      });

      setMealCards(mergedCards);
    } catch (error: any) {
      toast.error(error.message || "Failed to load plan");
    }
  };

  const initializeEmptyPlan = () => {
    const cards: MealCard[] = [];
    for (let day = 1; day <= 7; day++) {
      MEAL_TYPES.forEach(type => {
        cards.push({
          day_number: day,
          meal_type: type,
          meal_name: "",
          description: "",
          ingredients: "",
          instructions: "",
          kcal: 0,
        });
      });
    }
    setMealCards(cards);
  };

  const updateMealCard = (day: number, mealType: string, field: keyof MealCard, value: any) => {
    setMealCards(prev => prev.map(card =>
      card.day_number === day && card.meal_type === mealType
        ? { ...card, [field]: value }
        : card
    ));
  };

  const getMealCard = (day: number, mealType: string) => {
    return mealCards.find(c => c.day_number === day && c.meal_type === mealType);
  };

  const getTotalKcal = () => {
    return mealCards.reduce((sum, card) => sum + (card.kcal || 0), 0);
  };

  const handleSave = async (publish: boolean) => {
    if (!startDate || !endDate) {
      toast.error("Please select start and end dates");
      return;
    }

    setSaving(true);

    try {
      const planData = {
        client_id: clientId,
        week_number: weekNumber,
        start_date: startDate,
        end_date: endDate,
        status: publish ? "published" : "draft",
        total_kcal: getTotalKcal(),
        published_at: publish ? new Date().toISOString() : null,
      };

      let newPlanId = planId;

      if (planId) {
        // Update existing plan
        const { error: updateError } = await supabase
          .from("weekly_plans")
          .update(planData)
          .eq("id", planId);

        if (updateError) throw updateError;

        // Delete old meal cards
        const { error: deleteError } = await supabase
          .from("meal_cards")
          .delete()
          .eq("plan_id", planId);

        if (deleteError) throw deleteError;
      } else {
        // Create new plan
        const { data: newPlan, error: createError } = await supabase
          .from("weekly_plans")
          .insert(planData)
          .select()
          .single();

        if (createError) throw createError;
        newPlanId = newPlan.id;
      }

      // Insert meal cards
      const cardsToInsert = mealCards
        .filter(card => card.meal_name.trim() !== "")
        .map(card => ({
          plan_id: newPlanId,
          day_number: card.day_number,
          meal_type: card.meal_type,
          meal_name: card.meal_name,
          description: card.description || null,
          ingredients: card.ingredients || null,
          instructions: card.instructions || null,
          kcal: card.kcal,
        }));

      if (cardsToInsert.length > 0) {
        const { error: cardsError } = await supabase
          .from("meal_cards")
          .insert(cardsToInsert);

        if (cardsError) throw cardsError;
      }

      toast.success(publish ? "Plan published successfully!" : "Plan saved as draft!");
      setOpen(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to save plan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {planId ? "Edit Plan" : "Create Plan"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 shrink-0 border-b">
          <DialogTitle>{planId ? "Edit Weekly Plan" : "Create Weekly Plan"}</DialogTitle>
          <DialogDescription>
            Build a 7-day meal plan with meal cards for each day
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 p-6">
          <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="week">Week Number</Label>
              <Input
                id="week"
                type="number"
                value={weekNumber}
                onChange={(e) => setWeekNumber(parseInt(e.target.value) || 1)}
                disabled={saving}
              />
            </div>
            <div>
              <Label htmlFor="start">Start Date</Label>
              <Input
                id="start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={saving}
              />
            </div>
            <div>
              <Label htmlFor="end">End Date</Label>
              <Input
                id="end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm font-medium">Total Weekly Kcal</p>
              <p className="text-2xl font-bold">{getTotalKcal()}</p>
            </div>
          </div>

          <Tabs value={`day-${currentDay}`} onValueChange={(v) => setCurrentDay(parseInt(v.split("-")[1]))}>
            <TabsList className="grid grid-cols-7 w-full">
              {[1, 2, 3, 4, 5, 6, 7].map(day => (
                <TabsTrigger key={day} value={`day-${day}`}>Day {day}</TabsTrigger>
              ))}
            </TabsList>

            {[1, 2, 3, 4, 5, 6, 7].map(day => (
              <TabsContent key={day} value={`day-${day}`} className="space-y-4">
                {MEAL_TYPES.map(mealType => {
                  const card = getMealCard(day, mealType);
                  if (!card) return null;

                  return (
                    <Card key={mealType}>
                      <CardHeader>
                        <CardTitle className="text-lg">{MEAL_LABELS[mealType]}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <Label>Meal Name</Label>
                          <Input
                            value={card.meal_name}
                            onChange={(e) => updateMealCard(day, mealType, "meal_name", e.target.value)}
                            placeholder="e.g., Oatmeal with Berries"
                            disabled={saving}
                          />
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Textarea
                            value={card.description}
                            onChange={(e) => updateMealCard(day, mealType, "description", e.target.value)}
                            placeholder="Brief description..."
                            rows={2}
                            disabled={saving}
                          />
                        </div>
                        <div>
                          <Label>Ingredients</Label>
                          <Textarea
                            value={card.ingredients}
                            onChange={(e) => updateMealCard(day, mealType, "ingredients", e.target.value)}
                            placeholder="List ingredients..."
                            rows={2}
                            disabled={saving}
                          />
                        </div>
                        <div>
                          <Label>Instructions</Label>
                          <Textarea
                            value={card.instructions}
                            onChange={(e) => updateMealCard(day, mealType, "instructions", e.target.value)}
                            placeholder="Preparation instructions..."
                            rows={2}
                            disabled={saving}
                          />
                        </div>
                        <div>
                          <Label>Kcal</Label>
                          <Input
                            type="number"
                            value={card.kcal}
                            onChange={(e) => updateMealCard(day, mealType, "kcal", parseInt(e.target.value) || 0)}
                            disabled={saving}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </TabsContent>
            ))}
          </Tabs>
        </div>
        </div>

        <DialogFooter className="p-6 pt-4 border-t shrink-0 gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="outline" onClick={() => handleSave(false)} disabled={saving} className="group">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" />}
            Save Draft
          </Button>
          <Button onClick={() => handleSave(true)} disabled={saving} className="bg-wellness-green hover:bg-wellness-green/90 group">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" />}
            Publish Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
