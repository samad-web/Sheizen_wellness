-- ============================================================================
-- DEEP DIAGNOSTIC: Check exact column types and test the function manually
-- ============================================================================

-- 1. Check actual column types in clients table
SELECT 
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'clients'
  AND column_name IN ('id', 'user_id');

-- Expected output:
-- id, uuid, uuid
-- user_id, uuid, uuid

-- 2. Check actual auth.uid() return type
SELECT pg_typeof(auth.uid()) AS auth_uid_type;

-- Expected: uuid

-- 3. View the actual function definition
SELECT 
    routine_schema,
    routine_name,
    prosrc
FROM information_schema.routines r
JOIN pg_proc p ON p.proname = r.routine_name
WHERE routine_schema = 'public' 
  AND routine_name = 'log_daily_metric';

-- 4. Get the current logged-in user's info
SELECT 
    auth.uid() as current_auth_uid,
    c.id as client_id,
    c.user_id as client_user_id,
    pg_typeof(c.user_id) as user_id_type
FROM clients c
WHERE c.user_id = auth.uid();

-- 5. Manually test a simple query that the function should do
SELECT user_id
FROM public.clients
WHERE id = (SELECT id FROM public.clients WHERE user_id = auth.uid() LIMIT 1);

-- This will help us understand if the basic query works
