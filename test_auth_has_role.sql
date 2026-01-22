-- Test if auth_has_role is working
-- Run this while logged in as admin in Supabase SQL Editor

-- 1. Check your current user ID and role
SELECT 
  auth.uid() as my_user_id,
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid()::text) as my_role;

-- 2. Test the auth_has_role function directly
SELECT 
  public.auth_has_role('admin') as is_admin,
  public.auth_has_role('manager') as is_manager,
  public.auth_has_role('client') as is_client;

-- 3. Check if you can manually update a lead (bypassing app, testing RLS directly)
-- Replace 'LEAD-ID-HERE' with an actual lead ID from your leads
-- UPDATE public.interest_forms 
-- SET deleted_at = NOW()
-- WHERE id = 'LEAD-ID-HERE';
