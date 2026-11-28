// Strava push subscription: a new run counts the same day, without waiting
// for the morning sync.
//   GET  hub.challenge verification (STRAVA_VERIFY_TOKEN)
//   POST activity events: fetch the activity, add a run to that day's row
import { admin, env, json } from '../_shared/common.ts';
import { stravaRun, PROVIDERS } from '../_shared/providers.ts';

Deno.serve(async req => {
  const url = new URL(req.url);
  if (req.method === 'GET') {
    if (url.searchParams.get('hub.verify_token') !== env('STRAVA_VERIFY_TOKEN')) return new Response('Forbidden', { status: 403 });
    return json({ 'hub.challenge': url.searchParams.get('hub.challenge') });
  }

  const event = await req.json().catch(() => null);
  // Acknowledge everything quickly; only new activities need work.
  if (!event || event.object_type !== 'activity' || event.aspect_type !== 'create') return json({ ok: true });

  const db = admin();
  const { data: link } = await db.from('user_integrations').select('user_id')
    .eq('provider', 'strava').eq('external_id', String(event.owner_id)).neq('status', 'disconnected').maybeSingle();
  if (!link) return json({ ok: true });

  try {
    const { data: tok } = await db.from('integration_tokens').select('*').eq('user_id', link.user_id).eq('provider', 'strava').single();
    let access = tok.access_token as string;
    if (tok.expires_at && Date.parse(tok.expires_at) < Date.now() + 60_000 && tok.refresh_token) {
      const fresh = await PROVIDERS.strava.refresh(tok.refresh_token);
      access = fresh.access_token;
      await db.from('integration_tokens').update({ access_token: fresh.access_token, refresh_token: fresh.refresh_token, expires_at: fresh.expires_at })
        .eq('user_id', link.user_id).eq('provider', 'strava');
    }
    const res = await fetch(`https://www.strava.com/api/v3/activities/${event.object_id}`, { headers: { Authorization: `Bearer ${access}` } });
    const run = res.ok ? stravaRun(await res.json()) : null;
    if (!run) return json({ ok: true });

    // The run counts toward the next day's readiness (runs in the 24 hours before).
    const date = new Date(Date.parse(run.startedAt) + 86400000).toISOString().slice(0, 10);
    const { data: existing } = await db.from('wearable_days').select('runs')
      .eq('user_id', link.user_id).eq('date', date).eq('provider', 'strava').maybeSingle();
    const runs = [...((existing?.runs as unknown[]) ?? []).filter((r: { startedAt?: string }) => r.startedAt !== run.startedAt), run];
    await db.from('wearable_days').upsert({ user_id: link.user_id, date, provider: 'strava', runs, synced_at: new Date().toISOString() });
  } catch (e) {
    console.error('strava-webhook', e);
  }
  return json({ ok: true });
});
