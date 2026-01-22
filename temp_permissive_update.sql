-- TEMPORARY FIX: Super permissive UPDATE policy for testing
-- This will help us confirm the app logic works
-- Run this in Supabase SQL Editor

-- Drop the restrictive UPDATE policy
DROP POLICY IF EXISTS "admin_manager_update" ON public.interest_forms;

-- Create VERY permissive UPDATE policy (TEMPORARY - just for testing)
CREATE POLICY "temp_allow_all_updates" ON public.interest_forms
  FOR UPDATE
  TO authenticated
  USING (true)  -- Any authenticated user can update
  WITH CHECK (true);  -- Allow any values

-- IMPORTANT: This is TEMPORARY. Once delete works, we'll tighten it back to admin/manager only.
