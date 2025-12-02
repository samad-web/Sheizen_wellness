import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
import { getFileIcon, getFileDisplayName, handleFileClick } from "@/lib/fileUtils";
import { AchievementList } from "@/components/AchievementList";
import { AchievementProgress } from "@/components/AchievementProgress";
import { AchievementNotification } from "@/components/AchievementNotification";
import { MessageFeed } from "@/components/MessageFeed";
import { MessageComposer } from "@/components/MessageComposer";
import { MessageNotification } from "@/components/MessageNotification";
import { sendAutomatedMessage, getUnreadCount, markMessagesAsRead, type Message } from "@/lib/messages";
import { MessageCircle } from "lucide-react";
import { CalendarView } from "@/components/CalendarView";
import { HundredDayProgress } from "@/components/HundredDayProgress";
import { UpcomingMeetingsBanner } from "@/components/UpcomingMeetingsBanner";
import { NotificationBell } from "@/components/NotificationBell";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { HealthAssessmentCardView } from "@/components/client/HealthAssessmentCardView";
import { StressCardView } from "@/components/client/StressCardView";
import { SleepCardView } from "@/components/client/SleepCardView";
import { ActionPlanCardView } from "@/components/client/ActionPlanCardView";
import { DietPlanCardView } from "@/components/client/DietPlanCardView";
import { ClipboardList } from "lucide-react";
import { PendingAssessmentRequests } from "@/components/PendingAssessmentRequests";
import { ClientHealthAssessmentForm } from "@/components/client/ClientHealthAssessmentForm";
import { ClientStressAssessmentForm } from "@/components/client/ClientStressAssessmentForm";
import { ClientSleepAssessmentForm } from "@/components/client/ClientSleepAssessmentForm";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export default function ClientDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [todayLog, setTodayLog] = useState<any>(null);
  const [mealLogs, setMealLogs] = useState<any[]>([]);
  const [todayCalories, setTodayCalories] = useState(0);
  const [activeTab, setActiveTab] = useState<"today" | "plan" | "logs" | "files" | "achievements" | "assessments" | "reports" | "messages" | "calendar" | "progress">("today");
  const [assessmentCards, setAssessmentCards] = useState<any[]>([]);
  const [assessmentRecords, setAssessmentRecords] = useState<any[]>([]);
  const [newCardNotification, setNewCardNotification] = useState<any>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [weightInput, setWeightInput] = useState<string>("");
  const [waterInput, setWaterInput] = useState<string>("");
  const [activityInput, setActivityInput] = useState<string>("");
  const [achievements, setAchievements] = useState<any[]>([]);
  const [userAchievements, setUserAchievements] = useState<any[]>([]);
  const [achievementProgress, setAchievementProgress] = useState<any[]>([]);
  const [newAchievements, setNewAchievements] = useState<any[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [newMessage, setNewMessage] = useState<Message | null>(null);
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [selectedAssessmentRequest, setSelectedAssessmentRequest] = useState<{ requestId: string; type: string } | null>(null);

  const fetchClientData = async () => {
    if (!user?.id) throw new Error("No user");
    
    // Fetch client data
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (clientError) {
      if (clientError.code === 'PGRST116') {
        navigate("/onboarding");
        throw new Error("No client profile");
      }
      throw clientError;
    }

    if (!client?.id) {
      throw new Error("Client record missing ID");
    }

    // Fetch user achievements
    const { data: earned } = await supabase
      .from("user_achievements")
      .select("*")
      .eq("client_id", client.id)
      .order("earned_at", { ascending: false });

    // Fetch achievement progress
    const { data: progress } = await supabase
      .from("achievement_progress")
      .select("*")
      .eq("client_id", client.id);

    // Fetch today's log
    const todayDate = new Date().toISOString().split("T")[0];
    const { data: log } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("client_id", client.id)
      .eq("log_date", todayDate)
      .maybeSingle();

    // Fetch meal logs
    const { data: meals } = await supabase
      .from("meal_logs")
      .select("*")
      .eq("client_id", client.id)
      .order("logged_at", { ascending: false })
      .limit(20);

    // Calculate today's calories
    const todayMeals = meals?.filter(
      (meal) => meal.logged_at.split("T")[0] === todayDate
    ) || [];
    const totalCalories = todayMeals.reduce((sum, meal) => sum + (meal.kcal || 0), 0);

    return {
      client,
      earned: earned || [],
      progress: progress || [],
      log,
      meals: meals || [],
      todayCalories: totalCalories,
    };
  };

  const { data, isLoading } = useQuery({
    queryKey: ['client-dashboard', user?.id],
    queryFn: fetchClientData,
    enabled: !!user?.id,
  });

  const clientData = data?.client || null;
  const { isSupported: pushSupported, isSubscribed, isLoading: pushLoading, subscribe, unsubscribe } = usePushNotifications(clientData?.id || null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
  }, [user, navigate]);

  useEffect(() => {
    if (data) {
      setTodayLog(data.log);
      setMealLogs(data.meals);
      setTodayCalories(data.todayCalories);
      setUserAchievements(data.earned);
      setAchievementProgress(data.progress);
    }
  }, [data]);

  // Real-time messages subscription
  useEffect(() => {
    if (!clientData?.id) return;

    fetchMessages();
    updateUnreadCount();

    const channel = supabase
      .channel('messages-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `client_id=eq.${clientData.id}`
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages(prev => [...prev, newMsg]);
        setNewMessage(newMsg);
        setUnreadCount(prev => prev + 1);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientData?.id]);

  // Real-time assessment cards subscription
  useEffect(() => {
    if (!clientData?.id) return;

    fetchAssessmentCards();

    const channel = supabase
      .channel('assessment-cards-realtime')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'pending_review_cards',
        filter: `client_id=eq.${clientData.id}`
      }, (payload) => {
        const updatedCard = payload.new;
        if (updatedCard.status === 'sent') {
          setNewCardNotification(updatedCard);
          fetchAssessmentCards();
          toast.success(`New ${updatedCard.card_type.replace('_', ' ')} card received!`);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientData?.id]);

  const fetchAssessmentCards = async () => {
    if (!clientData?.id) return;

    const { data, error } = await supabase
      .from('pending_review_cards')
      .select('*')
      .eq('client_id', clientData.id)
      .eq('status', 'sent')
      .order('sent_at', { ascending: false });

    if (!error && data) {
      setAssessmentCards(data);
    }

    // Fetch actual assessment records for editing
    const { data: assessments, error: assessError } = await supabase
      .from('assessments')
      .select('*')
      .eq('client_id', clientData.id)
      .not('form_responses', 'is', null);

    if (!assessError && assessments) {
      setAssessmentRecords(assessments);
    }
  };

  useEffect(() => {
    const fetchAchievementsData = async () => {
      const { data: allAchievements } = await supabase
        .from("achievements")
        .select("*")
        .eq("is_active", true)
        .order("points", { ascending: false });

      if (allAchievements) {
        setAchievements(allAchievements);
      }
    };
    
    fetchAchievementsData();
  }, []);

  const refetchClientData = () => {
    queryClient.invalidateQueries({ queryKey: ['client-dashboard', user?.id] });
  };

  const fetchMessages = async () => {
    if (!clientData?.id) return;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('client_id', clientData.id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data as Message[]);
    }
  };

  const updateUnreadCount = async () => {
    if (!clientData?.id) return;
    const count = await getUnreadCount(clientData.id);
    setUnreadCount(count);
  };

  const handleMessagesTabOpen = async () => {
    setActiveTab('messages');
    if (clientData?.id) {
      await markMessagesAsRead(clientData.id);
      setUnreadCount(0);
    }
  };

  const fetchClientDataLegacy = async () => {
    // This is kept for compatibility with meal photo upload callbacks
    refetchClientData();
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
    setWaterInput("");
    fetchClientDataLegacy();
    
    // Check for achievements
    if (clientData?.id) {
      checkAchievements(clientData.id, "water_log");
    }
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
    setActivityInput("");
    fetchClientDataLegacy();
    
    // Send automated message
    if (newAmount >= 30) {
      await sendAutomatedMessage(clientData.id, 'activity_milestone_30', {
        name: clientData.name,
        minutes: newAmount
      });
    } else {
      await sendAutomatedMessage(clientData.id, 'activity_logged', {
        name: clientData.name,
        minutes
      });
    }
    
    // Check for achievements
    if (clientData?.id) {
      checkAchievements(clientData.id, "activity_log");
    }
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
      fetchClientDataLegacy();
      
      // Send automated message
      const previousWeight = clientData.last_weight || weight;
      const weightDiff = previousWeight - weight;
      
      if (weightDiff > 0) {
        await sendAutomatedMessage(clientData.id, 'weight_logged_loss', {
          name: clientData.name,
          weight,
          diff: weightDiff.toFixed(1)
        });
      } else if (weightDiff === 0) {
        await sendAutomatedMessage(clientData.id, 'weight_logged_maintain', {
          name: clientData.name,
          weight
        });
      } else {
        await sendAutomatedMessage(clientData.id, 'weight_logged_positive', {
          name: clientData.name,
          weight
        });
      }
      
      // Check for achievements
      checkAchievements(clientData.id, "weight_log");
    } catch (error) {
      console.error("Error logging weight:", error);
      toast.error("Failed to log weight");
    }
  };

  const checkAchievements = async (clientId: string, actionType: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("check-achievements", {
        body: { client_id: clientId, action_type: actionType },
      });

      if (error) {
        console.error("Error checking achievements:", error);
        return;
      }

      if (data?.newAchievements && data.newAchievements.length > 0) {
        setNewAchievements(data.newAchievements);
        // Refresh achievement data
        refetchClientData();
      }

      if (data?.updatedProgress) {
        setAchievementProgress(data.updatedProgress);
      }
    } catch (error) {
      console.error("Error checking achievements:", error);
    }
  };

  const handleNavigateToCalendar = (date: Date) => {
    setActiveTab('calendar');
  };

  if (isLoading) {
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
          <div className="flex items-center gap-2">
            <NotificationBell clientId={clientData?.id} onNavigate={handleNavigateToCalendar} />
            {pushSupported && !isSubscribed && (
              <Button variant="default" onClick={subscribe} disabled={pushLoading} size="sm" className="bg-primary hover:bg-primary/90">
                Enable Notifications
              </Button>
            )}
            <Button variant="outline" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Motivation Card */}
        <MotivationCard />

        {/* Upcoming Meetings Banner */}
        {clientData?.id && (
          <UpcomingMeetingsBanner 
            clientId={clientData.id} 
            onNavigate={handleNavigateToCalendar}
          />
        )}

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
          <div className="tabs-container flex items-center gap-2 flex-wrap p-1 rounded-lg bg-muted/50">
            <TabsList className="flex-1 min-w-0 flex items-center gap-1 flex-wrap bg-transparent">
              <TabsTrigger value="today" className="whitespace-nowrap">Today</TabsTrigger>
              <TabsTrigger value="plan" className="whitespace-nowrap">Plan</TabsTrigger>
              <TabsTrigger value="logs" className="whitespace-nowrap">Meals</TabsTrigger>
              <TabsTrigger value="files" className="whitespace-nowrap">Files</TabsTrigger>
              <TabsTrigger value="achievements" className="whitespace-nowrap">Achievements</TabsTrigger>
              <TabsTrigger value="assessments" className="relative whitespace-nowrap">
                <ClipboardList className="w-4 h-4 mr-1" />
                Assessments
                {assessmentCards.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {assessmentCards.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="reports" className="whitespace-nowrap">Reports</TabsTrigger>
              <TabsTrigger value="messages" className="relative whitespace-nowrap" onClick={handleMessagesTabOpen}>
                Messages
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="calendar" className="whitespace-nowrap">Calendar</TabsTrigger>
              {clientData?.service_type === 'hundred_days' && (
                <TabsTrigger value="progress" className="whitespace-nowrap">100-Day</TabsTrigger>
              )}
            </TabsList>
          </div>

          <TabsContent value="today" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Actions Column */}
              <div className="lg:col-span-2 space-y-6">
                {/* Pending Assessment Requests */}
                {clientData?.id && (
                  <PendingAssessmentRequests
                    clientId={clientData.id}
                    onStartAssessment={(requestId, type) => {
                      setSelectedAssessmentRequest({ requestId, type });
                      setShowAssessmentForm(true);
                    }}
                  />
                )}
                
                <Card className="animate-fade-in">
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Log your daily activities</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Water Quick Add */}
                    <div>
                      <Label className="mb-2 block">Add Water</Label>
                      <div className="flex flex-wrap gap-2 mb-2">
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
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          step="50"
                          min="50"
                          max="2000"
                          placeholder="Custom amount (ml)"
                          value={waterInput}
                          onChange={(e) => setWaterInput(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          variant="default"
                          onClick={() => {
                            const amount = parseInt(waterInput);
                            if (isNaN(amount) || amount < 50 || amount > 2000) {
                              toast.error("Please enter a valid amount (50-2000ml)");
                              return;
                            }
                            quickAddWater(amount);
                          }}
                          className="min-w-[100px]"
                        >
                          <Droplets className="mr-2 h-4 w-4" />
                          Add
                        </Button>
                      </div>
                    </div>

                    {/* Activity Quick Add */}
                    <div>
                      <Label className="mb-2 block">Log Activity</Label>
                      <div className="flex flex-wrap gap-2 mb-2">
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
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          step="5"
                          min="5"
                          max="300"
                          placeholder="Custom minutes"
                          value={activityInput}
                          onChange={(e) => setActivityInput(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          variant="default"
                          onClick={() => {
                            const minutes = parseInt(activityInput);
                            if (isNaN(minutes) || minutes < 5 || minutes > 300) {
                              toast.error("Please enter valid minutes (5-300)");
                              return;
                            }
                            quickAddActivity(minutes);
                          }}
                          className="min-w-[100px]"
                        >
                          <Activity className="mr-2 h-4 w-4" />
                          Log
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

              {/* Weekly Goals & Achievements Column */}
              <div className="space-y-6">
                <WeeklyGoals clientId={clientData?.id} />

                <Card className="animate-fade-in">
                  <CardHeader>
                    <CardTitle>Achievement Progress</CardTitle>
                    <CardDescription>You're almost there!</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AchievementProgress 
                      achievements={achievements}
                      progress={achievementProgress}
                    />
                  </CardContent>
                </Card>

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
                <MealPhotoUpload 
                  clientId={clientData.id} 
                  onSuccess={() => {
                    fetchClientData();
                    checkAchievements(clientData.id, "meal_log");
                  }} 
                />
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
                        const isImage = log.file_type?.startsWith('image/');
                        const FileIcon = getFileIcon(log.file_type);
                        
                        return (
                          <div key={log.id} className="flex gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                            {signedUrl && (
                              <div className="w-24 h-24 flex-shrink-0">
                                {isImage ? (
                                  <img
                                    src={signedUrl}
                                    alt={log.meal_name || "Meal"}
                                    className="w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => handleFileClick(signedUrl, log.file_type, log.meal_name || undefined)}
                                  />
                                ) : (
                                  <div 
                                    className="w-full h-full flex flex-col items-center justify-center bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                                    onClick={() => handleFileClick(signedUrl, log.file_type, log.meal_name || undefined)}
                                  >
                                    <FileIcon className="h-8 w-8 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground mt-1">
                                      {getFileDisplayName(log.file_type)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1 gap-2">
                                <p className="font-semibold capitalize">{log.meal_type.replace("_", " ")}</p>
                                <p className="text-sm text-muted-foreground whitespace-nowrap">
                                  {new Date(log.logged_at).toLocaleString()}
                                </p>
                              </div>
                              {log.meal_name && <p className="text-sm truncate">{log.meal_name}</p>}
                              {log.kcal && <p className="text-sm text-muted-foreground">{log.kcal} kcal</p>}
                              {log.notes && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{log.notes}</p>}
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

          <TabsContent value="achievements">
            <AchievementList
              achievements={achievements}
              earnedAchievements={userAchievements}
              progress={achievementProgress}
            />
          </TabsContent>

          <TabsContent value="assessments">
            <div className="space-y-6">
              {assessmentCards.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <ClipboardList className="w-16 h-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
                    <p className="text-lg mb-2 font-medium">No Assessment Cards Yet</p>
                    <p className="text-sm text-muted-foreground">
                      Your personalized assessment cards will appear here once reviewed and sent by your dietitian
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {assessmentCards.map((card) => {
                    const isNew = card.sent_at && new Date(card.sent_at) > new Date(Date.now() - 24 * 60 * 60 * 1000);
                    
                    return (
                      <div key={card.id} className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              card.card_type === 'health_assessment' ? 'bg-primary/10' :
                              card.card_type === 'stress_card' ? 'bg-purple-500/10' :
                              card.card_type === 'sleep_card' ? 'bg-blue-500/10' :
                              card.card_type === 'action_plan' ? 'bg-orange-500/10' :
                              'bg-green-500/10'
                            }`}>
                              <ClipboardList className={`w-5 h-5 ${
                                card.card_type === 'health_assessment' ? 'text-primary' :
                                card.card_type === 'stress_card' ? 'text-purple-600' :
                                card.card_type === 'sleep_card' ? 'text-blue-600' :
                                card.card_type === 'action_plan' ? 'text-orange-600' :
                                'text-green-600'
                              }`} />
                            </div>
                            <div>
                              <h3 className="font-semibold capitalize flex items-center gap-2">
                                {card.card_type.replace(/_/g, ' ')}
                                {isNew && <Badge variant="default" className="text-xs">NEW</Badge>}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                Sent {new Date(card.sent_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Render the appropriate card view */}
                        {card.card_type === 'health_assessment' && (
                          <HealthAssessmentCardView 
                            data={card.generated_content} 
                            assessmentId={assessmentRecords.find(a => a.assessment_type === 'health' && a.client_id === clientData?.id)?.id}
                          />
                        )}
                        {card.card_type === 'stress_card' && (
                          <StressCardView 
                            data={card.generated_content} 
                            assessmentId={assessmentRecords.find(a => a.assessment_type === 'stress' && a.client_id === clientData?.id)?.id}
                          />
                        )}
                        {card.card_type === 'sleep_card' && (
                          <SleepCardView 
                            data={card.generated_content} 
                            assessmentId={assessmentRecords.find(a => a.assessment_type === 'sleep' && a.client_id === clientData?.id)?.id}
                          />
                        )}
                        {card.card_type === 'action_plan' && (
                          <ActionPlanCardView data={card.generated_content} />
                        )}
                        {card.card_type === 'diet_plan' && (
                          <DietPlanCardView data={card.generated_content} />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
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

          <TabsContent value="messages" className="h-[600px] flex flex-col">
            <Card className="flex-1 flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Messages
                </CardTitle>
                <CardDescription>Chat with your nutritionist and receive updates</CardDescription>
              </CardHeader>
              <MessageFeed 
                messages={messages} 
                currentUserType="client"
                onStartAssessment={(requestId, type) => {
                  setSelectedAssessmentRequest({ requestId, type });
                  setShowAssessmentForm(true);
                }}
              />
              {clientData && user && (
                <MessageComposer
                  clientId={clientData.id}
                  senderId={user.id}
                  senderType="client"
                  onMessageSent={fetchMessages}
                />
              )}
            </Card>
          </TabsContent>

          <TabsContent value="calendar">
            {clientData?.id && <CalendarView clientId={clientData.id} />}
          </TabsContent>

          {clientData?.service_type === 'hundred_days' && (
            <TabsContent value="progress">
              {clientData?.id && <HundredDayProgress clientId={clientData.id} />}
            </TabsContent>
          )}
        </Tabs>
        
        {/* Achievement Notifications */}
        <AchievementNotification
          newAchievements={newAchievements}
          onDismiss={() => setNewAchievements([])}
        />

        {/* Message Notification */}
        <MessageNotification
          message={newMessage}
          onClose={() => setNewMessage(null)}
          onOpen={handleMessagesTabOpen}
        />

        {/* Assessment Form Dialog */}
        <Dialog open={showAssessmentForm} onOpenChange={setShowAssessmentForm}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedAssessmentRequest?.type === 'health_assessment' && clientData && (
              <ClientHealthAssessmentForm 
                requestId={selectedAssessmentRequest.requestId}
                clientId={clientData.id}
                clientName={clientData.name}
                onComplete={() => {
                  setShowAssessmentForm(false);
                  toast.success('Assessment submitted! Your results will be ready shortly.');
                }}
              />
            )}
            {selectedAssessmentRequest?.type === 'stress_assessment' && clientData && (
              <ClientStressAssessmentForm 
                requestId={selectedAssessmentRequest.requestId}
                clientId={clientData.id}
                clientName={clientData.name}
                onComplete={() => {
                  setShowAssessmentForm(false);
                  toast.success('Assessment submitted! Your results will be ready shortly.');
                }}
              />
            )}
            {selectedAssessmentRequest?.type === 'sleep_assessment' && clientData && (
              <ClientSleepAssessmentForm 
                requestId={selectedAssessmentRequest.requestId}
                clientId={clientData.id}
                clientName={clientData.name}
                onComplete={() => {
                  setShowAssessmentForm(false);
                  toast.success('Assessment submitted! Your results will be ready shortly.');
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}