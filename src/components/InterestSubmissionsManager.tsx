import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Mail, Phone, User, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/formatters";


interface InterestSubmission {
  id: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  email: string;
  health_goal: string;
  message?: string;
  created_at: string;
  status: string;
}

const healthGoalLabels: Record<string, string> = {
  weight_loss: "Weight Loss",
  muscle_gain: "Muscle Gain",
  diabetes: "Diabetes Management",
  pcos: "PCOS Management",
  lifestyle_correction: "Lifestyle Correction",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
  contacted: "bg-blue-100 text-blue-800 border-blue-300",
  converted: "bg-green-100 text-green-800 border-green-300",
  not_interested: "bg-gray-100 text-gray-800 border-gray-300",
};

export function InterestSubmissionsManager() {
  const [submissions, setSubmissions] = useState<InterestSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterHealthGoal, setFilterHealthGoal] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("interest_forms" as any)
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSubmissions((data as unknown as InterestSubmission[]) || []);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      toast.error("Failed to load submissions");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("interest_forms" as any)
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      toast.success("Status updated successfully");
      fetchSubmissions();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };



  const filteredSubmissions = submissions.filter((sub) => {
    let matchesStatus = true;
    let matchesHealthGoal = true;

    if (filterStatus !== "all") {
      matchesStatus = sub.status === filterStatus;
    }

    if (filterHealthGoal !== "all") {
      matchesHealthGoal = sub.health_goal === filterHealthGoal;
    }

    return matchesStatus && matchesHealthGoal;
  });

  const stats = {
    total: submissions.length,
    pending: submissions.filter((s) => s.status === "pending").length,
    contacted: submissions.filter((s) => s.status === "contacted").length,
    converted: submissions.filter((s) => s.status === "converted").length,
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Interest Form Submissions</CardTitle>
          <CardDescription>Loading submissions...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card
          className={`cursor-pointer transition-colors hover:bg-muted/50 ${filterStatus === "all" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setFilterStatus("all")}
        >
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Submissions</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-colors hover:bg-yellow-50 ${filterStatus === "pending" ? "ring-2 ring-yellow-500 bg-yellow-50" : ""}`}
          onClick={() => setFilterStatus("pending")}
        >
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-colors hover:bg-blue-50 ${filterStatus === "contacted" ? "ring-2 ring-blue-500 bg-blue-50" : ""}`}
          onClick={() => setFilterStatus("contacted")}
        >
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{stats.contacted}</div>
            <p className="text-xs text-muted-foreground">Contacted</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-colors hover:bg-green-50 ${filterStatus === "converted" ? "ring-2 ring-green-500 bg-green-50" : ""}`}
          onClick={() => setFilterStatus("converted")}
        >
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.converted}</div>
            <p className="text-xs text-muted-foreground">Converted</p>
          </CardContent>
        </Card>
      </div>

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Interest Form Submissions</CardTitle>
              <CardDescription>Manage leads from the interest form</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={filterHealthGoal} onValueChange={setFilterHealthGoal}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Health Goals" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Health Goals</SelectItem>
                  {Object.entries(healthGoalLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                  <SelectItem value="not_interested">Not Interested</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredSubmissions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No submissions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <div className="overflow-hidden border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Age/Gender</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Health Goal</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubmissions.map((submission) => (
                        <TableRow key={submission.id}>
                          <TableCell className="font-medium">{submission.name}</TableCell>
                          <TableCell>
                            {submission.age} / {submission.gender}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 text-sm">
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs">{submission.phone}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs">{submission.email}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {healthGoalLabels[submission.health_goal] || submission.health_goal}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground line-clamp-2 max-w-[200px]" title={submission.message}>
                              {submission.message || "-"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {formatDate(submission.created_at)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColors[submission.status]}>
                              {submission.status.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Select
                                value={submission.status}
                                onValueChange={(value) => updateStatus(submission.id, value)}
                              >
                                <SelectTrigger className="w-[140px] h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="contacted">Contacted</SelectItem>
                                  <SelectItem value="converted">Converted</SelectItem>
                                  <SelectItem value="not_interested">Not Interested</SelectItem>
                                </SelectContent>
                              </Select>

                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
