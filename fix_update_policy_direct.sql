-- DIRECT FIX: Use inline role check instead of function
-- This avoids SECURITY DEFINER function call issues in RLS policies
-- Run this in Supabase SQL Editor

-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins and Managers can update leads" ON public.interest_forms;

-- Create new policy with direct subquery (no function call)
CREATE POLICY "Admins and Managers can update leads" ON public.interest_forms
  FOR UPDATE
  USING (
    -- Check role directly in the policy
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()::text
      AND role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    -- Same check for the updated row
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()::text
      AND role IN ('admin', 'manager')
    )
  );
