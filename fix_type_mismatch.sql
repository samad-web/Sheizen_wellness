-- ============================================================================
-- FIX: Correct the log_daily_metric function type mismatch
-- ============================================================================
-- The issue was that v_user_id was declared as TEXT but should be UUID
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Drop and recreate the is_admin function with proper UUID handling
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND role = 'admin'::app_role
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;

-- Drop and recreate log_daily_metric with CORRECT UUID handling
DROP FUNCTION IF EXISTS public.log_daily_metric(uuid, text, numeric, date) CASCADE;

CREATE OR REPLACE FUNCTION public.log_daily_metric(
  p_client_id uuid,
  p_metric_type text,
  p_value numeric,
  p_date date
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid; -- CHANGED FROM TEXT TO UUID - This was the bug!
  v_daily_log_id uuid;
  v_new_data record;
BEGIN
  -- 1. Authorization Check
  -- Get the user_id associated with the client
  SELECT user_id INTO v_user_id
  FROM public.clients
  WHERE id = p_client_id;
  
  -- If no client found, raise exception
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Client not found with id: %', p_client_id;
  END IF;

  -- UUID to UUID comparison - this will now work correctly
  IF v_user_id != auth.uid() THEN
      -- If not the owner, check if admin
      IF NOT public.is_admin() THEN
         RAISE EXCEPTION 'Access denied';
      END IF;
  END IF;

  -- 2. Upsert Daily Log
  INSERT INTO public.daily_logs (client_id, log_date)
  VALUES (p_client_id, p_date)
  ON CONFLICT (client_id, log_date) DO NOTHING;

  -- Get the ID of the daily log
  SELECT id INTO v_daily_log_id
  FROM public.daily_logs
  WHERE client_id = p_client_id AND log_date = p_date;

  -- 3. Update the specific metric
  IF p_metric_type = 'water' THEN
    UPDATE public.daily_logs
    SET water_intake = COALESCE(water_intake, 0) + p_value
    WHERE id = v_daily_log_id
    RETURNING * INTO v_new_data;
    
  ELSIF p_metric_type = 'activity' THEN
    UPDATE public.daily_logs
    SET activity_minutes = COALESCE(activity_minutes, 0) + p_value
    WHERE id = v_daily_log_id
    RETURNING * INTO v_new_data;
    
  ELSIF p_metric_type = 'weight' THEN
    UPDATE public.daily_logs
    SET weight = p_value
    WHERE id = v_daily_log_id
    RETURNING * INTO v_new_data;

    -- Also update the client's last_weight
    UPDATE public.clients
    SET last_weight = p_value
    WHERE id = p_client_id;
    
  ELSE
    RAISE EXCEPTION 'Invalid metric type: %. Must be water, activity, or weight', p_metric_type;
  END IF;

  RETURN row_to_json(v_new_data);
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_daily_metric(uuid, text, numeric, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_daily_metric(uuid, text, numeric, date) TO service_role;

-- Verification
SELECT 
    routine_name,
    routine_type,
    data_type as return_type,
    specific_name
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('is_admin', 'log_daily_metric')
ORDER BY routine_name;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Functions updated successfully with correct UUID types';
END $$;
