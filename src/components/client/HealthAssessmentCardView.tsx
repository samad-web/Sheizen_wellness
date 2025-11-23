import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Heart } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface HealthAssessmentCardViewProps {
  data: any;
  onDownloadPDF?: () => void;
}

export function HealthAssessmentCardView({ data, onDownloadPDF }: HealthAssessmentCardViewProps) {
  const assessment = data?.assessment || data;

  return (
    <Card className="w-full">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Heart className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Health Assessment</CardTitle>
              <p className="text-sm text-muted-foreground">Your comprehensive health evaluation</p>
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
        {/* Basic Information */}
        {assessment?.basic_info && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Age</p>
                <p className="font-medium">{assessment.basic_info.age} years</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gender</p>
                <p className="font-medium">{assessment.basic_info.gender}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Height</p>
                <p className="font-medium">{assessment.basic_info.height} cm</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Weight</p>
                <p className="font-medium">{assessment.basic_info.weight} kg</p>
              </div>
              {assessment.basic_info.bmi && (
                <div>
                  <p className="text-sm text-muted-foreground">BMI</p>
                  <p className="font-medium">{assessment.basic_info.bmi}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <Separator />

        {/* Health Goals */}
        {assessment?.health_goals && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Health Goals</h3>
            <div className="flex flex-wrap gap-2">
              {assessment.health_goals.map((goal: string, idx: number) => (
                <Badge key={idx} variant="secondary">{goal}</Badge>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Medical History */}
        {assessment?.medical_history && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Medical History</h3>
            <div className="space-y-4">
              {assessment.medical_history.conditions && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Current Conditions</p>
                  <ul className="list-disc list-inside space-y-1">
                    {assessment.medical_history.conditions.map((condition: string, idx: number) => (
                      <li key={idx} className="text-sm">{condition}</li>
                    ))}
                  </ul>
                </div>
              )}
              {assessment.medical_history.medications && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Current Medications</p>
                  <ul className="list-disc list-inside space-y-1">
                    {assessment.medical_history.medications.map((med: string, idx: number) => (
                      <li key={idx} className="text-sm">{med}</li>
                    ))}
                  </ul>
                </div>
              )}
              {assessment.medical_history.allergies && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Allergies</p>
                  <ul className="list-disc list-inside space-y-1">
                    {assessment.medical_history.allergies.map((allergy: string, idx: number) => (
                      <li key={idx} className="text-sm">{allergy}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        <Separator />

        {/* Lifestyle Assessment */}
        {assessment?.lifestyle && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Lifestyle Assessment</h3>
            <div className="space-y-4">
              {assessment.lifestyle.diet && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Diet Pattern</p>
                  <p className="text-sm">{assessment.lifestyle.diet}</p>
                </div>
              )}
              {assessment.lifestyle.exercise && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Exercise Routine</p>
                  <p className="text-sm">{assessment.lifestyle.exercise}</p>
                </div>
              )}
              {assessment.lifestyle.sleep && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Sleep Pattern</p>
                  <p className="text-sm">{assessment.lifestyle.sleep}</p>
                </div>
              )}
              {assessment.lifestyle.stress_level && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Stress Level</p>
                  <Badge variant={
                    assessment.lifestyle.stress_level === 'Low' ? 'default' :
                    assessment.lifestyle.stress_level === 'Medium' ? 'secondary' : 'destructive'
                  }>
                    {assessment.lifestyle.stress_level}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        )}

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

        {/* Summary */}
        {assessment?.summary && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Assessment Summary</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{assessment.summary}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
