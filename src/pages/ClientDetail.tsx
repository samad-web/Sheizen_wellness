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
import { ArrowLeft, Phone, Mail, Target, Weight, Calendar, Trash2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { AssessmentUploadDialog } from "@/components/AssessmentUploadDialog";
import { WeeklyPlanEditor } from "@/components/WeeklyPlanEditor";
import { ProgressCharts } from "@/components/ProgressCharts";
import { formatServiceType, getServiceTypeBadgeColor } from "@/lib/formatters";
import { GroceryListGenerator } from "@/components/GroceryListGenerator";
import { getSignedUrl } from "@/lib/storage";
import { MealPhotoDisplay } from "@/components/MealPhotoDisplay";
import { MessageFeed } from "@/components/MessageFeed";
import { MessageComposer } from "@/components/MessageComposer";
import { type Message } from "@/lib/messages";
import { CalendarView } from "@/components/CalendarView";
import { HundredDayProgress } from "@/components/HundredDayProgress";
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

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  age: number | null;
  gender: string | null;
  goals: string | null;
  program_type: string | null;
  service_type: string | null;
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

interface MealLog {
  id: string;
  meal_type: string;
  meal_name: string | null;
  photo_url: string | null;
  kcal: number | null;
  notes: string | null;
  logged_at: string;
}

const ClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userRole, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<Client | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [plans, setPlans] = useState<WeeklyPlan[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [mealLogs, setMealLogs] = useState<MealLog[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [deleteAssessmentId, setDeleteAssessmentId] = useState<string | null>(null);
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null);

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

      // Fetch meal logs with photos
      const { data: mealLogsData } = await supabase
        .from("meal_logs")
        .select("*")
        .eq("client_id", id)
        .not("photo_url", "is", null)
        .order("logged_at", { ascending: false })
        .limit(50);
      setMealLogs(mealLogsData || []);

      // Fetch messages
      const { data: messagesData } = await supabase
        .from("messages")
        .select("*")
        .eq("client_id", id)
        .order("created_at", { ascending: true });
      setMessages((messagesData as Message[]) || []);

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

  const handleDeleteAssessment = async (assessmentId: string, fileUrl: string | null) => {
    try {
      if (fileUrl) {
        const urlParts = fileUrl.split("/");
        const filePath = urlParts.slice(-2).join("/");
        await supabase.storage.from("assessment-files").remove([filePath]);
      }

      const { error } = await supabase
        .from("assessments")
        .delete()
        .eq("id", assessmentId);

      if (error) throw error;

      toast.success("Assessment deleted successfully!");
      fetchClientData();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete assessment");
    } finally {
      setDeleteAssessmentId(null);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    try {
      const { error } = await supabase
        .from("weekly_plans")
        .delete()
        .eq("id", planId);

      if (error) throw error;

      toast.success("Plan deleted successfully!");
      fetchClientData();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete plan");
    } finally {
      setDeletePlanId(null);
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
            {client.service_type && (
              <div className="mb-4 pb-4 border-b">
                <p className="text-sm text-muted-foreground mb-2">Service Type</p>
                <span className={`inline-flex items-center px-3 py-1 rounded-md text-sm border ${getServiceTypeBadgeColor(client.service_type)}`}>
                  {formatServiceType(client.service_type)}
                </span>
              </div>
            )}
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
            <TabsTrigger value="messages">Messages ({messages.length})</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            {client?.service_type === 'hundred_days' && (
              <TabsTrigger value="progress">100-Day Progress</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {dailyLogs.length > 0 
                      ? new Date(dailyLogs[0].log_date).toLocaleDateString()
                      : "No logs"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Last log date</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {plans.filter(p => p.status === "published").length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Published plans</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Assessments</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{assessments.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">Assessment files</p>
                </CardContent>
              </Card>
            </div>

            <ProgressCharts clientId={id!} daysToShow={30} />
          </TabsContent>

          <TabsContent value="assessments">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Assessments</CardTitle>
                  <CardDescription>View and manage client assessments</CardDescription>
                </div>
                <AssessmentUploadDialog clientId={id!} onSuccess={fetchClientData} />
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
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assessments.map((assessment) => (
                        <TableRow key={assessment.id}>
                          <TableCell>{assessment.file_name || "—"}</TableCell>
                          <TableCell className="max-w-xs truncate">{assessment.notes || "—"}</TableCell>
                          <TableCell>{new Date(assessment.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right space-x-2">
                            {assessment.file_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const signedUrl = await getSignedUrl("assessment-files", assessment.file_url);
                                    window.open(signedUrl, "_blank");
                                  } catch (error) {
                                    toast.error("Failed to open assessment file");
                                  }
                                }}
                              >
                                View
                              </Button>
                            )}
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setDeleteAssessmentId(assessment.id)}
                            >
                              <Trash2 className="h-4 w-4" />
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

          <TabsContent value="plans">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Weekly Plans</CardTitle>
                  <CardDescription>Manage client meal plans</CardDescription>
                </div>
                <WeeklyPlanEditor clientId={id!} onSuccess={fetchClientData} />
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
                        <TableHead className="text-right">Actions</TableHead>
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
                          <TableCell className="text-right space-x-2">
                            <WeeklyPlanEditor clientId={id!} planId={plan.id} onSuccess={fetchClientData} />
                            <GroceryListGenerator
                              planId={plan.id}
                              weekNumber={plan.week_number}
                              startDate={plan.start_date}
                              endDate={plan.end_date}
                            />
                            {plan.pdf_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const signedUrl = await getSignedUrl("weekly-plan-pdfs", plan.pdf_url);
                                    window.open(signedUrl, "_blank");
                                  } catch (error) {
                                    toast.error("Failed to open plan PDF");
                                  }
                                }}
                              >
                                View PDF
                              </Button>
                            )}
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setDeletePlanId(plan.id)}
                            >
                              <Trash2 className="h-4 w-4" />
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

          <TabsContent value="logs">
            <div className="space-y-6">
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

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Meal Photos
                  </CardTitle>
                  <CardDescription>View client meal photos and logs</CardDescription>
                </CardHeader>
                <CardContent>
                  {mealLogs.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No meal photos yet</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {mealLogs.map((log) => (
                        <div key={log.id} className="space-y-2">
                          <MealPhotoDisplay photoPath={log.photo_url} mealName={log.meal_name} />
                          <div className="text-sm">
                            <p className="font-medium capitalize">{log.meal_type.replace("_", " ")}</p>
                            {log.meal_name && <p className="text-muted-foreground">{log.meal_name}</p>}
                            {log.kcal && <p className="text-muted-foreground">{log.kcal} kcal</p>}
                            <p className="text-xs text-muted-foreground">
                              {new Date(log.logged_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
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
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  const signedUrl = await getSignedUrl("client-files", file.file_url);
                                  window.open(signedUrl, "_blank");
                                } catch (error) {
                                  toast.error("Failed to open file");
                                }
                              }}
                            >
                              View
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

          <TabsContent value="messages" className="space-y-6">
            <Card className="h-[600px] flex flex-col">
              <CardHeader>
                <CardTitle>Messages</CardTitle>
                <CardDescription>Communication with {client.name}</CardDescription>
              </CardHeader>
              <MessageFeed messages={messages} currentUserType="admin" />
              {user && id && (
                <MessageComposer
                  clientId={id}
                  senderId={user.id}
                  senderType="admin"
                  onMessageSent={fetchClientData}
                />
              )}
            </Card>
          </TabsContent>

          <TabsContent value="calendar">
            {id && <CalendarView clientId={id} />}
          </TabsContent>

          {client?.service_type === 'hundred_days' && (
            <TabsContent value="progress">
              {id && <HundredDayProgress clientId={id} />}
            </TabsContent>
          )}
        </Tabs>
      </div>

      <AlertDialog open={!!deleteAssessmentId} onOpenChange={() => setDeleteAssessmentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assessment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this assessment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const assessment = assessments.find(a => a.id === deleteAssessmentId);
                if (assessment) handleDeleteAssessment(assessment.id, assessment.file_url);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletePlanId} onOpenChange={() => setDeletePlanId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this plan? All associated meal cards will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletePlanId) handleDeletePlan(deletePlanId);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ClientDetail;
