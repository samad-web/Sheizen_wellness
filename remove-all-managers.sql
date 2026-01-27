-- ============================================================================
-- REMOVE ALL MANAGER ROLES: Run this in Supabase SQL Editor
-- ============================================================================

-- 1. Remove all manager roles from the roles table entirely
DELETE FROM public.user_roles 
WHERE role = 'manager';

-- 2. Clear the role from metadata for all managers
-- This removes the "role" key from the JSON object in auth.users
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data - 'role'
WHERE raw_user_meta_data->>'role' = 'manager';

-- 3. Verification: Query to see if any managers remain
SELECT email, raw_user_meta_data->>'role' as role_in_metadata
FROM auth.users
WHERE raw_user_meta_data->>'role' = 'manager';
