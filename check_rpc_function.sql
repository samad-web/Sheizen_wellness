-- Check if get_user_role function exists
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%role%'
ORDER BY routine_name;

-- If it exists, test it directly with your user ID
-- Replace 'YOUR-USER-ID-HERE' with your actual auth.uid()
-- You can get your user ID by running: SELECT auth.uid();

-- First get your user ID:
SELECT auth.uid() as my_user_id;

-- Then test the function (uncomment and replace the UUID):
-- SELECT public.get_user_role('YOUR-USER-ID-HERE');
