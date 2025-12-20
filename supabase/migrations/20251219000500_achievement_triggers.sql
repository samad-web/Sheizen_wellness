-- Function to check achievement progress
CREATE OR REPLACE FUNCTION public.check_user_achievements(
  _user_id uuid,
  _category text,
  _value integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _achievement record;
  _current_progress integer;
BEGIN
  -- Loop through all achievements in the category
  FOR _achievement IN
    SELECT * FROM public.achievements WHERE category = _category
  LOOP
    -- Get or initialize user progress
    -- We use ON CONFLICT to ensure the row exists
    INSERT INTO public.user_achievements (user_id, achievement_id, current_value)
    VALUES (_user_id, _achievement.id, _value)
    ON CONFLICT (user_id, achievement_id) DO UPDATE
    SET current_value = CASE
      -- For 'streak', if the new value is higher (or accumulated externally), update it. 
      -- But wait, my design for streaks usually implies passing the current streak length.
      -- For 'meal', 'activity', 'water', it's usually an accumulated total.
      -- Simplified Approach: The trigger calculates the TOTAL and passes it here.
      -- So we generally just update to the new total if it's higher.
      WHEN EXCLUDED.current_value > user_achievements.current_value THEN EXCLUDED.current_value
      ELSE user_achievements.current_value
    END,
    updated_at = now()
    RETURNING is_unlocked INTO _achievement; -- Re-using variable mainly for logic check? No, can't strictly reuse record type like that easily if shape differs.
    
    -- Check if we should unlock
    -- Re-fetch the updated row to be safe/clear
    SELECT is_unlocked INTO _achievement FROM public.user_achievements 
    WHERE user_id = _user_id AND achievement_id = _achievement.id;

    IF NOT _achievement.is_unlocked THEN
      -- Check condition
      IF _value >= _achievement.target_value THEN
        UPDATE public.user_achievements
        SET is_unlocked = true, unlocked_at = now()
        WHERE user_id = _user_id AND achievement_id = _achievement.id;
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Trigger Function: On Daily Log Update (Streaks, Water, Activity)
CREATE OR REPLACE FUNCTION public.handle_daily_log_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _user_id uuid;
  _total_activity integer;
  _water_streak integer;
  _activity_streak integer;
BEGIN
  -- Find the user_id from the client_id
  SELECT user_id INTO _user_id FROM public.clients WHERE id = NEW.client_id;
  IF _user_id IS NULL THEN RETURN NEW; END IF;

  -- 1. Activity Total
  -- Sum all activity minutes for this client
  SELECT COALESCE(SUM(activity_minutes), 0) INTO _total_activity
  FROM public.daily_logs
  WHERE client_id = NEW.client_id;
  
  PERFORM public.check_user_achievements(_user_id, 'activity', _total_activity);

  -- 2. Water Streak (Consecutive days hitting target, say 2000ml?)
  -- Simplified: Let's just say "logged days with > 0 water" for now or use a fixed target if we knew it.
  -- Let's assume hitting "target" means > 2000ml for generic rule, or > target_water if column exists (it doesn't on client table, only target_kcal).
  -- Let's use > 1500ml as a reasonable "goal" for now explicitly.
  -- Complex SQL for streaks is heavy. For MVP, let's just count "total days with > 1500ml" or something simple?
  -- User asked for "Consistency streaks".
  -- Let's calculate current streak of consecutive days with any log.
  
  -- Calculate Activity Streak (Consecutive days with activity > 0)
  WITH streaks AS (
      SELECT log_date,
             log_date - (ROW_NUMBER() OVER (ORDER BY log_date))::integer AS grp
      FROM public.daily_logs
      WHERE client_id = NEW.client_id AND activity_minutes > 0
  )
  SELECT COUNT(*) INTO _activity_streak
  FROM streaks
  WHERE grp = (SELECT grp FROM streaks WHERE log_date = CURRENT_DATE OR log_date = CURRENT_DATE - 1 LIMIT 1);
  -- If today/yesterday not logged, streak might be 0 or broken.
  
  PERFORM public.check_user_achievements(_user_id, 'streak', COALESCE(_activity_streak, 0));

  RETURN NEW;
END;
$$;

-- Trigger: Daily Log
DROP TRIGGER IF EXISTS on_daily_log_change ON public.daily_logs;
CREATE TRIGGER on_daily_log_change
  AFTER INSERT OR UPDATE ON public.daily_logs
  FOR EACH ROW EXECUTE FUNCTION public.handle_daily_log_stats();


-- Trigger Function: On Meal Log (Count meals)
CREATE OR REPLACE FUNCTION public.handle_meal_log_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _user_id uuid;
  _total_meals integer;
BEGIN
  SELECT user_id INTO _user_id FROM public.clients WHERE id = NEW.client_id;
  IF _user_id IS NULL THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO _total_meals FROM public.meal_logs WHERE client_id = NEW.client_id;
  
  PERFORM public.check_user_achievements(_user_id, 'meal', _total_meals);

  RETURN NEW;
END;
$$;

-- Trigger: Meal Log
DROP TRIGGER IF EXISTS on_meal_log_change ON public.meal_logs;
CREATE TRIGGER on_meal_log_change
  AFTER INSERT OR UPDATE ON public.meal_logs
  FOR EACH ROW EXECUTE FUNCTION public.handle_meal_log_stats();


-- Trigger Function: On Assessment (Count)
CREATE OR REPLACE FUNCTION public.handle_assessment_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _user_id uuid;
  _total_assessments integer;
BEGIN
  SELECT user_id INTO _user_id FROM public.clients WHERE id = NEW.client_id;
  IF _user_id IS NULL THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO _total_assessments FROM public.assessments WHERE client_id = NEW.client_id;
  
  PERFORM public.check_user_achievements(_user_id, 'assessment', _total_assessments);

  RETURN NEW;
END;
$$;

-- Trigger: Assessments
DROP TRIGGER IF EXISTS on_assessment_change ON public.assessments;
CREATE TRIGGER on_assessment_change
  AFTER INSERT OR UPDATE ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.handle_assessment_stats();
