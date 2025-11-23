import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PlayCircle, StopCircle, RefreshCw, Calendar, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CronJob {
  id: string;
  job_name: string;
  description: string;
  schedule: string;
  edge_function_name: string;
  is_active: boolean;
  last_run_at: string | null;
  last_run_status: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export function CronJobsManager() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggeringJob, setTriggeringJob] = useState<string | null>(null);

  useEffect(() => {
    loadJobs();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('cron-job-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cron_job_metadata'
        },
        () => {
          loadJobs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('cron_job_metadata')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error loading cron jobs:', error);
      toast.error('Failed to load cron jobs');
    } finally {
      setLoading(false);
    }
  };

  const toggleJobActive = async (jobId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('cron_job_metadata')
        .update({ is_active: !currentStatus })
        .eq('id', jobId);

      if (error) throw error;
      
      toast.success(`Job ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error toggling job status:', error);
      toast.error('Failed to update job status');
    }
  };

  const manualTrigger = async (job: CronJob) => {
    setTriggeringJob(job.id);
    try {
      const { error } = await supabase.functions.invoke(job.edge_function_name, {
        body: { manual_trigger: true }
      });

      if (error) throw error;

      // Update last run status
      await supabase
        .from('cron_job_metadata')
        .update({
          last_run_at: new Date().toISOString(),
          last_run_status: 'success'
        })
        .eq('id', job.id);

      toast.success(`Job "${job.job_name}" triggered successfully`);
    } catch (error) {
      console.error('Error triggering job:', error);
      
      // Update last run status as failed
      await supabase
        .from('cron_job_metadata')
        .update({
          last_run_at: new Date().toISOString(),
          last_run_status: 'failed'
        })
        .eq('id', job.id);
      
      toast.error('Failed to trigger job');
    } finally {
      setTriggeringJob(null);
    }
  };

  const getScheduleDescription = (schedule: string): string => {
    const scheduleMap: Record<string, string> = {
      '0 8 * * *': 'Daily at 8:00 AM',
      '0 * * * *': 'Every hour',
      '*/5 * * * *': 'Every 5 minutes',
      '0 0 * * 0': 'Weekly on Sunday',
      '0 0 1 * *': 'Monthly on 1st'
    };
    return scheduleMap[schedule] || schedule;
  };

  const getStatusBadge = (status: string | null, isActive: boolean) => {
    if (!isActive) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    if (!status) {
      return <Badge variant="outline">Not Run Yet</Badge>;
    }
    if (status === 'success') {
      return <Badge className="bg-green-500 hover:bg-green-600">Success</Badge>;
    }
    if (status === 'failed') {
      return <Badge variant="destructive">Failed</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Scheduled Jobs
        </CardTitle>
        <CardDescription>
          Manage automated tasks and cron jobs for your application
        </CardDescription>
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No scheduled jobs configured</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Run</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">{job.job_name}</TableCell>
                    <TableCell className="max-w-xs truncate">{job.description}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-sm">{job.schedule}</span>
                        <span className="text-xs text-muted-foreground">
                          {getScheduleDescription(job.schedule)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(job.last_run_status, job.is_active)}</TableCell>
                    <TableCell>
                      {job.last_run_at ? (
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(job.last_run_at), { addSuffix: true })}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleJobActive(job.id, job.is_active)}
                        >
                          {job.is_active ? (
                            <>
                              <StopCircle className="h-4 w-4 mr-1" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <PlayCircle className="h-4 w-4 mr-1" />
                              Activate
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => manualTrigger(job)}
                          disabled={triggeringJob === job.id}
                        >
                          <RefreshCw className={`h-4 w-4 mr-1 ${triggeringJob === job.id ? 'animate-spin' : ''}`} />
                          {triggeringJob === job.id ? 'Running...' : 'Run Now'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
