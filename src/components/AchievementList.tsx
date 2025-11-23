import { useState, useMemo } from "react";
import { AchievementBadge } from "./AchievementBadge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  badge_color: string;
  points: number;
  category: string;
  criteria_value: number;
}

interface AchievementListProps {
  achievements: Achievement[];
  earnedAchievements: Array<{
    achievement_id: string;
    earned_at: string;
  }>;
  progress: Array<{
    achievement_id: string;
    current_value: number;
    target_value: number;
  }>;
}

export function AchievementList({
  achievements,
  earnedAchievements,
  progress,
}: AchievementListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<string>("all");

  const earnedIds = new Set(earnedAchievements.map((a) => a.achievement_id));
  const progressMap = new Map(progress.map((p) => [p.achievement_id, p]));
  const earnedMap = new Map(earnedAchievements.map((a) => [a.achievement_id, a]));

  const filteredAchievements = useMemo(() => {
    let filtered = achievements;

    // Filter by tab
    if (filterTab === "earned") {
      filtered = filtered.filter((a) => earnedIds.has(a.id));
    } else if (filterTab === "in-progress") {
      filtered = filtered.filter((a) => !earnedIds.has(a.id) && progressMap.has(a.id));
    } else if (filterTab === "locked") {
      filtered = filtered.filter((a) => !earnedIds.has(a.id));
    } else if (filterTab !== "all") {
      // Category filter
      filtered = filtered.filter((a) => a.category === filterTab);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          a.description.toLowerCase().includes(query)
      );
    }

    // Sort: earned first, then by progress, then by points
    return filtered.sort((a, b) => {
      const aEarned = earnedIds.has(a.id);
      const bEarned = earnedIds.has(b.id);
      
      if (aEarned && !bEarned) return -1;
      if (!aEarned && bEarned) return 1;
      
      const aProgress = progressMap.get(a.id);
      const bProgress = progressMap.get(b.id);
      
      if (aProgress && bProgress) {
        const aPercent = (aProgress.current_value / aProgress.target_value) * 100;
        const bPercent = (bProgress.current_value / bProgress.target_value) * 100;
        return bPercent - aPercent;
      }
      
      return b.points - a.points;
    });
  }, [achievements, filterTab, searchQuery, earnedIds, progressMap]);

  const earnedCount = achievements.filter((a) => earnedIds.has(a.id)).length;
  const totalPoints = achievements
    .filter((a) => earnedIds.has(a.id))
    .reduce((sum, a) => sum + a.points, 0);

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      <div className="flex gap-4 flex-wrap">
        <div className="bg-primary/10 rounded-lg p-4 flex-1 min-w-[150px]">
          <p className="text-sm text-muted-foreground">Achievements</p>
          <p className="text-2xl font-bold">
            {earnedCount} / {achievements.length}
          </p>
        </div>
        <div className="bg-primary/10 rounded-lg p-4 flex-1 min-w-[150px]">
          <p className="text-sm text-muted-foreground">Total Points</p>
          <p className="text-2xl font-bold">{totalPoints}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search achievements..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filters */}
      <Tabs value={filterTab} onValueChange={setFilterTab}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="earned">Earned</TabsTrigger>
          <TabsTrigger value="in-progress">Progress</TabsTrigger>
          <TabsTrigger value="consistency">Daily</TabsTrigger>
          <TabsTrigger value="streak">Streak</TabsTrigger>
          <TabsTrigger value="milestone">Milestone</TabsTrigger>
          <TabsTrigger value="special">Special</TabsTrigger>
        </TabsList>

        <TabsContent value={filterTab} className="mt-6">
          {filteredAchievements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No achievements found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAchievements.map((achievement) => (
                <AchievementBadge
                  key={achievement.id}
                  achievement={achievement}
                  earned={earnedIds.has(achievement.id)}
                  earnedAt={earnedMap.get(achievement.id)?.earned_at}
                  progress={progressMap.get(achievement.id)}
                  size="md"
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
