-- Run this in Supabase SQL Editor to check if you have any lead records
-- This query bypasses RLS to see the raw data

SELECT 
  id, 
  name, 
  email, 
  created_at,
  deleted_at,
  CASE 
    WHEN deleted_at IS NULL THEN 'Active'
    ELSE 'Deleted'
  END as status
FROM public.interest_forms
ORDER BY created_at DESC;

-- Also check the count
SELECT 
  COUNT(*) as total_records,
  COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) as active_records,
  COUNT(CASE WHEN deleted_at IS NOT NULL THEN 1 END) as deleted_records
FROM public.interest_forms;
