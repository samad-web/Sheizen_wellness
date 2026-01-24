-- Fix RLS policy for pending_review_cards to allow clients to insert their own assessment cards
-- Currently clients can only view sent cards, but cannot insert new cards

-- Add policy to allow clients to insert their own assessment cards
CREATE POLICY "Clients can insert their own assessment cards"
  ON public.pending_review_cards
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id::text = pending_review_cards.client_id::text
      AND clients.user_id::text = auth.uid()::text
    )
  );
