-- Run this in Supabase SQL Editor to clear stale push subscriptions
-- (Old subscriptions used a different VAPID key and won't work anymore)
-- Users will need to re-enable notifications from Settings after this.

DELETE FROM push_subscriptions;
