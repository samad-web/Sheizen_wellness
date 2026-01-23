# Deployment Instructions for Measurement Reminders

## 1. Deploy the Edge Function

You'll need to deploy the `check-measurement-reminders` Edge Function to Supabase. 

If you have the Supabase CLI installed, run:
```bash
supabase functions deploy check-measurement-reminders
```

Alternatively, you can deploy it manually through the Supabase Dashboard:
1. Go to your Supabase project dashboard
2. Navigate to Edge Functions
3. Create a new function named `check-measurement-reminders`
4. Copy the contents of `supabase/functions/check-measurement-reminders/index.ts`

## 2. Schedule the Cron Job

### Option A: Using the manage-cron-jobs Edge Function

You can call the existing `manage-cron-jobs` Edge Function to schedule this:

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/manage-cron-jobs' \
  -H 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "create",
    "job_data": {
      "job_name": "measurement_reminder_biweekly",
      "schedule": "0 9 * * 1,4",
      "edge_function_name": "check-measurement-reminders",
      "description": "Send bi-weekly measurement reminders to clients",
      "is_active": true
    }
  }'
```

**Note:** The schedule `0 9 * * 1,4` runs at 9:00 AM every Monday and Thursday (twice weekly). Adjust the schedule as needed:
- For every 14 days: `0 9 1,15 * *` (1st and 15th of each month)
- For every Monday: `0 9 * * 1`

### Option B: Using Supabase Dashboard

1. Go to Database → Extensions → Enable pg_cron if not already enabled
2. Go to SQL Editor and run:

```sql
SELECT cron.schedule(
  'measurement_reminder_biweekly',
  '0 9 * * 1,4',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/check-measurement-reminders',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  )
  $$
);
```

## 3. Test the Function

Test the function manually first:

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/check-measurement-reminders' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY'
```

This will check all active clients and send reminders to those who haven't updated measurements in 14+ days.

## Notes

- The function uses the `measurement_reminder` template we just inserted
- It checks for clients who haven't recorded measurements in 14+ days
- It also reminds clients who have never recorded measurements and joined 14+ days ago
- Reminders are sent via the `send-automated-message` Edge Function, which also triggers push notifications if enabled
