-- Debug query to check if client can see sent assessment cards
-- Run this in Supabase SQL Editor while logged in as the client

-- 1. Check what cards exist for Aysha
SELECT 
  id,
  client_id,
  card_type,
  status,
  sent_at,
  created_at
FROM pending_review_cards
WHERE client_id = (SELECT id FROM clients WHERE name LIKE '%Aysha%')
ORDER BY created_at DESC;

-- 2. Check the client's user_id
SELECT 
  id as client_id,
  name,
  user_id
FROM clients
WHERE name LIKE '%Aysha%';

-- 3. Check if RLS policy is working (run this while logged in as Aysha)
-- This should return cards if RLS is working correctly
SELECT * FROM pending_review_cards
WHERE status = 'sent'
ORDER BY sent_at DESC;
