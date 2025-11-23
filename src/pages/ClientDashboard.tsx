import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Leaf, 
  User, 
  Scale, 
  Droplets, 
  Activity, 
  Calendar,
  TrendingDown,
  LogOut,
  FileText
} from "lucide-react";
import { MealPhotoUpload } from "@/components/MealPhotoUpload";
import { FileUploadSection } from "@/components/FileUploadSection";
import { WeeklyPlanViewer } from "@/components/WeeklyPlanViewer";
import { ProgressCharts } from "@/components/ProgressCharts";
import { formatServiceType, getServiceTypeBadgeColor } from "@/lib/formatters";

export default function ClientDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [clientData, setClientData] = useState<any>(null);
  const [todayLog, setTodayLog] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [weight, setWeight] = useState("");
  const [water, setWater] = useState("");
  const [activity, setActivity] = useState("");
  const [mealLogs, setMealLogs] = useState<any[]>([]);

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

    if (clientError || !client) {
      // If no client record, redirect to onboarding
      navigate("/onboarding");
      return;
    }

    setClientData(client);

    // Fetch today's log
    const today = new Date().toISOString().split("T")[0];
    const { data: log } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("client_id", client.id)
      .eq("log_date", today)
      .maybeSingle();

    setTodayLog(log);
    if (log) {
      setWeight(log.weight?.toString() || "");
      setWater(log.water_intake?.toString() || "");
      setActivity(log.activity_minutes?.toString() || "");
    }

    // Fetch meal logs
    const { data: meals } = await supabase
      .from("meal_logs")
      .select("*")
      .eq("client_id", client.id)
      .order("logged_at", { ascending: false })
      .limit(20);

    setMealLogs(meals || []);

    setLoading(false);
  };

  const updateDailyLog = async (field: string, value: string) => {
    if (!clientData) return;

    const today = new Date().toISOString().split("T")[0];
    const updateData = {
      client_id: clientData.id,
      log_date: today,
      [field]: parseFloat(value) || 0,
    };

    if (todayLog) {
      const { error } = await supabase
        .from("daily_logs")
        .update(updateData)
        .eq("id", todayLog.id);

      if (error) {
        toast.error(error.message);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("daily_logs")
        .insert(updateData)
        .select()
        .single();

      if (error) {
        toast.error(error.message);
        return;
      }
      setTodayLog(data);
    }

    toast.success(`${field.replace("_", " ")} updated successfully!`);
    fetchClientData();
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

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Today's Weight</CardTitle>
              <Scale className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayLog?.weight || "--"} kg</div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Water Intake</CardTitle>
              <Droplets className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayLog?.water_intake || 0} ml</div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Activity</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayLog?.activity_minutes || 0} min</div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Target Kcal</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clientData?.target_kcal || "--"}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="today" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="plan">Weekly Plan</TabsTrigger>
            <TabsTrigger value="logs">Meal Logs</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Update your daily tracking</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="weight"
                        type="number"
                        step="0.1"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="Enter weight"
                      />
                      <Button onClick={() => updateDailyLog("weight", weight)}>
                        Update
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="water">Water Intake (ml)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="water"
                        type="number"
                        value={water}
                        onChange={(e) => setWater(e.target.value)}
                        placeholder="Enter water"
                      />
                      <Button onClick={() => updateDailyLog("water_intake", water)}>
                        Update
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="activity">Activity (minutes)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="activity"
                        type="number"
                        value={activity}
                        onChange={(e) => setActivity(e.target.value)}
                        placeholder="Enter activity"
                      />
                      <Button onClick={() => updateDailyLog("activity_minutes", activity)}>
                        Update
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <ProgressCharts clientId={clientData?.id} daysToShow={14} />

            <Card>
              <CardHeader>
                <CardTitle>Today's Schedule</CardTitle>
                <CardDescription>Your meal plan for today</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No meal plan for today yet</p>
                  <p className="text-sm">Your dietitian will create a plan for you soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="plan">
            {clientData && <WeeklyPlanViewer clientId={clientData.id} />}
          </TabsContent>

          <TabsContent value="logs">
            <div className="space-y-6">
              <MealPhotoUpload clientId={clientData?.id} onSuccess={fetchClientData} />

              {mealLogs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Your Meal History</CardTitle>
                    <CardDescription>Recent meals you've logged</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {mealLogs.map((log) => (
                        <div key={log.id} className="flex gap-4 p-4 border rounded-lg">
                          {log.photo_url && (
                            <div className="w-24 h-24 flex-shrink-0">
                              <img
                                src={log.photo_url}
                                alt={log.meal_name || "Meal"}
                                className="w-full h-full object-cover rounded-lg cursor-pointer"
                                onClick={() => window.open(log.photo_url, "_blank")}
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
                      ))}
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