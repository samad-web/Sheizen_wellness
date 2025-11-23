import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";

interface AchievementBadgeProps {
  achievement: {
    id: string;
    name: string;
    description: string;
    icon: string;
    badge_color: string;
    points: number;
    category: string;
    criteria_value: number;
  };
  earned?: boolean;
  earnedAt?: string;
  progress?: {
    current_value: number;
    target_value: number;
  };
  size?: "sm" | "md" | "lg";
}

export function AchievementBadge({
  achievement,
  earned = false,
  earnedAt,
  progress,
  size = "md",
}: AchievementBadgeProps) {
  const IconComponent = (LucideIcons as any)[achievement.icon] || LucideIcons.Award;
  
  const badgeColorClasses = {
    gold: "bg-yellow-100 text-yellow-800 border-yellow-300",
    silver: "bg-gray-100 text-gray-800 border-gray-300",
    bronze: "bg-orange-100 text-orange-800 border-orange-300",
  };

  const iconSizes = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  };

  const cardSizes = {
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
  };

  const progressPercent = progress
    ? Math.min(100, (progress.current_value / progress.target_value) * 100)
    : earned
    ? 100
    : 0;

  return (
    <Card
      className={cn(
        cardSizes[size],
        "relative transition-all duration-300",
        earned ? "border-primary shadow-md" : "opacity-60 border-muted",
        !earned && "grayscale"
      )}
    >
      {/* Badge Color Indicator */}
      {earned && (
        <div
          className={cn(
            "absolute top-2 right-2 h-3 w-3 rounded-full",
            achievement.badge_color === "gold" && "bg-yellow-400",
            achievement.badge_color === "silver" && "bg-gray-400",
            achievement.badge_color === "bronze" && "bg-orange-400"
          )}
        />
      )}

      <div className="flex flex-col items-center text-center space-y-3">
        {/* Icon */}
        <div
          className={cn(
            "rounded-full p-3 transition-colors",
            earned
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
          )}
        >
          <IconComponent className={iconSizes[size]} />
        </div>

        {/* Name & Description */}
        <div className="space-y-1">
          <h4 className="font-semibold text-sm">{achievement.name}</h4>
          <p className="text-xs text-muted-foreground">{achievement.description}</p>
        </div>

        {/* Points Badge */}
        <Badge
          variant="secondary"
          className={cn(
            "text-xs",
            earned && badgeColorClasses[achievement.badge_color as keyof typeof badgeColorClasses]
          )}
        >
          {achievement.points} pts
        </Badge>

        {/* Progress Bar (if not earned) */}
        {!earned && progress && (
          <div className="w-full space-y-1">
            <Progress value={progressPercent} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {progress.current_value} / {progress.target_value}
            </p>
          </div>
        )}

        {/* Earned Date */}
        {earned && earnedAt && (
          <p className="text-xs text-muted-foreground">
            Earned {new Date(earnedAt).toLocaleDateString()}
          </p>
        )}
      </div>
    </Card>
  );
}
