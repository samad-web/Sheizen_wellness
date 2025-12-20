-- ============================================================================
-- DIAGNOSTIC: Check if functions exist
-- ============================================================================
-- Run this first to see what's currently in the database

SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('is_admin', 'log_daily_metric')
ORDER BY routine_name;

-- Expected Output:
-- If both functions exist, you should see 2 rows:
-- - is_admin (FUNCTION, boolean)
-- - log_daily_metric (FUNCTION, json)
--
-- If you see 0 rows, the functions were not created.
-- If you see only 1 row, one function is missing.
