/*
  # Integrations: Oura and Strava (UX overhaul, phase 8)

  Wearable data reaches readiness through Supabase Edge Functions, never from
  on-device health stores. The app can see which providers are connected and
  the synced day summaries; OAuth tokens are readable only by the functions.

  ## New table `user_integrations` (non-secret)
  - `provider`: oura | strava; `status`: connected | error | disconnected
  - `last_synced_at`, `external_id` (the provider's athlete or user id, for webhooks)
  - Unique on (user_id, provider)
  - RLS: users read their own rows and can mark one disconnected. Connecting
    happens in the OAuth callback function, with the service role.

  ## New table `integration_tokens` (secret)
  - Access and refresh tokens per user and provider
  - RLS on with no policies: no client can read or write it. Only the
    service role (Edge Functions) bypasses RLS.

  ## New table `wearable_days`
  - One row per user, date and provider: HRV, its baseline, sleep, its
    baseline, and runs (jsonb: startedAt, minutes, avgHr, distanceKm)
  - RLS: users read their own rows; only functions write them

  ## Notes
  - Disconnecting deletes the tokens in the function, not from the client.
  - Safe to re-run.
*/

CREATE TABLE IF NOT EXISTS user_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  provider text NOT NULL CHECK (provider IN ('oura', 'strava')),
  status text NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'error', 'disconnected')),
  external_id text,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own integrations" ON user_integrations;
DROP POLICY IF EXISTS "Users can disconnect own integrations" ON user_integrations;
CREATE POLICY "Users can read own integrations"
  ON user_integrations FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can disconnect own integrations"
  ON user_integrations FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id AND status = 'disconnected');

CREATE TABLE IF NOT EXISTS integration_tokens (
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  provider text NOT NULL CHECK (provider IN ('oura', 'strava')),
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, provider)
);

-- No policies: clients get nothing. The service role bypasses RLS.
ALTER TABLE integration_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON integration_tokens FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS wearable_days (
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  provider text NOT NULL CHECK (provider IN ('oura', 'strava')),
  hrv_ms numeric,
  hrv_baseline_ms numeric,
  sleep_minutes numeric,
  sleep_baseline_minutes numeric,
  runs jsonb NOT NULL DEFAULT '[]'::jsonb,
  synced_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, date, provider)
);

ALTER TABLE wearable_days ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own wearable days" ON wearable_days;
CREATE POLICY "Users can read own wearable days"
  ON wearable_days FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);
