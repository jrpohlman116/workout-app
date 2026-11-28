// Daily sync, run on a schedule before 6 a.m. (and on demand from the app for
// one user). Refreshes tokens when needed, pulls the day from each connected
// provider and stores it in wearable_days.
//   POST with header x-cron-secret: every connected user
//   POST with the user's session: just that user
import { admin, cors, env, json, requestUser } from '../_shared/common.ts';
import { PROVIDERS, isProvider } from '../_shared/providers.ts';

type Row = { user_id: string; provider: string };

async function syncOne(row: Row, date: string) {
  if (!isProvider(row.provider)) return;
  const db = admin();
  const { data: tok } = await db.from('integration_tokens').select('*').eq('user_id', row.user_id).eq('provider', row.provider).single();
  if (!tok) return;
  let access = tok.access_token as string;
  if (tok.expires_at && Date.parse(tok.expires_at) < Date.now() + 60_000 && tok.refresh_token) {
    const fresh = await PROVIDERS[row.provider].refresh(tok.refresh_token);
    access = fresh.access_token;
    await db.from('integration_tokens').update({
      access_token: fresh.access_token, refresh_token: fresh.refresh_token ?? tok.refresh_token,
      expires_at: fresh.expires_at ?? null, updated_at: new Date().toISOString(),
    }).eq('user_id', row.user_id).eq('provider', row.provider);
  }
  try {
    const day = await PROVIDERS[row.provider].fetchDay(access, date);
    await db.from('wearable_days').upsert({ user_id: row.user_id, date, provider: row.provider, runs: [], ...day, synced_at: new Date().toISOString() });
    await db.from('user_integrations').update({ status: 'connected', last_synced_at: new Date().toISOString() })
      .eq('user_id', row.user_id).eq('provider', row.provider);
  } catch (e) {
    console.error('sync', row.provider, e);
    await db.from('user_integrations').update({ status: 'error' }).eq('user_id', row.user_id).eq('provider', row.provider);
  }
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    // The client sends its local date; the scheduled run uses UTC's.
    const date: string = typeof body.date === 'string' ? body.date : new Date().toISOString().slice(0, 10);
    const db = admin();
    let rows: Row[];
    if (req.headers.get('x-cron-secret') === env('CRON_SECRET')) {
      const { data } = await db.from('user_integrations').select('user_id, provider').neq('status', 'disconnected');
      rows = data ?? [];
    } else {
      const user = await requestUser(req);
      const { data } = await db.from('user_integrations').select('user_id, provider').eq('user_id', user.id).neq('status', 'disconnected');
      rows = data ?? [];
    }
    for (const row of rows) await syncOne(row, date);
    return json({ synced: rows.length });
  } catch (e) {
    return e instanceof Response ? e : json({ error: 'Sync failed' }, 500);
  }
});
