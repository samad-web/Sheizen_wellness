-- Fix weekly_plans RLS policy for INSERT operations
-- The existing policy "Admins can manage plans" uses FOR ALL with only USING clause
-- This causes INSERT to fail because WITH CHECK is required for INSERT operations

-- Drop the existing policy
DROP POLICY IF EXISTS "Admins can manage plans" ON public.weekly_plans;

-- Recreate with proper WITH CHECK clause
CREATE POLICY "Admins can manage plans"
  ON public.weekly_plans
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Ensure the ID column has proper default value for UUID generation
-- This fixes the "null value in column 'id'" error
ALTER TABLE public.weekly_plans 
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
