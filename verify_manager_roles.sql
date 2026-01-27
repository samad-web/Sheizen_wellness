-- Comprehensive check for riyaz.livechat@gmail.com
SELECT 
    au.id as auth_user_id,
    au.email,
    au.raw_user_meta_data->>'role' as metadata_role,
    ur.user_id as role_table_user_id,
    ur.role as table_role,
    public.ensure_user_role(au.id) as rpc_role
FROM auth.users au
LEFT JOIN public.user_roles ur ON au.id::text = ur.user_id::text
WHERE au.email = 'riyaz.livechat@gmail.com';
