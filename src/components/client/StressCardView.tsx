import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Brain } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

interface StressCardViewProps {
  data: any;
  onDownloadPDF?: () => void;
}

export function StressCardView({ data, onDownloadPDF }: StressCardViewProps) {
  const stress = data?.stress_assessment || data;
  const stressScore = stress?.stress_score || 0;

  const getStressLevel = (score: number) => {
    if (score <= 30) return { level: "Low", variant: "default" as const, color: "text-green-600" };
    if (score <= 60) return { level: "Moderate", variant: "secondary" as const, color: "text-yellow-600" };
    return { level: "High", variant: "destructive" as const, color: "text-red-600" };
  };

  const stressLevel = getStressLevel(stressScore);

  return (
    <Card className="w-full">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Brain className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-2xl">Stress Assessment</CardTitle>
              <p className="text-sm text-muted-foreground">Your mental wellness evaluation</p>
            </div>
          </div>
          {onDownloadPDF && (
            <Button onClick={onDownloadPDF} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stress Score */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Stress Score</h3>
            <Badge variant={stressLevel.variant} className="text-lg px-4 py-1">
              {stressScore}/100
            </Badge>
          </div>
          <Progress value={stressScore} className="h-3" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Low</span>
            <span>Moderate</span>
            <span>High</span>
          </div>
          <p className={`text-center font-medium ${stressLevel.color}`}>
            {stressLevel.level} Stress Level
          </p>
        </div>

        <Separator />

        {/* Key Stressors */}
        {stress?.stressors && stress.stressors.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Key Stressors</h3>
            <div className="grid gap-2">
              {stress.stressors.map((stressor: string, idx: number) => (
                <div key={idx} className="flex items-start gap-2 p-3 rounded-lg bg-muted">
                  <span className="text-purple-600 mt-0.5">•</span>
                  <span className="text-sm flex-1">{stressor}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Physical Symptoms */}
        {stress?.physical_symptoms && stress.physical_symptoms.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Physical Symptoms</h3>
            <div className="flex flex-wrap gap-2">
              {stress.physical_symptoms.map((symptom: string, idx: number) => (
                <Badge key={idx} variant="outline">{symptom}</Badge>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Coping Mechanisms */}
        {stress?.current_coping && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Current Coping Mechanisms</h3>
            <p className="text-sm text-muted-foreground">{stress.current_coping}</p>
          </div>
        )}

        <Separator />

        {/* Recommendations */}
        {stress?.recommendations && stress.recommendations.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Recommended Strategies</h3>
            <div className="space-y-3">
              {stress.recommendations.map((rec: any, idx: number) => (
                <div key={idx} className="p-4 rounded-lg border bg-card">
                  <h4 className="font-medium mb-2">{rec.title || rec.strategy}</h4>
                  <p className="text-sm text-muted-foreground">{rec.description || rec.details}</p>
                  {rec.frequency && (
                    <p className="text-xs text-primary mt-2">
                      Frequency: {rec.frequency}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analysis */}
        {stress?.analysis && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Professional Analysis</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{stress.analysis}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
