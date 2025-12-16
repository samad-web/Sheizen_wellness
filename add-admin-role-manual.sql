-- Add profile and role for aakashkummar1258@gmail.com
-- User ID from console: 1d1ad91f-1b88-48ec-aecb-11d3c0b2fbf2
-- Run this in Supabase Dashboard → SQL Editor

-- Add profile
INSERT INTO public.profiles (id, email, name, phone)
VALUES (
    '1d1ad91f-1b88-48ec-aecb-11d3c0b2fbf2',
    'aakashkummar1258@gmail.com',
    'Aakash Kumar',
    '1234567890'
);

-- Add admin role
INSERT INTO public.user_roles (id, user_id, role)
VALUES (
    gen_random_uuid(),
    '1d1ad91f-1b88-48ec-aecb-11d3c0b2fbf2',
    'admin'
);

-- Verify the entries
SELECT * FROM public.profiles WHERE id = '1d1ad91f-1b88-48ec-aecb-11d3c0b2fbf2';
SELECT * FROM public.user_roles WHERE user_id = '1d1ad91f-1b88-48ec-aecb-11d3c0b2fbf2';
