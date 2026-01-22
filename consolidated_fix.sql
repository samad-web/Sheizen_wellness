-- CONSOLIDATED FIX SCRIPT (v3 - Renamed Function)
-- Run this entire script in your Supabase SQL Editor

-- 1. Add deleted_at column (safe to run even if exists)
ALTER TABLE public.interest_forms 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- 2. Create the security helper function (SECURITY DEFINER)
-- We renamed it to 'auth_has_role' to avoid conflicts with any existing 'has_role' functions
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
    WHERE user_id = auth.uid()
    AND role = required_role
  );
END;
$$;

-- 3. Reset and Fix RLS Policies
ALTER TABLE public.interest_forms ENABLE ROW LEVEL SECURITY;

-- Drop all relevant existing policies to start fresh
DROP POLICY IF EXISTS "Enable insert for everyone" ON public.interest_forms;
DROP POLICY IF EXISTS "Enable select for authenticated users only" ON public.interest_forms;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.interest_forms;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.interest_forms;
DROP POLICY IF EXISTS "Enable delete for admins only" ON public.interest_forms;
DROP POLICY IF EXISTS "Admins and Managers can view non-deleted leads" ON public.interest_forms;
DROP POLICY IF EXISTS "Admins and Managers can update leads" ON public.interest_forms;

-- Re-create Policies using the NEW function name

-- INSERT: Allow public submission
CREATE POLICY "Enable insert for everyone" ON public.interest_forms
  FOR INSERT WITH CHECK (true);

-- SELECT: Admins/Managers see non-deleted leads
CREATE POLICY "Admins and Managers can view non-deleted leads" ON public.interest_forms
  FOR SELECT
  USING (
    (deleted_at IS NULL) AND
    (public.auth_has_role('admin') OR public.auth_has_role('manager'))
  );

-- UPDATE: Admins/Managers can update status or soft-delete
CREATE POLICY "Admins and Managers can update leads" ON public.interest_forms
  FOR UPDATE
  USING (
    public.auth_has_role('admin') OR public.auth_has_role('manager')
  );

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.auth_has_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_has_role TO anon;
