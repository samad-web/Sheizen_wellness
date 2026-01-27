-- Check metadata vs RPC for the manager
SELECT 
    id, 
    email, 
    raw_user_meta_data->>'role' as metadata_role,
    public.ensure_user_role(id) as rpc_role
FROM auth.users 
WHERE email = 'riyaz.livechat@gmail.com';
