import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Search, Loader2, Apple } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

interface FoodItem {
  id: string;
  name: string;
  category: string | null;
  serving_size: string;
  serving_unit: string;
  kcal_per_serving: number;
  protein: number | null;
  carbs: number | null;
  fats: number | null;
  created_at: string;
}

const foodItemSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  category: z.string().max(50, "Category must be less than 50 characters").optional(),
  serving_size: z.string().min(1, "Serving size is required"),
  serving_unit: z.string().min(1, "Serving unit is required").max(20, "Unit must be less than 20 characters"),
  kcal_per_serving: z.number().min(0, "Calories must be 0 or greater"),
  protein: z.number().min(0, "Protein must be 0 or greater").optional().nullable(),
  carbs: z.number().min(0, "Carbs must be 0 or greater").optional().nullable(),
  fats: z.number().min(0, "Fats must be 0 or greater").optional().nullable(),
});

type FoodItemFormData = z.infer<typeof foodItemSchema>;

// FormFields component defined outside to prevent re-renders and focus loss
const FormFields = ({ 
  formData, 
  setFormData, 
  saving 
}: { 
  formData: FoodItemFormData; 
  setFormData: (data: FoodItemFormData) => void; 
  saving: boolean;
}) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="name">Food Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Chicken Breast"
          disabled={saving}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Input
          id="category"
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          placeholder="e.g., Protein, Vegetable"
          disabled={saving}
        />
      </div>
    </div>

    <div className="grid grid-cols-3 gap-4">
      <div className="space-y-2">
        <Label htmlFor="serving_size">Serving Size *</Label>
        <Input
          id="serving_size"
          value={formData.serving_size}
          onChange={(e) => setFormData({ ...formData, serving_size: e.target.value })}
          placeholder="e.g., 100, 1"
          disabled={saving}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="serving_unit">Unit *</Label>
        <Input
          id="serving_unit"
          value={formData.serving_unit}
          onChange={(e) => setFormData({ ...formData, serving_unit: e.target.value })}
          placeholder="e.g., g, cup, piece"
          disabled={saving}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="kcal">Calories (kcal) *</Label>
        <Input
          id="kcal"
          type="number"
          value={formData.kcal_per_serving}
          onChange={(e) => setFormData({ ...formData, kcal_per_serving: parseFloat(e.target.value) || 0 })}
          placeholder="e.g., 165"
          disabled={saving}
        />
      </div>
    </div>

    <div className="grid grid-cols-3 gap-4">
      <div className="space-y-2">
        <Label htmlFor="protein">Protein (g)</Label>
        <Input
          id="protein"
          type="number"
          step="0.1"
          value={formData.protein ?? ""}
          onChange={(e) => setFormData({ ...formData, protein: e.target.value ? parseFloat(e.target.value) : null })}
          placeholder="e.g., 31"
          disabled={saving}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="carbs">Carbs (g)</Label>
        <Input
          id="carbs"
          type="number"
          step="0.1"
          value={formData.carbs ?? ""}
          onChange={(e) => setFormData({ ...formData, carbs: e.target.value ? parseFloat(e.target.value) : null })}
          placeholder="e.g., 0"
          disabled={saving}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="fats">Fats (g)</Label>
        <Input
          id="fats"
          type="number"
          step="0.1"
          value={formData.fats ?? ""}
          onChange={(e) => setFormData({ ...formData, fats: e.target.value ? parseFloat(e.target.value) : null })}
          placeholder="e.g., 3.6"
          disabled={saving}
        />
      </div>
    </div>
  </div>
);

export function FoodItemsManager() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<FoodItemFormData>({
    name: "",
    category: "",
    serving_size: "",
    serving_unit: "",
    kcal_per_serving: 0,
    protein: null,
    carbs: null,
    fats: null,
  });

  const fetchFoodItems = async () => {
    const { data, error } = await supabase
      .from("food_items")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    return data || [];
  };

  const { data: foodItems = [], isLoading } = useQuery({
    queryKey: ['food-items'],
    queryFn: fetchFoodItems,
  });

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      serving_size: "",
      serving_unit: "",
      kcal_per_serving: 0,
      protein: null,
      carbs: null,
      fats: null,
    });
    setEditingItem(null);
  };

  const handleAdd = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const handleEdit = (item: FoodItem) => {
    setFormData({
      name: item.name,
      category: item.category || "",
      serving_size: item.serving_size,
      serving_unit: item.serving_unit,
      kcal_per_serving: item.kcal_per_serving,
      protein: item.protein,
      carbs: item.carbs,
      fats: item.fats,
    });
    setEditingItem(item);
  };

  const handleSave = async () => {
    try {
      // Validate form data
      const validatedData = foodItemSchema.parse(formData);

      setSaving(true);

      // Prepare data for database
      const dbData = {
        name: validatedData.name,
        category: validatedData.category || null,
        serving_size: validatedData.serving_size,
        serving_unit: validatedData.serving_unit,
        kcal_per_serving: validatedData.kcal_per_serving,
        protein: validatedData.protein,
        carbs: validatedData.carbs,
        fats: validatedData.fats,
      };

      if (editingItem) {
        // Update existing item
        const { error } = await supabase
          .from("food_items")
          .update(dbData)
          .eq("id", editingItem.id);

        if (error) throw error;
        toast.success("Food item updated successfully!");
      } else {
        // Create new item
        const { error } = await supabase
          .from("food_items")
          .insert(dbData);

        if (error) throw error;
        toast.success("Food item created successfully!");
      }

      setIsAddDialogOpen(false);
      setEditingItem(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['food-items'] });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast.error(firstError.message);
      } else {
        toast.error(error.message || "Failed to save food item");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("food_items")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Food item deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ['food-items'] });
    } catch (error: any) {
      toast.error(error.message || "Failed to delete food item");
    } finally {
      setDeleteItemId(null);
    }
  };

  const filteredItems = foodItems.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Food Items Database</CardTitle>
              <CardDescription>Manage your nutrition database for meal planning</CardDescription>
            </div>
            <Button onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Add Food Item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading food items...</div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Apple className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">
                {searchQuery ? "No food items found" : "No food items yet"}
              </p>
              <p className="text-sm">
                {searchQuery ? "Try a different search term" : "Add your first food item to get started"}
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Serving</TableHead>
                    <TableHead className="text-right">Kcal</TableHead>
                    <TableHead className="text-right">Protein (g)</TableHead>
                    <TableHead className="text-right">Carbs (g)</TableHead>
                    <TableHead className="text-right">Fats (g)</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.category || "—"}</TableCell>
                      <TableCell>
                        {item.serving_size} {item.serving_unit}
                      </TableCell>
                      <TableCell className="text-right">{item.kcal_per_serving}</TableCell>
                      <TableCell className="text-right">{item.protein ?? "—"}</TableCell>
                      <TableCell className="text-right">{item.carbs ?? "—"}</TableCell>
                      <TableCell className="text-right">{item.fats ?? "—"}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteItemId(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            Showing {filteredItems.length} of {foodItems.length} food items
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen || !!editingItem} onOpenChange={(open) => {
        if (!open) {
          setIsAddDialogOpen(false);
          setEditingItem(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Food Item" : "Add Food Item"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Update the food item details" : "Add a new food item to your nutrition database"}
            </DialogDescription>
          </DialogHeader>
          <FormFields formData={formData} setFormData={setFormData} saving={saving} />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setEditingItem(null);
                resetForm();
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteItemId} onOpenChange={() => setDeleteItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Food Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this food item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteItemId && handleDelete(deleteItemId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
