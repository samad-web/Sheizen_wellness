-- ============================================================================
-- FIX CLIENT DASHBOARD LOGGING ISSUES - ENHANCED VERSION
-- ============================================================================
-- This script creates the necessary functions for weight, water, and activity logging
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/ljxgaycjomnyfihdsgke/sql)
-- ============================================================================

-- Step 1: Ensure we're working in the public schema
SET search_path TO public;

-- Step 2: Create the is_admin() helper function
-- ============================================================================
-- Drop existing function if it exists (to ensure clean recreation)
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
    WHERE user_roles.user_id::text = auth.uid()::text
    AND role::text = 'admin'
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;

-- Verify is_admin was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_name = 'is_admin'
  ) THEN
    RAISE NOTICE '✓ is_admin() function created successfully';
  ELSE
    RAISE EXCEPTION '✗ Failed to create is_admin() function';
  END IF;
END $$;

-- Step 3: Create the log_daily_metric RPC function
-- ============================================================================
-- Drop all possible signatures of the function
DROP FUNCTION IF EXISTS public.log_daily_metric(uuid, text, numeric, date) CASCADE;
DROP FUNCTION IF EXISTS public.log_daily_metric(text, text, numeric, date) CASCADE;

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
  v_user_id text; -- Defined as TEXT to avoid UUID mismatches
  v_daily_log_id uuid;
  v_current_data record;
  v_new_data record;
BEGIN
  -- 1. Authorization Check
  -- Get the user_id associated with the client, cast to TEXT immediately
  SELECT user_id::text INTO v_user_id
  FROM public.clients
  WHERE id = p_client_id;
  
  -- If no client found, unauthorized (or bad request)
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Client not found with id: %', p_client_id;
  END IF;

  -- Strict text comparison. auth.uid() usually returns uuid, so we cast it too.
  IF v_user_id != auth.uid()::text THEN
      -- If not the owner, check if admin.
      IF NOT public.is_admin() THEN
         RAISE EXCEPTION 'Access denied -- Not owner or admin';
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.log_daily_metric(uuid, text, numeric, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_daily_metric(uuid, text, numeric, date) TO service_role;

-- Verify log_daily_metric was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_name = 'log_daily_metric'
  ) THEN
    RAISE NOTICE '✓ log_daily_metric() function created successfully';
  ELSE
    RAISE EXCEPTION '✗ Failed to create log_daily_metric() function';
  END IF;
END $$;

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================
-- This will show both functions if everything worked correctly
SELECT 
    routine_name,
    routine_type,
    data_type as return_type,
    'CREATED' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('is_admin', 'log_daily_metric')
ORDER BY routine_name;

-- Expected Output: You should see 2 rows showing both functions

