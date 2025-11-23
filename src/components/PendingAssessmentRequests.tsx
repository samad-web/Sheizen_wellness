import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Brain, Moon, CheckCircle } from "lucide-react";

interface AssessmentRequest {
  id: string;
  assessment_type: string;
  status: string;
  requested_at: string;
}

interface PendingAssessmentRequestsProps {
  clientId: string;
  onStartAssessment: (requestId: string, type: string) => void;
}

export function PendingAssessmentRequests({ 
  clientId, 
  onStartAssessment 
}: PendingAssessmentRequestsProps) {
  const [requests, setRequests] = useState<AssessmentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
    
    // Real-time subscription
    const channel = supabase
      .channel('assessment-requests')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'assessment_requests',
        filter: `client_id=eq.${clientId}`
      }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId]);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('assessment_requests')
        .select('*')
        .eq('client_id', clientId)
        .in('status', ['pending', 'in_progress'])
        .order('requested_at', { ascending: false });
      
      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching assessment requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'health_assessment': return FileText;
      case 'stress_assessment': return Brain;
      case 'sleep_assessment': return Moon;
      default: return FileText;
    }
  };

  const getLabel = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) return null;
  if (requests.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CheckCircle className="h-5 w-5 text-primary" />
          Pending Assessments ({requests.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {requests.map(request => {
          const Icon = getIcon(request.assessment_type);
          return (
            <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{getLabel(request.assessment_type)}</p>
                  <p className="text-sm text-muted-foreground">
                    Requested {new Date(request.requested_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Button 
                size="sm"
                onClick={() => onStartAssessment(request.id, request.assessment_type)}
              >
                Start
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
