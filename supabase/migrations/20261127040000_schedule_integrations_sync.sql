/*
  # Daily wearable sync (UX overhaul, phase 8)

  Calls the integrations-sync Edge Function every morning, before most
  lifters wake: 10:00 UTC is 4 a.m. Central and 5 a.m. Eastern in winter.
  The app also syncs on the first open of the day, so an early riser or a
  different time zone still gets fresh data.

  The function only syncs everyone when the request carries CRON_SECRET.
  The job reads it from Vault at run time (secret name 'cron_secret'), so
  the value never appears in the job definition. Create it once with:
    select vault.create_secret('<same value as the CRON_SECRET function secret>', 'cron_secret');

  ## Changes
  - Enables pg_cron and pg_net
  - Schedules 'integrations-daily-sync'

  ## Notes
  - Safe to re-run: the job is replaced.
*/

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'integrations-daily-sync') THEN
    PERFORM cron.unschedule('integrations-daily-sync');
  END IF;
END $$;

SELECT cron.schedule(
  'integrations-daily-sync',
  '0 10 * * *',
  $job$
    SELECT net.http_post(
      url := 'https://eukvyoutgbaagnrrrson.supabase.co/functions/v1/integrations-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 60000
    );
  $job$
);
