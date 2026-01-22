-- TEMPORARY: Disable RLS entirely to test if app logic works
-- This will help us confirm it's an auth issue
-- Run this in Supabase SQL Editor

ALTER TABLE public.interest_forms DISABLE ROW LEVEL SECURITY;

-- IMPORTANT: This is ONLY for testing. We'll re-enable it after confirming the app works.
-- After testing, run: ALTER TABLE public.interest_forms ENABLE ROW LEVEL SECURITY;
