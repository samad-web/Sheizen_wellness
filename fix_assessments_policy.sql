
-- FIX: Allow Admins to Save Assessments
-- Run this in the Supabase SQL Editor

-- 1. Enable RLS (just in case)
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing restrictive policies (if any) to avoid conflicts
DROP POLICY IF EXISTS "Admins/Managers Full Access" ON assessments;
DROP POLICY IF EXISTS "Clients View Own" ON assessments;
DROP POLICY IF EXISTS "Enable insert for everyone" ON assessments;
DROP POLICY IF EXISTS "Enable select for authenticated users only" ON assessments;

-- 3. Allow Admins/Managers/Dieticians to perform ALL actions (Insert, Update, Select, Delete)
CREATE POLICY "Admins/Managers Full Access" ON assessments
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

-- 4. Allow Clients to View their own assessments
CREATE POLICY "Clients View Own" ON assessments
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()::text
    )
  );
