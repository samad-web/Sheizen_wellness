
SELECT 
    au.id as auth_id, 
    au.email, 
    p.id as profile_id, 
    c.id as client_id,
    c.status as client_status
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
LEFT JOIN public.clients c ON c.user_id = au.id
WHERE au.id = 'dc145a28-5665-4011-b982-2f90d7320ae0';
