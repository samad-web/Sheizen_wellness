
-- Insert measurement_reminder template if it doesn't exist
-- Using WHERE NOT EXISTS because 'name' might not have a unique constraint
INSERT INTO public.message_templates (id, name, template, category, is_active)
SELECT
  gen_random_uuid(),
  'measurement_reminder',
  'Hi {{name}}, it has been over two weeks since your last body measurement update. Please log your new measurements in your dashboard to track your progress! Keep up the good work!',
  'reminder',
  true
WHERE NOT EXISTS (
    SELECT 1 FROM public.message_templates WHERE name = 'measurement_reminder'
);
