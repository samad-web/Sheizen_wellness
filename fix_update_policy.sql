-- Fix UPDATE policy to allow soft delete
-- The issue: UPDATE policies need both USING (who can update) and WITH CHECK (what they can update to)
-- Run this in Supabase SQL Editor

-- Drop and recreate the UPDATE policy with proper WITH CHECK
DROP POLICY IF EXISTS "Admins and Managers can update leads" ON public.interest_forms;

CREATE POLICY "Admins and Managers can update leads" ON public.interest_forms
  FOR UPDATE
  USING (
    -- Who can perform the update
    public.auth_has_role('admin') OR public.auth_has_role('manager')
  )
  WITH CHECK (
    -- What values are allowed in the updated row
    -- Allow any updates from admin/manager (including setting deleted_at)
    public.auth_has_role('admin') OR public.auth_has_role('manager')
  );
