// POST { provider } with the user's session: deletes the stored tokens,
// revokes Strava's access, and marks the provider disconnected.
import { admin, cors, json, requestUser } from '../_shared/common.ts';
import { isProvider } from '../_shared/providers.ts';

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const user = await requestUser(req);
    const { provider } = await req.json();
    if (!isProvider(provider)) return json({ error: 'Unknown provider' }, 400);
    const db = admin();
    const { data: tok } = await db.from('integration_tokens').select('access_token').eq('user_id', user.id).eq('provider', provider).maybeSingle();
    if (tok && provider === 'strava') {
      await fetch('https://www.strava.com/oauth/deauthorize', { method: 'POST', headers: { Authorization: `Bearer ${tok.access_token}` } }).catch(() => {});
    }
    await db.from('integration_tokens').delete().eq('user_id', user.id).eq('provider', provider);
    await db.from('user_integrations').update({ status: 'disconnected' }).eq('user_id', user.id).eq('provider', provider);
    return json({ ok: true });
  } catch (e) {
    return e instanceof Response ? e : json({ error: 'Could not disconnect' }, 500);
  }
});
