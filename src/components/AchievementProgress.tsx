import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import * as LucideIcons from "lucide-react";
import { ArrowRight } from "lucide-react";

interface AchievementProgressProps {
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    points: number;
    criteria_value: number;
  }>;
  progress: Array<{
    achievement_id: string;
    current_value: number;
    target_value: number;
  }>;
}

export function AchievementProgress({ achievements, progress }: AchievementProgressProps) {
  // Get top 3 closest to completion (not yet earned)
  const sortedProgress = progress
    .map((p) => {
      const achievement = achievements.find((a) => a.id === p.achievement_id);
      if (!achievement) return null;
      
      const percentComplete = (p.current_value / p.target_value) * 100;
      return {
        ...p,
        achievement,
        percentComplete: Math.min(100, percentComplete),
      };
    })
    .filter((p) => p && p.percentComplete < 100 && p.percentComplete > 0)
    .sort((a, b) => (b?.percentComplete || 0) - (a?.percentComplete || 0))
    .slice(0, 3);

  if (sortedProgress.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">
          Keep logging to unlock new achievements!
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {sortedProgress.map((item) => {
        if (!item) return null;
        
        const IconComponent = (LucideIcons as any)[item.achievement.icon] || LucideIcons.Award;
        
        return (
          <Card key={item.achievement_id} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 rounded-full p-2 mt-1">
                <IconComponent className="h-5 w-5 text-primary" />
              </div>
              
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-sm">{item.achievement.name}</h4>
                    <p className="text-xs text-muted-foreground">{item.achievement.description}</p>
                  </div>
                  <span className="text-xs font-medium text-primary whitespace-nowrap">
                    +{item.achievement.points} pts
                  </span>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {item.current_value} / {item.target_value}
                    </span>
                    <span className="font-medium">
                      {Math.round(item.percentComplete)}%
                    </span>
                  </div>
                  <Progress value={item.percentComplete} className="h-2" />
                </div>
                
                {item.percentComplete >= 80 && (
                  <p className="text-xs text-primary flex items-center gap-1 mt-2">
                    Almost there! <ArrowRight className="h-3 w-3" />
                  </p>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
