import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Leaf, 
  Users, 
  Activity, 
  FileText, 
  LogOut,
  Eye,
  TrendingUp,
  Calendar
} from "lucide-react";
import { FoodItemsManager } from "@/components/FoodItemsManager";
import { IngredientsManager } from "@/components/IngredientsManager";
import { RecipeBuilder } from "@/components/RecipeBuilder";
import { AdminClientEditor } from "@/components/AdminClientEditor";
import { InterestSubmissionsManager } from "@/components/InterestSubmissionsManager";
import { BulkMessageButton } from "@/components/BulkMessageButton";
import { CronJobsManager } from "@/components/CronJobsManager";
import { WorkflowStatusWidget } from "@/components/WorkflowStatusWidget";
import { PendingReviewDashboard } from "@/components/PendingReviewDashboard";
import { HealthAssessmentCardEditor } from "@/components/HealthAssessmentCardEditor";
import { StressCardEditor } from "@/components/StressCardEditor";
import { SleepCardEditor } from "@/components/SleepCardEditor";
import { formatServiceType, getServiceTypeBadgeColor } from "@/lib/formatters";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, userRole, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [reviewCardId, setReviewCardId] = useState<string | null>(null);
  const [reviewCardType, setReviewCardType] = useState<string | null>(null);

  useEffect(() => {
    if (!user || userRole !== "admin") {
      navigate("/auth");
      return;
    }
  }, [user, userRole, navigate]);

  const fetchDashboardData = async () => {
    // Fetch only clients (exclude admins)
    // First get all admin user_ids
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    const adminUserIds = adminRoles?.map((r) => r.user_id) || [];

    // Fetch clients excluding admins
    let query = supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });

    // Exclude admin user_ids if any exist
    if (adminUserIds.length > 0) {
      query = query.not("user_id", "in", `(${adminUserIds.join(",")})`);
    }

    const { data: clientsData, error: clientsError } = await query;

    if (clientsError) throw clientsError;

    // Calculate stats
    const activeClients = clientsData?.filter((c) => c.status === "active").length || 0;
    const pendingClients = clientsData?.filter((c) => c.status === "pending").length || 0;

    // Fetch today's logs count
    const today = new Date().toISOString().split("T")[0];
    const { count } = await supabase
      .from("daily_logs")
      .select("*", { count: "exact", head: true })
      .eq("log_date", today);

    return {
      clients: clientsData || [],
      stats: {
        totalClients: clientsData?.length || 0,
        activeClients,
        pendingClients,
        todayLogs: count || 0,
      }
    };
  };

  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: fetchDashboardData,
    enabled: !!user && userRole === "admin",
  });

  const clients = data?.clients || [];
  const stats = data?.stats || {
    totalClients: 0,
    activeClients: 0,
    pendingClients: 0,
    todayLogs: 0,
  };

  const refetchDashboard = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-wellness-green/20 text-wellness-green";
      case "inactive":
        return "bg-muted text-muted-foreground";
      case "pending":
        return "bg-wellness-amber/20 text-amber-900";
      default:
        return "bg-muted text-muted-foreground";
    }
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
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">Manage your clients and programs</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => window.open('/community', '_blank')}
            >
              <Users className="mr-2 h-4 w-4" />
              Community
            </Button>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="relative overflow-hidden group card-hover border-l-4 border-l-wellness-green animate-fade-in">
            <div className="absolute inset-0 bg-gradient-to-br from-wellness-green/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <div className="p-2 bg-wellness-light rounded-lg">
                <Users className="h-5 w-5 text-wellness-green" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gradient-primary">{stats.totalClients}</div>
              <p className="text-xs text-muted-foreground mt-1">All registered clients</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group card-hover border-l-4 border-l-wellness-mint animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-wellness-mint/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.activeClients}</div>
              <p className="text-xs text-muted-foreground mt-1">Currently active programs</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group card-hover border-l-4 border-l-wellness-amber animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-wellness-amber/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <div className="p-2 bg-amber-100 rounded-lg">
                <FileText className="h-5 w-5 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">{stats.pendingClients}</div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting attention</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group card-hover border-l-4 border-l-blue-500 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Today's Logs</CardTitle>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats.todayLogs}</div>
              <p className="text-xs text-muted-foreground mt-1">Daily tracking updates</p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-8">
          <WorkflowStatusWidget />
        </div>

        <div className="mb-8">
          <PendingReviewDashboard 
            onReviewCard={(cardId, cardType) => {
              setReviewCardId(cardId);
              setReviewCardType(cardType);
            }}
          />
        </div>

        {/* Main Content */}
        <Tabs defaultValue="clients" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
            <TabsTrigger value="food">Food Items</TabsTrigger>
            <TabsTrigger value="recipes">Recipes</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="automation">Automation</TabsTrigger>
          </TabsList>

          <TabsContent value="clients">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>All Clients</CardTitle>
                  <CardDescription>Manage your client roster</CardDescription>
                </div>
                <div className="flex gap-2">
                  <BulkMessageButton clients={clients} onSuccess={refetchDashboard} />
                  <Button
                    onClick={() => {
                      setEditingClientId(null);
                      setEditorOpen(true);
                    }}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    New Client
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {clients.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground animate-fade-in">
                    <div className="p-6 bg-wellness-light rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                      <Users className="w-12 h-12 text-wellness-green/40" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-foreground">No clients yet</h3>
                    <p className="text-sm mb-6">New clients will appear here once they sign up</p>
                    <Button variant="outline" className="interactive-button" onClick={() => setEditorOpen(true)}>
                      <Users className="mr-2 h-4 w-4" />
                      Add Your First Client
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {clients.map((client, index) => (
                      <Card 
                        key={client.id} 
                        className="relative overflow-hidden group card-hover border-l-4 border-l-transparent hover:border-l-wellness-green transition-all animate-fade-in"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-wellness-light/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <CardContent className="p-6 relative">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-wellness-green to-wellness-mint rounded-full flex items-center justify-center text-white font-semibold shadow-md">
                                  {client.name.charAt(0)}
                                </div>
                                <div>
                                  <h3 className="font-semibold text-lg flex items-center gap-2">
                                    {client.name}
                                    <Badge className={getStatusColor(client.status)} variant="outline">
                                      {client.status}
                                    </Badge>
                                  </h3>
                                  <p className="text-sm text-muted-foreground">{client.email}</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <span>📱</span>
                                  <span>{client.phone}</span>
                                </div>
                                <div>
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${getServiceTypeBadgeColor(client.service_type)}`}>
                                    {formatServiceType(client.service_type)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <span>🎯</span>
                                  <span className="capitalize">{client.program_type?.replace("_", " ")}</span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <span>⚖️</span>
                                  <span>{client.last_weight ? `${client.last_weight} kg` : "Not set"}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button
                                variant="outline"
                                size="sm"
                                className="interactive-button"
                                onClick={() => {
                                  setEditingClientId(client.id);
                                  setEditorOpen(true);
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="interactive-button group/btn"
                                onClick={() => navigate(`/admin/client/${client.id}`)}
                              >
                                <Eye className="mr-2 h-4 w-4 transition-transform group-hover/btn:scale-110" />
                                View
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leads">
            <InterestSubmissionsManager />
          </TabsContent>

          <TabsContent value="ingredients">
            <IngredientsManager />
          </TabsContent>

          <TabsContent value="food">
            <FoodItemsManager />
          </TabsContent>

          <TabsContent value="recipes">
            <RecipeBuilder />
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Reports</CardTitle>
                <CardDescription>Generated reports for all clients</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">No reports generated yet</p>
                  <p className="text-sm">Reports will appear here once you generate them</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="automation">
            <CronJobsManager />
          </TabsContent>
        </Tabs>

        <AdminClientEditor
          clientId={editingClientId}
          open={editorOpen}
          onOpenChange={(open) => {
            setEditorOpen(open);
            if (!open) setEditingClientId(null);
          }}
          onSuccess={refetchDashboard}
        />

        {reviewCardId && reviewCardType === 'health_assessment' && (
          <HealthAssessmentCardEditor
            cardId={reviewCardId}
            open={!!reviewCardId}
            onOpenChange={(open) => {
              if (!open) {
                setReviewCardId(null);
                setReviewCardType(null);
              }
            }}
            onSave={() => queryClient.invalidateQueries({ queryKey: ['pending-review-cards'] })}
          />
        )}

        {reviewCardId && reviewCardType === 'stress_card' && (
          <StressCardEditor
            cardId={reviewCardId}
            open={!!reviewCardId}
            onOpenChange={(open) => {
              if (!open) {
                setReviewCardId(null);
                setReviewCardType(null);
              }
            }}
            onSave={() => queryClient.invalidateQueries({ queryKey: ['pending-review-cards'] })}
          />
        )}

        {reviewCardId && reviewCardType === 'sleep_card' && (
          <SleepCardEditor
            cardId={reviewCardId}
            open={!!reviewCardId}
            onOpenChange={(open) => {
              if (!open) {
                setReviewCardId(null);
                setReviewCardType(null);
              }
            }}
            onSave={() => queryClient.invalidateQueries({ queryKey: ['pending-review-cards'] })}
          />
        )}
      </div>
    </div>
  );
}