import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Leaf, 
  Scale, 
  Droplets, 
  Activity, 
  Flame,
  LogOut,
  FileText,
  Plus
} from "lucide-react";
import { MealPhotoUpload } from "@/components/MealPhotoUpload";
import { FileUploadSection } from "@/components/FileUploadSection";
import { WeeklyPlanViewer } from "@/components/WeeklyPlanViewer";
import { ProgressCharts } from "@/components/ProgressCharts";
import { formatServiceType, getServiceTypeBadgeColor } from "@/lib/formatters";
import { MotivationCard } from "@/components/MotivationCard";
import { WeeklyGoals } from "@/components/WeeklyGoals";
import { getSignedUrls } from "@/lib/storage";

export default function ClientDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [clientData, setClientData] = useState<any>(null);
  const [todayLog, setTodayLog] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mealLogs, setMealLogs] = useState<any[]>([]);
  const [todayCalories, setTodayCalories] = useState(0);
  const [activeTab, setActiveTab] = useState<"today" | "plan" | "logs" | "files" | "reports">("today");
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [weightInput, setWeightInput] = useState<string>("");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    fetchClientData();
  }, [user, navigate]);

  const fetchClientData = async () => {
    setLoading(true);
    
    // Fetch client data
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", user?.id)
      .single();

    if (clientError) {
      console.error("Error fetching client:", clientError);
      if (clientError.code === 'PGRST116') {
        // No rows returned - redirect to onboarding
        navigate("/onboarding");
        return;
      }
      toast.error("Failed to load your profile");
      setLoading(false);
      return;
    }

    if (!client?.id) {
      console.error("Client record missing ID:", client);
      toast.error("Your profile is incomplete. Please contact support.");
      setLoading(false);
      return;
    }

    setClientData(client);

    // Fetch today's log
    const todayDate = new Date().toISOString().split("T")[0];
    const { data: log } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("client_id", client.id)
      .eq("log_date", todayDate)
      .maybeSingle();

    setTodayLog(log);

    // Fetch meal logs
    const { data: meals } = await supabase
      .from("meal_logs")
      .select("*")
      .eq("client_id", client.id)
      .order("logged_at", { ascending: false })
      .limit(20);

    setMealLogs(meals || []);

    // Calculate today's calories
    const todayMeals = meals?.filter(
      (meal) => meal.logged_at.split("T")[0] === todayDate
    ) || [];
    const totalCalories = todayMeals.reduce((sum, meal) => sum + (meal.kcal || 0), 0);
    setTodayCalories(totalCalories);

    setLoading(false);
  };

  // Load signed URLs for meal photos
  useEffect(() => {
    const loadSignedUrls = async () => {
      const paths = mealLogs
        .map(log => log.photo_url)
        .filter(Boolean) as string[];
      
      if (paths.length === 0) return;
      
      try {
        const urlMap = await getSignedUrls("meal-photos", paths);
        setSignedUrls(Object.fromEntries(urlMap));
      } catch (error) {
        console.error("Error loading signed URLs:", error);
      }
    };
    
    loadSignedUrls();
  }, [mealLogs]);

  const quickAddWater = async (amount: number) => {
    if (!clientData) return;

    const currentWater = todayLog?.water_intake || 0;
    const newAmount = currentWater + amount;

    const today = new Date().toISOString().split("T")[0];
    const updateData = {
      client_id: clientData.id,
      log_date: today,
      water_intake: newAmount,
    };

    if (todayLog) {
      await supabase.from("daily_logs").update(updateData).eq("id", todayLog.id);
    } else {
      const { data } = await supabase.from("daily_logs").insert(updateData).select().single();
      setTodayLog(data);
    }

    toast.success(`Added ${amount}ml water`);
    fetchClientData();
  };

  const quickAddActivity = async (minutes: number) => {
    if (!clientData) return;

    const currentActivity = todayLog?.activity_minutes || 0;
    const newAmount = currentActivity + minutes;

    const today = new Date().toISOString().split("T")[0];
    const updateData = {
      client_id: clientData.id,
      log_date: today,
      activity_minutes: newAmount,
    };

    if (todayLog) {
      await supabase.from("daily_logs").update(updateData).eq("id", todayLog.id);
    } else {
      const { data } = await supabase.from("daily_logs").insert(updateData).select().single();
      setTodayLog(data);
    }

    toast.success(`Added ${minutes} minutes`);
    fetchClientData();
  };

  const logWeight = async (weight: number) => {
    if (!clientData) return;

    const today = new Date().toISOString().split("T")[0];
    const updateData = {
      client_id: clientData.id,
      log_date: today,
      weight: weight,
    };

    try {
      if (todayLog) {
        await supabase.from("daily_logs").update(updateData).eq("id", todayLog.id);
      } else {
        const { data } = await supabase.from("daily_logs").insert(updateData).select().single();
        setTodayLog(data);
      }

      // Update last_weight in clients table for tracking
      await supabase.from("clients").update({ last_weight: weight }).eq("id", clientData.id);

      toast.success(`Weight logged: ${weight} kg`);
      fetchClientData();
    } catch (error) {
      console.error("Error logging weight:", error);
      toast.error("Failed to log weight");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-wellness-light via-background to-wellness-light/30">
      <div className="container mx-auto p-4 md:p-8 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg">
              <Leaf className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Welcome, {clientData?.name}!</h1>
              <div className="flex items-center gap-2">
                <p className="text-muted-foreground">Your wellness dashboard</p>
                {clientData?.service_type && (
                  <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs border ${getServiceTypeBadgeColor(clientData.service_type)}`}>
                    {formatServiceType(clientData.service_type)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>

        {/* Motivation Card */}
        <MotivationCard />

        {/* Enhanced Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
          {/* Weight Card */}
          <Card className="card-hover">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Weight</CardTitle>
                <Scale className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">
                {todayLog?.weight ? `${todayLog.weight} kg` : "--"}
              </div>
              {clientData?.last_weight && todayLog?.weight && (
                <p className="text-xs text-muted-foreground">
                  {todayLog.weight < clientData.last_weight ? "↓" : "↑"}
                  {Math.abs(todayLog.weight - clientData.last_weight).toFixed(1)} kg from last
                </p>
              )}
            </CardContent>
          </Card>

          {/* Water Card */}
          <Card className="card-hover">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Water</CardTitle>
                <Droplets className="h-4 w-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">
                {todayLog?.water_intake || 0}
                <span className="text-lg text-muted-foreground"> / 2000ml</span>
              </div>
              <Progress
                value={Math.min(((todayLog?.water_intake || 0) / 2000) * 100, 100)}
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {Math.round(((todayLog?.water_intake || 0) / 2000) * 100)}% of daily goal
              </p>
            </CardContent>
          </Card>

          {/* Activity Card */}
          <Card className="card-hover">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Activity</CardTitle>
                <Activity className="h-4 w-4 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">
                {todayLog?.activity_minutes || 0}
                <span className="text-lg text-muted-foreground"> / 30 min</span>
              </div>
              <Progress
                value={Math.min(((todayLog?.activity_minutes || 0) / 30) * 100, 100)}
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {Math.round(((todayLog?.activity_minutes || 0) / 30) * 100)}% of daily goal
              </p>
            </CardContent>
          </Card>

          {/* Calories Card */}
          <Card className="card-hover">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Calories</CardTitle>
                <Flame className="h-4 w-4 text-red-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">
                {todayCalories}
                <span className="text-lg text-muted-foreground"> / {clientData?.target_kcal || "--"}</span>
              </div>
              {clientData?.target_kcal && (
                <>
                  <Progress
                    value={Math.min((todayCalories / clientData.target_kcal) * 100, 100)}
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {Math.round((todayCalories / clientData.target_kcal) * 100)}% of daily goal
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs 
          value={activeTab} 
          onValueChange={(value) => setActiveTab(value as typeof activeTab)}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="plan">Weekly Plan</TabsTrigger>
            <TabsTrigger value="logs">Meal Logs</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Actions Column */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="animate-fade-in">
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Log your daily activities</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Water Quick Add */}
                    <div>
                      <Label className="mb-2 block">Add Water</Label>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => quickAddWater(250)}
                          className="flex-1 min-w-[100px]"
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          250ml
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => quickAddWater(500)}
                          className="flex-1 min-w-[100px]"
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          500ml
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => quickAddWater(750)}
                          className="flex-1 min-w-[100px]"
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          750ml
                        </Button>
                      </div>
                    </div>

                    {/* Activity Quick Add */}
                    <div>
                      <Label className="mb-2 block">Log Activity</Label>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => quickAddActivity(15)}
                          className="flex-1 min-w-[100px]"
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          15 min
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => quickAddActivity(30)}
                          className="flex-1 min-w-[100px]"
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          30 min
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => quickAddActivity(60)}
                          className="flex-1 min-w-[100px]"
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          60 min
                        </Button>
                      </div>
                    </div>

                    {/* Weight Logging */}
                    <div>
                      <Label className="mb-2 block">Log Weight</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          step="0.1"
                          min="20"
                          max="300"
                          placeholder="Enter weight in kg"
                          value={weightInput}
                          onChange={(e) => setWeightInput(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          onClick={() => {
                            const weight = parseFloat(weightInput);
                            if (!isNaN(weight) && weight >= 20 && weight <= 300) {
                              logWeight(weight);
                              setWeightInput("");
                            } else {
                              toast.error("Please enter a valid weight (20-300 kg)");
                            }
                          }}
                          disabled={!weightInput}
                        >
                          <Scale className="mr-2 h-4 w-4" />
                          Log
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <ProgressCharts clientId={clientData?.id} daysToShow={14} />
              </div>

              {/* Weekly Goals Column */}
              <div className="space-y-6">
                <WeeklyGoals clientId={clientData?.id} />

                <Card className="animate-fade-in">
                  <CardHeader>
                    <CardTitle>Today's Meals</CardTitle>
                    <CardDescription>Track your nutrition</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" onClick={() => setActiveTab("logs")}>
                      <Plus className="mr-2 h-4 w-4" />
                      Log Meal Photo
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="plan">
            {clientData && <WeeklyPlanViewer clientId={clientData.id} />}
          </TabsContent>

          <TabsContent value="logs">
            <div className="space-y-6">
              {clientData?.id ? (
                <MealPhotoUpload clientId={clientData.id} onSuccess={fetchClientData} />
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Loading your meal logging form...
                  </CardContent>
                </Card>
              )}

              {mealLogs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Your Meal History</CardTitle>
                    <CardDescription>Recent meals you've logged</CardDescription>
                  </CardHeader>
                  <CardContent>
                  <div className="space-y-4">
                      {mealLogs.map((log) => {
                        const signedUrl = log.photo_url ? signedUrls[log.photo_url] : null;
                        return (
                          <div key={log.id} className="flex gap-4 p-4 border rounded-lg">
                            {signedUrl && (
                              <div className="w-24 h-24 flex-shrink-0">
                                <img
                                  src={signedUrl}
                                  alt={log.meal_name || "Meal"}
                                  className="w-full h-full object-cover rounded-lg cursor-pointer"
                                  onClick={() => window.open(signedUrl, "_blank")}
                                />
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <p className="font-semibold capitalize">{log.meal_type.replace("_", " ")}</p>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(log.logged_at).toLocaleString()}
                                </p>
                              </div>
                              {log.meal_name && <p className="text-sm">{log.meal_name}</p>}
                              {log.kcal && <p className="text-sm text-muted-foreground">{log.kcal} kcal</p>}
                              {log.notes && <p className="text-sm text-muted-foreground mt-2">{log.notes}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="files">
            {clientData && <FileUploadSection clientId={clientData.id} />}
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Reports</CardTitle>
                <CardDescription>Your progress reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">No reports available</p>
                  <p className="text-sm">Reports will appear here once generated by your dietitian</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}