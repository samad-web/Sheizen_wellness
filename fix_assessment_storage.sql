-- FIX: Create assessment-files bucket and set RLS policies
-- Run this in the Supabase SQL Editor

-- 1. Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
SELECT 'assessment-files', 'assessment-files', false
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'assessment-files'
);

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can upload assessment files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all assessment files" ON storage.objects;
DROP POLICY IF EXISTS "Clients can view their assessment files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete assessment files" ON storage.objects;

-- 3. Create robust policies for admins
-- Using the text-based role check which is more reliable in this project
CREATE POLICY "Admins can upload assessment files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'assessment-files' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id::text = auth.uid()::text
    AND role::text = 'admin'
  )
);

CREATE POLICY "Admins can view all assessment files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'assessment-files' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id::text = auth.uid()::text
    AND role::text = 'admin'
  )
);

CREATE POLICY "Admins can delete assessment files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'assessment-files' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id::text = auth.uid()::text
    AND role::text = 'admin'
  )
);

-- 4. Allow clients to view their own files
CREATE POLICY "Clients can view their assessment files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'assessment-files' AND
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.user_id::text = auth.uid()::text
    AND (storage.foldername(name))[1] = clients.id::text
  )
);
