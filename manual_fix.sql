-- Forcefully fix the specific user's role
-- Run this in Supabase SQL Editor

-- 1. Insert/Update the role for the user
INSERT INTO public.user_roles (user_id, role)
VALUES ('891d5d56-93f3-4345-ada5-405620e0f352', 'client')
ON CONFLICT (user_id) DO UPDATE SET role = 'client';

-- 2. Ensure permissions are granted (just in case)
GRANT SELECT ON public.user_roles TO authenticated;

-- 3. Verify the row exists (Output should show the row)
SELECT * FROM public.user_roles 
WHERE user_id::text = '891d5d56-93f3-4345-ada5-405620e0f352';
