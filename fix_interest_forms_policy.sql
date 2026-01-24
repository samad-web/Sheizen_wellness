-- FIX: Allow Admins to Delete Leads (Interest Form Submissions)
-- Run this in the Supabase SQL Editor

-- 1. Ensure deleted_at column exists (standard soft-delete column)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interest_forms' AND column_name='deleted_at') THEN
        ALTER TABLE public.interest_forms ADD COLUMN deleted_at timestamp with time zone;
    END IF;
END $$;

-- 2. Drop existing restrictive policies for interest_forms to start fresh
DROP POLICY IF EXISTS "Enable select for authenticated users only" ON public.interest_forms;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.interest_forms;
DROP POLICY IF EXISTS "Admins/Managers Full Access" ON public.interest_forms;

-- 3. Create a COMPREHENSIVE policy for Admins/Managers/Dieticians
-- This allows them to perform all operations (Select, Update, etc.)
CREATE POLICY "Admins/Managers Full Access" ON public.interest_forms
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()::text
      AND user_roles.role IN ('admin', 'manager', 'dietician')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()::text
      AND user_roles.role IN ('admin', 'manager', 'dietician')
    )
  );

-- 4. Keep the insert policy for everyone (so public can submit interest forms)
-- (This should already exist, but making sure it's here)
DROP POLICY IF EXISTS "Enable insert for everyone" ON public.interest_forms;
CREATE POLICY "Enable insert for everyone" ON public.interest_forms
  FOR INSERT WITH CHECK (true);
