-- Fixed get_user_role with proper type casting
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.get_user_role(target_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role text;
  _caller_role text;
BEGIN
  -- Get the caller's role first (with explicit casting)
  SELECT role INTO _caller_role 
  FROM public.user_roles 
  WHERE user_id::text = auth.uid()::text;
  
  -- If requesting own role, return it
  IF target_user_id::text = auth.uid()::text THEN
    RETURN _caller_role;
  END IF;
  
  -- If caller is admin, allow querying other users
  IF _caller_role = 'admin' THEN
    SELECT role INTO _role 
    FROM public.user_roles 
    WHERE user_id::text = target_user_id::text;
    RETURN _role;
  END IF;
  
  -- Otherwise, no permission
  RETURN NULL;
END;
$$;
