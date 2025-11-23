import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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
  TrendingUp
} from "lucide-react";
import { FoodItemsManager } from "@/components/FoodItemsManager";
import { RecipeBuilder } from "@/components/RecipeBuilder";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, userRole, signOut } = useAuth();
  const [stats, setStats] = useState({
    totalClients: 0,
    activeClients: 0,
    pendingClients: 0,
    todayLogs: 0,
  });
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || userRole !== "admin") {
      navigate("/auth");
      return;
    }

    fetchDashboardData();
  }, [user, userRole, navigate]);

  const fetchDashboardData = async () => {
    setLoading(true);

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

    if (!clientsError && clientsData) {
      setClients(clientsData);

      // Calculate stats
      const activeClients = clientsData.filter((c) => c.status === "active").length;
      const pendingClients = clientsData.filter((c) => c.status === "pending").length;

      setStats({
        totalClients: clientsData.length,
        activeClients,
        pendingClients,
        todayLogs: 0, // Will be calculated from daily_logs
      });
    }

    // Fetch today's logs count
    const today = new Date().toISOString().split("T")[0];
    const { count } = await supabase
      .from("daily_logs")
      .select("*", { count: "exact", head: true })
      .eq("log_date", today);

    setStats((prev) => ({ ...prev, todayLogs: count || 0 }));

    setLoading(false);
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
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">Manage your clients and programs</p>
            </div>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalClients}</div>
              <p className="text-xs text-muted-foreground">All registered clients</p>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeClients}</div>
              <p className="text-xs text-muted-foreground">Currently active programs</p>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingClients}</div>
              <p className="text-xs text-muted-foreground">Awaiting attention</p>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Today's Logs</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayLogs}</div>
              <p className="text-xs text-muted-foreground">Daily tracking updates</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="clients" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="food">Food Items</TabsTrigger>
            <TabsTrigger value="recipes">Recipes</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="clients">
            <Card>
              <CardHeader>
                <CardTitle>All Clients</CardTitle>
                <CardDescription>Manage your client roster</CardDescription>
              </CardHeader>
              <CardContent>
                {clients.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg mb-2">No clients yet</p>
                    <p className="text-sm">New clients will appear here once they sign up</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {clients.map((client) => (
                      <Card key={client.id} className="card-hover">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-semibold text-lg">{client.name}</h3>
                                <Badge className={getStatusColor(client.status)}>
                                  {client.status}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground">
                                <div>📧 {client.email}</div>
                                <div>📱 {client.phone}</div>
                                <div>🎯 {client.program_type?.replace("_", " ")}</div>
                                <div>⚖️ {client.last_weight ? `${client.last_weight} kg` : "Not set"}</div>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/admin/client/${client.id}`)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
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
        </Tabs>
      </div>
    </div>
  );
}