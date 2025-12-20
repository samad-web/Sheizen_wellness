-- Fix Auth Hang by breaking RLS recursion and providing safe RPC

-- 1. Ensure is_admin is robust and owned by definer
-- We add setting search_path to prevent hijacking
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- This query inside SECURITY DEFINER bypasses RLS
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Create RPC function to fetch role safely without triggering RLS loop from client
CREATE OR REPLACE FUNCTION public.get_user_role(target_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role text;
BEGIN
  -- Check if user is requesting their own role
  IF target_user_id = auth.uid() THEN
    SELECT role INTO _role FROM public.user_roles WHERE user_id = target_user_id;
    RETURN _role;
  END IF;

  -- Check if user is admin (using the Safe is_admin)
  IF public.is_admin() THEN
    SELECT role INTO _role FROM public.user_roles WHERE user_id = target_user_id;
    RETURN _role;
  END IF;

  -- Otherwise deny
  RETURN NULL;
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
