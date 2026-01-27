-- Check all users and their roles
SELECT 
    au.id, 
    au.email, 
    ur.role as table_role,
    (au.raw_user_meta_data->>'role') as metadata_role
FROM auth.users au
LEFT JOIN public.user_roles ur ON au.id::text = ur.user_id::text;
