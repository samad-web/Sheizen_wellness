-- ULTIMATE FIX: Ensure get_user_role bypasses ALL RLS
-- The timeout suggests user_roles RLS is blocking the SECURITY DEFINER function
-- Run this in Supabase SQL Editor

-- 1. Ensure user_roles has RLS enabled but with proper policies
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Drop old user_roles policies
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- 3. Drop existing policy if present, then create new one
DROP POLICY IF EXISTS "users_read_own_role" ON public.user_roles;

CREATE POLICY "users_read_own_role" ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

-- 4. Grant SELECT to authenticated (explicit)
GRANT SELECT ON public.user_roles TO authenticated;

-- 5. Recreate get_user_role with SECURITY DEFINER (bypasses RLS)
-- This should work even if RLS is strict
CREATE OR REPLACE FUNCTION public.get_user_role(target_user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role 
  FROM public.user_roles 
  WHERE user_id = target_user_id::text
  LIMIT 1;
$$;

-- 6. Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO anon;
