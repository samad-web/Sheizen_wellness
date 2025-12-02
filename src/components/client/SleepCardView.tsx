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
  const sleep = data?.sleep_assessment || data;
  const sleepQuality = sleep?.sleep_quality_score || 0;

  const getQualityLevel = (score: number) => {
    if (score >= 80) return { level: "Excellent", variant: "default" as const, color: "text-green-600" };
    if (score >= 60) return { level: "Good", variant: "secondary" as const, color: "text-blue-600" };
    if (score >= 40) return { level: "Fair", variant: "secondary" as const, color: "text-yellow-600" };
    return { level: "Poor", variant: "destructive" as const, color: "text-red-600" };
  };

  const qualityLevel = getQualityLevel(sleepQuality);

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
        {/* Sleep Quality Score */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Sleep Quality Score</h3>
            <Badge variant={qualityLevel.variant} className="text-lg px-4 py-1">
              {sleepQuality}/100
            </Badge>
          </div>
          <Progress value={sleepQuality} className="h-3" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Poor</span>
            <span>Fair</span>
            <span>Good</span>
            <span>Excellent</span>
          </div>
          <p className={`text-center font-medium ${qualityLevel.color}`}>
            {qualityLevel.level} Sleep Quality
          </p>
        </div>

        <Separator />

        {/* Sleep Pattern */}
        {sleep?.sleep_pattern && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Sleep Pattern</h3>
            <div className="grid grid-cols-2 gap-4">
              {sleep.sleep_pattern.bedtime && (
                <div>
                  <p className="text-sm text-muted-foreground">Usual Bedtime</p>
                  <p className="font-medium">{sleep.sleep_pattern.bedtime}</p>
                </div>
              )}
              {sleep.sleep_pattern.wake_time && (
                <div>
                  <p className="text-sm text-muted-foreground">Wake Time</p>
                  <p className="font-medium">{sleep.sleep_pattern.wake_time}</p>
                </div>
              )}
              {sleep.sleep_pattern.hours && (
                <div>
                  <p className="text-sm text-muted-foreground">Average Hours</p>
                  <p className="font-medium">{sleep.sleep_pattern.hours} hours</p>
                </div>
              )}
              {sleep.sleep_pattern.time_to_fall_asleep && (
                <div>
                  <p className="text-sm text-muted-foreground">Fall Asleep Time</p>
                  <p className="font-medium">{sleep.sleep_pattern.time_to_fall_asleep}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <Separator />

        {/* Sleep Issues */}
        {sleep?.sleep_issues && sleep.sleep_issues.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Current Sleep Issues</h3>
            <div className="grid gap-2">
              {sleep.sleep_issues.map((issue: string, idx: number) => (
                <div key={idx} className="flex items-start gap-2 p-3 rounded-lg bg-muted">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span className="text-sm flex-1">{issue}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Environmental Factors */}
        {sleep?.environment && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Sleep Environment</h3>
            <div className="space-y-2">
              {sleep.environment.room_temperature && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Room Temperature</span>
                  <span className="text-sm font-medium">{sleep.environment.room_temperature}</span>
                </div>
              )}
              {sleep.environment.noise_level && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Noise Level</span>
                  <span className="text-sm font-medium">{sleep.environment.noise_level}</span>
                </div>
              )}
              {sleep.environment.light_exposure && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Light Exposure</span>
                  <span className="text-sm font-medium">{sleep.environment.light_exposure}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <Separator />

        {/* Sleep Hygiene Tips */}
        {sleep?.hygiene_tips && sleep.hygiene_tips.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Sleep Hygiene Recommendations</h3>
            <div className="space-y-3">
              {sleep.hygiene_tips.map((tip: any, idx: number) => (
                <div key={idx} className="p-4 rounded-lg border bg-card">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <span className="text-blue-600">✓</span>
                    {tip.title || tip.tip}
                  </h4>
                  <p className="text-sm text-muted-foreground">{tip.description || tip.details}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Professional Notes */}
        {sleep?.notes && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Professional Notes</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{sleep.notes}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
