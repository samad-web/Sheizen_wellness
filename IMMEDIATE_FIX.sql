-- ============================================================================
-- IMMEDIATE FIX: Run this directly in Supabase SQL Editor
-- ============================================================================
-- URL: https://supabase.com/dashboard/project/ljxgaycjomnyfihdsgke/sql
-- ============================================================================

-- Drop and recreate log_daily_metric with correct UUID types
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
  v_user_id uuid; -- UUID type (not TEXT!)
  v_daily_log_id uuid;
  v_new_data record;
BEGIN
  -- Get the user_id
  SELECT user_id INTO v_user_id
  FROM public.clients
  WHERE id = p_client_id;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Client not found';
  END IF;

  -- UUID comparison (no casting!)
  IF v_user_id != auth.uid() THEN
      IF NOT public.is_admin() THEN
         RAISE EXCEPTION 'Access denied';
      END IF;
  END IF;

  -- Upsert daily log
  INSERT INTO public.daily_logs (client_id, log_date)
  VALUES (p_client_id, p_date)
  ON CONFLICT (client_id, log_date) DO NOTHING;

  SELECT id INTO v_daily_log_id
  FROM public.daily_logs
  WHERE client_id = p_client_id AND log_date = p_date;

  -- Update metric
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

    UPDATE public.clients
    SET last_weight = p_value
    WHERE id = p_client_id;
    
  ELSE
    RAISE EXCEPTION 'Invalid metric type: %', p_metric_type;
  END IF;

  RETURN row_to_json(v_new_data);
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_daily_metric(uuid, text, numeric, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_daily_metric(uuid, text, numeric, date) TO service_role;

SELECT '✅ Function fixed!' as status;
