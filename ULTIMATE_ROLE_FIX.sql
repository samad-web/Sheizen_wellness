-- THE ULTIMATE ROLE FIX
-- This script fixes both the permissions table AND the login metadata.

-- 1. FIX: Update the internal permissions table
UPDATE public.user_roles
SET role = 'manager'
FROM auth.users
WHERE public.user_roles.user_id::text = auth.users.id::text
AND auth.users.email = 'riyaz.livechat@gmail.com';

-- 2. FIX: Update the login metadata (This is what the frontend sees first)
UPDATE auth.users
SET raw_user_meta_data = 
  CASE 
    WHEN raw_user_meta_data IS NULL THEN '{"role": "manager"}'::jsonb
    ELSE raw_user_meta_data || '{"role": "manager"}'::jsonb
  END
WHERE email = 'riyaz.livechat@gmail.com';

-- 3. VERIFY: Show the results
SELECT 
    au.email, 
    au.raw_user_meta_data->>'role' as metadata_role,
    ur.role as table_role,
    public.ensure_user_role(au.id) as rpc_role
FROM auth.users au
JOIN public.user_roles ur ON au.id::text = ur.user_id::text
WHERE au.email = 'riyaz.livechat@gmail.com';
