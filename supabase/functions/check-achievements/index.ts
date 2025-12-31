import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { getCorsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Get CORS headers based on origin
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { client_id, action_type } = await req.json();

    if (!client_id) {
      return new Response(
        JSON.stringify({ error: 'client_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Checking achievements for client ${client_id}, action: ${action_type}`);

    // Fetch all active achievements
    const { data: achievements, error: achievementsError } = await supabaseClient
      .from('achievements')
      .select('*')
      .eq('is_active', true);

    if (achievementsError) throw achievementsError;

    // Fetch client's current progress
    const { data: existingProgress, error: progressError } = await supabaseClient
      .from('achievement_progress')
      .select('*')
      .eq('client_id', client_id);

    if (progressError) throw progressError;

    // Fetch client's earned achievements
    const { data: earnedAchievements, error: earnedError } = await supabaseClient
      .from('user_achievements')
      .select('achievement_id')
      .eq('client_id', client_id);

    if (earnedError) throw earnedError;

    const earnedIds = new Set(earnedAchievements?.map(a => a.achievement_id) || []);
    const newlyEarned = [];
    const updatedProgress = [];

    // Check each achievement
    for (const achievement of achievements || []) {
      if (earnedIds.has(achievement.id)) continue; // Already earned

      let currentValue = 0;
      let shouldAward = false;

      // Calculate current progress based on criteria type
      switch (achievement.criteria_type) {
        case 'first_meal':
        case 'meal_log_count': {
          const { count } = await supabaseClient
            .from('meal_logs')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', client_id);
          currentValue = count || 0;
          shouldAward = currentValue >= achievement.criteria_value;
          break;
        }

        case 'meal_log_streak': {
          // Get recent meal logs ordered by date
          const { data: mealLogs } = await supabaseClient
            .from('meal_logs')
            .select('logged_at')
            .eq('client_id', client_id)
            .order('logged_at', { ascending: false })
            .limit(100);

          currentValue = calculateStreak(mealLogs?.map(m => m.logged_at) || []);
          shouldAward = currentValue >= achievement.criteria_value;
          break;
        }

        case 'weight_consistency': {
          const { data: dailyLogs } = await supabaseClient
            .from('daily_logs')
            .select('log_date, weight')
            .eq('client_id', client_id)
            .not('weight', 'is', null)
            .order('log_date', { ascending: false })
            .limit(30);

          currentValue = calculateStreak(dailyLogs?.map(d => d.log_date) || []);
          shouldAward = currentValue >= achievement.criteria_value;
          break;
        }

        case 'hydration_streak': {
          const { data: client } = await supabaseClient
            .from('clients')
            .select('target_kcal')
            .eq('id', client_id)
            .single();

          const waterTarget = Math.round((client?.target_kcal || 2000) * 0.035) * 100;

          const { data: dailyLogs } = await supabaseClient
            .from('daily_logs')
            .select('log_date, water_intake')
            .eq('client_id', client_id)
            .gte('water_intake', waterTarget)
            .order('log_date', { ascending: false })
            .limit(30);

          currentValue = calculateStreak(dailyLogs?.map(d => d.log_date) || []);
          shouldAward = currentValue >= achievement.criteria_value;
          break;
        }

        case 'activity_streak': {
          const { data: dailyLogs } = await supabaseClient
            .from('daily_logs')
            .select('log_date, activity_minutes')
            .eq('client_id', client_id)
            .gt('activity_minutes', 0)
            .order('log_date', { ascending: false })
            .limit(30);

          currentValue = calculateStreak(dailyLogs?.map(d => d.log_date) || []);
          shouldAward = currentValue >= achievement.criteria_value;
          break;
        }

        case 'weight_loss_milestone': {
          const { data: dailyLogs } = await supabaseClient
            .from('daily_logs')
            .select('weight')
            .eq('client_id', client_id)
            .not('weight', 'is', null)
            .order('log_date', { ascending: true })
            .limit(1);

          const { data: client } = await supabaseClient
            .from('clients')
            .select('last_weight')
            .eq('id', client_id)
            .single();

          const startWeight = dailyLogs?.[0]?.weight || 0;
          const currentWeight = client?.last_weight || 0;
          const weightLost = startWeight - currentWeight;
          
          currentValue = Math.max(0, Math.floor(weightLost));
          shouldAward = currentValue >= achievement.criteria_value;
          break;
        }
      }

      // Update or create progress record
      const existingProgressRecord = existingProgress?.find(p => p.achievement_id === achievement.id);
      
      if (existingProgressRecord) {
        await supabaseClient
          .from('achievement_progress')
          .update({
            current_value: currentValue,
            last_updated: new Date().toISOString(),
          })
          .eq('id', existingProgressRecord.id);
      } else {
        await supabaseClient
          .from('achievement_progress')
          .insert({
            client_id,
            achievement_id: achievement.id,
            current_value: currentValue,
            target_value: achievement.criteria_value,
          });
      }

      updatedProgress.push({
        achievement_id: achievement.id,
        current_value: currentValue,
        target_value: achievement.criteria_value,
      });

      // Award achievement if criteria met
      if (shouldAward) {
        await supabaseClient
          .from('user_achievements')
          .insert({
            client_id,
            achievement_id: achievement.id,
            progress: { value: currentValue },
          });

        newlyEarned.push({
          ...achievement,
          earned_at: new Date().toISOString(),
        });

        console.log(`Awarded achievement: ${achievement.name} to client ${client_id}`);
      }
    }

    return new Response(
      JSON.stringify({
        newAchievements: newlyEarned,
        updatedProgress,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in check-achievements:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to calculate consecutive day streaks
function calculateStreak(dates: string[]): number {
  if (!dates || dates.length === 0) return 0;

  const uniqueDates = [...new Set(dates.map(d => d.split('T')[0]))].sort().reverse();
  let streak = 0;
  const today = new Date().toISOString().split('T')[0];
  let expectedDate = new Date(today);

  for (const dateStr of uniqueDates) {
    const checkDate = new Date(dateStr);
    const expectedStr = expectedDate.toISOString().split('T')[0];
    
    if (dateStr === expectedStr) {
      streak++;
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}
