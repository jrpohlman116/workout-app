// POST { provider } with the user's session -> { url } to send them to the
// provider's consent page. The signed state carries who is connecting.
import { callbackUrl, cors, json, requestUser, signState } from '../_shared/common.ts';
import { PROVIDERS, isProvider } from '../_shared/providers.ts';

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const user = await requestUser(req);
    const { provider } = await req.json();
    if (!isProvider(provider)) return json({ error: 'Unknown provider' }, 400);
    const state = await signState({ userId: user.id, provider });
    return json({ url: PROVIDERS[provider].authorizeUrl(state, callbackUrl()) });
  } catch (e) {
    return e instanceof Response ? e : json({ error: 'Could not start connecting' }, 500);
  }
});
