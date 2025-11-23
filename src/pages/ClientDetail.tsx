import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Phone, Mail, Target, Weight, Calendar } from "lucide-react";
import { toast } from "sonner";

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  age: number | null;
  gender: string | null;
  goals: string | null;
  program_type: string | null;
  status: string | null;
  target_kcal: number | null;
  last_weight: number | null;
  created_at: string;
}

interface Assessment {
  id: string;
  file_name: string | null;
  file_url: string | null;
  notes: string | null;
  created_at: string;
}

interface WeeklyPlan {
  id: string;
  week_number: number;
  start_date: string;
  end_date: string;
  status: string | null;
  total_kcal: number | null;
  pdf_url: string | null;
  published_at: string | null;
}

interface DailyLog {
  id: string;
  log_date: string;
  weight: number | null;
  water_intake: number | null;
  activity_minutes: number | null;
  notes: string | null;
}

interface FileRecord {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

interface WeeklyReport {
  id: string;
  week_number: number;
  start_date: string;
  end_date: string;
  summary: string | null;
  pdf_url: string | null;
  audio_url: string | null;
  created_at: string;
}

const ClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<Client | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [plans, setPlans] = useState<WeeklyPlan[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [reports, setReports] = useState<WeeklyReport[]>([]);

  useEffect(() => {
    if (userRole !== "admin") {
      navigate("/auth");
      return;
    }
    
    if (!id) {
      toast.error("Invalid client ID");
      navigate("/admin");
      return;
    }

    fetchClientData();
  }, [id, userRole, navigate]);

  const fetchClientData = async () => {
    try {
      setLoading(true);

      // Fetch client details
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .single();

      if (clientError) throw clientError;
      setClient(clientData);

      // Fetch assessments
      const { data: assessmentsData } = await supabase
        .from("assessments")
        .select("*")
        .eq("client_id", id)
        .order("created_at", { ascending: false });
      setAssessments(assessmentsData || []);

      // Fetch weekly plans
      const { data: plansData } = await supabase
        .from("weekly_plans")
        .select("*")
        .eq("client_id", id)
        .order("week_number", { ascending: false });
      setPlans(plansData || []);

      // Fetch daily logs
      const { data: logsData } = await supabase
        .from("daily_logs")
        .select("*")
        .eq("client_id", id)
        .order("log_date", { ascending: false })
        .limit(30);
      setDailyLogs(logsData || []);

      // Fetch files
      const { data: filesData } = await supabase
        .from("files")
        .select("*")
        .eq("client_id", id)
        .order("created_at", { ascending: false });
      setFiles(filesData || []);

      // Fetch reports
      const { data: reportsData } = await supabase
        .from("weekly_reports")
        .select("*")
        .eq("client_id", id)
        .order("week_number", { ascending: false });
      setReports(reportsData || []);

    } catch (error: any) {
      toast.error(error.message || "Failed to load client data");
      navigate("/admin");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Skeleton className="h-10 w-64 mb-6" />
        <Skeleton className="h-48 w-full mb-6" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="text-center">
          <p className="text-muted-foreground">Client not found</p>
          <Button onClick={() => navigate("/admin")} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/admin")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        {/* Client Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-3xl">{client.name}</CardTitle>
                <CardDescription className="mt-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {client.email}
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {client.phone}
                  </div>
                </CardDescription>
              </div>
              <Badge className={getStatusColor(client.status)}>
                {client.status || "N/A"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Target Kcal</p>
                  <p className="font-semibold">{client.target_kcal || "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Weight className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Last Weight</p>
                  <p className="font-semibold">{client.last_weight ? `${client.last_weight} kg` : "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Age</p>
                  <p className="font-semibold">{client.age || "—"}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Program</p>
                <p className="font-semibold capitalize">{client.program_type?.replace("_", " ") || "—"}</p>
              </div>
            </div>
            {client.goals && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-1">Goals</p>
                <p>{client.goals}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabbed Interface */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="assessments">Assessments ({assessments.length})</TabsTrigger>
            <TabsTrigger value="plans">Plans ({plans.length})</TabsTrigger>
            <TabsTrigger value="logs">Daily Logs ({dailyLogs.length})</TabsTrigger>
            <TabsTrigger value="files">Files ({files.length})</TabsTrigger>
            <TabsTrigger value="reports">Reports ({reports.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Client Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">Recent Activity</p>
                    <p className="text-sm text-muted-foreground">
                      {dailyLogs.length > 0 
                        ? `Last log: ${new Date(dailyLogs[0].log_date).toLocaleDateString()}`
                        : "No logs yet"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Active Plans</p>
                    <p className="text-sm text-muted-foreground">
                      {plans.filter(p => p.status === "published").length} published plan(s)
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Total Assessments</p>
                    <p className="text-sm text-muted-foreground">{assessments.length} assessment(s)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assessments">
            <Card>
              <CardHeader>
                <CardTitle>Assessments</CardTitle>
                <CardDescription>View and manage client assessments</CardDescription>
              </CardHeader>
              <CardContent>
                {assessments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No assessments yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File Name</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assessments.map((assessment) => (
                        <TableRow key={assessment.id}>
                          <TableCell>{assessment.file_name || "—"}</TableCell>
                          <TableCell className="max-w-xs truncate">{assessment.notes || "—"}</TableCell>
                          <TableCell>{new Date(assessment.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            {assessment.file_url && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={assessment.file_url} target="_blank" rel="noopener noreferrer">
                                  View
                                </a>
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="plans">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Plans</CardTitle>
                <CardDescription>Manage client meal plans</CardDescription>
              </CardHeader>
              <CardContent>
                {plans.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No plans yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Week</TableHead>
                        <TableHead>Date Range</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Total Kcal</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plans.map((plan) => (
                        <TableRow key={plan.id}>
                          <TableCell>Week {plan.week_number}</TableCell>
                          <TableCell>
                            {new Date(plan.start_date).toLocaleDateString()} - {new Date(plan.end_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant={plan.status === "published" ? "default" : "secondary"}>
                              {plan.status || "draft"}
                            </Badge>
                          </TableCell>
                          <TableCell>{plan.total_kcal || "—"}</TableCell>
                          <TableCell>
                            {plan.pdf_url && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={plan.pdf_url} target="_blank" rel="noopener noreferrer">
                                  View PDF
                                </a>
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Daily Logs</CardTitle>
                <CardDescription>Track daily progress and activities</CardDescription>
              </CardHeader>
              <CardContent>
                {dailyLogs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No logs yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Weight (kg)</TableHead>
                        <TableHead>Water (ml)</TableHead>
                        <TableHead>Activity (min)</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dailyLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>{new Date(log.log_date).toLocaleDateString()}</TableCell>
                          <TableCell>{log.weight || "—"}</TableCell>
                          <TableCell>{log.water_intake || "—"}</TableCell>
                          <TableCell>{log.activity_minutes || "—"}</TableCell>
                          <TableCell className="max-w-xs truncate">{log.notes || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="files">
            <Card>
              <CardHeader>
                <CardTitle>Files</CardTitle>
                <CardDescription>Uploaded documents and media</CardDescription>
              </CardHeader>
              <CardContent>
                {files.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No files yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Uploaded</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {files.map((file) => (
                        <TableRow key={file.id}>
                          <TableCell>{file.file_name}</TableCell>
                          <TableCell>{file.file_type || "—"}</TableCell>
                          <TableCell>{file.file_size ? `${(file.file_size / 1024).toFixed(2)} KB` : "—"}</TableCell>
                          <TableCell>{new Date(file.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm" asChild>
                              <a href={file.file_url} target="_blank" rel="noopener noreferrer">
                                View
                              </a>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Reports</CardTitle>
                <CardDescription>Generated progress reports</CardDescription>
              </CardHeader>
              <CardContent>
                {reports.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No reports yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Week</TableHead>
                        <TableHead>Date Range</TableHead>
                        <TableHead>Summary</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell>Week {report.week_number}</TableCell>
                          <TableCell>
                            {new Date(report.start_date).toLocaleDateString()} - {new Date(report.end_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{report.summary || "—"}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {report.pdf_url && (
                                <Button variant="outline" size="sm" asChild>
                                  <a href={report.pdf_url} target="_blank" rel="noopener noreferrer">
                                    PDF
                                  </a>
                                </Button>
                              )}
                              {report.audio_url && (
                                <Button variant="outline" size="sm" asChild>
                                  <a href={report.audio_url} target="_blank" rel="noopener noreferrer">
                                    Audio
                                  </a>
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ClientDetail;
