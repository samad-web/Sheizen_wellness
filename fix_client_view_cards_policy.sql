-- Fix RLS policy for clients to view sent assessment cards
-- This ensures clients can see cards that admins have reviewed and sent to them

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Clients can view their own sent cards" ON public.pending_review_cards;

-- Recreate the policy with explicit casting to ensure it works
CREATE POLICY "Clients can view their own sent cards"
  ON public.pending_review_cards
  FOR SELECT
  USING (
    status = 'sent' 
    AND EXISTS (
      SELECT 1 FROM public.clients 
      WHERE clients.id::text = pending_review_cards.client_id::text
      AND clients.user_id::text = auth.uid()::text
    )
  );

-- Verify the policy was created
SELECT * FROM pg_policies 
WHERE tablename = 'pending_review_cards'
AND policyname = 'Clients can view their own sent cards';
