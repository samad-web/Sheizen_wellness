-- Ensure user_roles table has proper RLS for client-side queries
-- This allows the frontend to query roles directly without RPC
-- Run this in Supabase SQL Editor

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "users_read_own_role" ON public.user_roles;

-- Create simple, permissive policy for users to read their own role
CREATE POLICY "allow_read_own_role" ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

-- Grant SELECT to authenticated users
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.user_roles TO anon;
