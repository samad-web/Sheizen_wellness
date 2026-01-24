-- Check what content is stored in the stress card
SELECT 
  id,
  card_type,
  status,
  generated_content,
  sent_at
FROM pending_review_cards
WHERE client_id = (SELECT id FROM clients WHERE name LIKE '%Aysha%')
AND card_type = 'stress_card'
ORDER BY created_at DESC
LIMIT 1;
