-- COMPREHENSIVE FIX: Grant permissions and simplify policies
-- Run this in Supabase SQL Editor

-- 1. Ensure user_roles is readable by RLS policies
GRANT SELECT ON public.user_roles TO authenticated;

-- 2. Drop ALL existing policies on interest_forms
DROP POLICY IF EXISTS "Enable insert for everyone" ON public.interest_forms;
DROP POLICY IF EXISTS "Enable select for authenticated users only" ON public.interest_forms;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.interest_forms;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.interest_forms;
DROP POLICY IF EXISTS "Enable delete for admins only" ON public.interest_forms;
DROP POLICY IF EXISTS "Admins and Managers can view non-deleted leads" ON public.interest_forms;
DROP POLICY IF EXISTS "Admins and Managers can update leads" ON public.interest_forms;

-- 3. Create fresh, simple policies

-- INSERT: Public (for landing page form)
CREATE POLICY "public_insert" ON public.interest_forms
  FOR INSERT 
  TO public
  WITH CHECK (true);

-- SELECT: Admins/Managers only, non-deleted
CREATE POLICY "admin_manager_select" ON public.interest_forms
  FOR SELECT
  TO authenticated
  USING (
    (deleted_at IS NULL) AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()::text
      AND user_roles.role IN ('admin', 'manager')
    )
  );

-- UPDATE: Admins/Managers only, NO deleted_at check in WITH CHECK
CREATE POLICY "admin_manager_update" ON public.interest_forms
  FOR UPDATE
  TO authenticated
  USING (
    -- Can update if you're admin/manager
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()::text
      AND user_roles.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    -- Allow any update if you're admin/manager (including soft delete)
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()::text
      AND user_roles.role IN ('admin', 'manager')
    )
  );
