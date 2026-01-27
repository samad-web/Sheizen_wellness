-- SQL Script to Fix Manager Roles
-- Use this in the Supabase SQL Editor if you have managers who are seeing full PII.

-- 1. IDENTIFY: Check for any managers who might be stuck as admins
-- This looks for users with 'manager' in their metadata but 'admin' in the user_roles table.
SELECT 
    au.id, 
    au.email, 
    au.raw_user_meta_data->>'role' as metadata_role,
    ur.role as current_db_role
FROM auth.users au
JOIN public.user_roles ur ON au.id::text = ur.user_id::text
WHERE (au.raw_user_meta_data->>'role') = 'manager' AND ur.role = 'admin';

-- 2. FIX: Demote stuck managers to their intended 'manager' role
UPDATE public.user_roles
SET role = 'manager'
FROM auth.users
WHERE public.user_roles.user_id::text = auth.users.id::text
AND (auth.users.raw_user_meta_data->>'role') = 'manager'
AND public.user_roles.role = 'admin';

-- 3. VERIFY: Final check
SELECT 
    au.email, 
    ur.role
FROM auth.users au
JOIN public.user_roles ur ON au.id::text = ur.user_id::text
WHERE au.email IN (SELECT email FROM auth.users WHERE (raw_user_meta_data->>'role') = 'manager');
