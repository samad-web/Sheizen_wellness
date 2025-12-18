import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Moon, Edit } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";

interface SleepCardViewProps {
  data: any;
  assessmentId?: string;
  onDownloadPDF?: () => void;
}

export function SleepCardView({ data, assessmentId, onDownloadPDF }: SleepCardViewProps) {
  const navigate = useNavigate();
  const assessment = data?.assessment_data || data;

  return (
    <Card className="w-full">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Moon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-2xl">Sleep Quality Assessment</CardTitle>
              <p className="text-sm text-muted-foreground">Your sleep health evaluation</p>
            </div>
          </div>
          <div className="flex gap-2">
            {assessmentId && (
              <Button
                onClick={() => navigate(`/client/assessments/${assessmentId}/edit-sleep`)}
                variant="outline"
                size="sm"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
            {onDownloadPDF && (
              <Button onClick={onDownloadPDF} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Information / Key Findings */}
        {assessment?.key_findings && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Key Findings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Sleep Quality</p>
                <div className="mt-1">
                  <Badge variant={
                    (assessment.key_findings.sleep_quality || 0) >= 80 ? 'default' :
                      (assessment.key_findings.sleep_quality || 0) >= 60 ? 'secondary' : 'destructive'
                  }>
                    {assessment.key_findings.sleep_quality ? `${assessment.key_findings.sleep_quality}/10` : 'Not assessed'}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg. Hours</p>
                <p className="font-medium">{assessment.key_findings.sleep_hours ? `${assessment.key_findings.sleep_hours} hours` : 'Not reported'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bedtime</p>
                <p className="font-medium">{assessment.key_findings.sleep_time || 'Not reported'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Wake Time</p>
                <p className="font-medium">{assessment.key_findings.wake_time || 'Not reported'}</p>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Health Goals */}
        {assessment?.health_goals && assessment.health_goals.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Health Goals</h3>
            <div className="flex flex-wrap gap-2">
              {assessment.health_goals.map((goal: string, idx: number) => (
                <Badge key={idx} variant="secondary">{goal}</Badge>
              ))}
            </div>
          </div>
        )}

        {assessment?.health_goals && assessment.health_goals.length > 0 && <Separator />}

        {/* Issues / Disruptions */}
        {assessment?.key_findings?.disruptions && assessment.key_findings.disruptions.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Sleep Disruptions</h3>
            <ul className="list-disc list-inside space-y-1">
              {assessment.key_findings.disruptions.map((issue: string, idx: number) => (
                <li key={idx} className="text-sm">{issue}</li>
              ))}
            </ul>
          </div>
        )}

        {assessment?.key_findings?.disruptions && assessment.key_findings.disruptions.length > 0 && <Separator />}

        {/* Lifestyle Assessment */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">Lifestyle Factors</h3>
          <div className="space-y-4">
            {assessment?.lifestyle?.bedtime_routine_analysis && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Bedtime Routine Analysis</p>
                <p className="text-sm">{assessment.lifestyle.bedtime_routine_analysis}</p>
              </div>
            )}
            {assessment?.key_findings?.energy_levels && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Daytime Energy Levels</p>
                <Badge variant="outline">
                  {assessment.key_findings.energy_levels}/10
                </Badge>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Recommendations */}
        {assessment?.recommendations && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Key Recommendations</h3>
            <ul className="space-y-2">
              {assessment.recommendations.map((rec: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span className="text-sm flex-1">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Summary / AI Analysis */}
        {assessment?.summary && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Assessment Summary</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{assessment.summary}</p>
            </div>
          </>
        )}

        {/* Full Details / AI Analysis Content */}
        {assessment?.ai_analysis && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Detailed Analysis</h3>
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {assessment.ai_analysis.replace(/#/g, '')}
              </div>
            </div>
          </>
        )}

      </CardContent>
    </Card>
  );
}
