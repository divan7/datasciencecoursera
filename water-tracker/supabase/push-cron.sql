-- Run this in your Supabase SQL Editor AFTER deploying the Edge Function
-- Requires pg_net extension (enabled by default in Supabase)

-- Enable pg_cron if not already enabled
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Fire the Edge Function every minute
select cron.schedule(
  'aquavital-water-reminders',   -- job name
  '* * * * *',                   -- every minute
  $$
    select net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/send-water-reminders',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type',  'application/json'
      ),
      body    := '{}'::jsonb
    );
  $$
);

-- To check the job:
-- select * from cron.job;

-- To remove the job:
-- select cron.unschedule('aquavital-water-reminders');
