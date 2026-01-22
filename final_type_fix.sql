-- FINAL FIX: Update both functions with correct type casting
-- user_roles.user_id is TEXT, auth.uid() is UUID
-- Run this in Supabase SQL Editor

-- 1. Fix auth_has_role (used by interest_forms RLS policies)
CREATE OR REPLACE FUNCTION public.auth_has_role(required_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()::text  -- Cast UUID to TEXT
    AND role = required_role
  );
END;
$$;

-- 2. Fix get_user_role (used by AuthContext)
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
  -- Get the caller's role first
  SELECT role INTO _caller_role 
  FROM public.user_roles 
  WHERE user_id = auth.uid()::text;  -- Cast UUID to TEXT
  
  -- If requesting own role, return it
  IF target_user_id::text = auth.uid()::text THEN
    RETURN _caller_role;
  END IF;
  
  -- If caller is admin, allow querying other users
  IF _caller_role = 'admin' THEN
    SELECT role INTO _role 
    FROM public.user_roles 
    WHERE user_id = target_user_id::text;  -- Cast UUID to TEXT
    RETURN _role;
  END IF;
  
  -- Otherwise, no permission
  RETURN NULL;
END;
$$;
