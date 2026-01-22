-- Quick verification test
-- Run this in Supabase SQL Editor to check your current setup

-- 1. Check your role
SELECT 
  auth.uid() as my_user_id,
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid()::text) as my_role;

-- 2. Check if you can see your own role via the SELECT policy
SELECT * FROM public.user_roles WHERE user_id = auth.uid()::text;

-- 3. Try a direct UPDATE test (replace with a real lead ID)
-- First, get a lead ID:
SELECT id, name, deleted_at FROM public.interest_forms LIMIT 1;

-- Then try to update it manually (replace 'LEAD-ID' with actual ID from above):
-- UPDATE public.interest_forms SET deleted_at = NOW() WHERE id = 'LEAD-ID';
