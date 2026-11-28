// The provider redirects here after consent. Exchanges the code, stores the
// tokens where only functions can read them, marks the provider connected and
// sends the lifter back to More → Integrations.
import { admin, callbackUrl, env, verifyState } from '../_shared/common.ts';
import { PROVIDERS, isProvider } from '../_shared/providers.ts';

const back = (query: string) => Response.redirect(`${env('APP_URL')}/more/integrations?${query}`, 302);

Deno.serve(async req => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = await verifyState(url.searchParams.get('state') ?? '');
  if (!code || !state || !isProvider(state.provider)) return back('error=connect');

  try {
    const tokens = await PROVIDERS[state.provider].exchangeCode(code, callbackUrl());
    const db = admin();
    const { error: tokenError } = await db.from('integration_tokens').upsert({
      user_id: state.userId, provider: state.provider,
      access_token: tokens.access_token, refresh_token: tokens.refresh_token ?? null,
      expires_at: tokens.expires_at ?? null, scope: tokens.scope ?? null, updated_at: new Date().toISOString(),
    });
    if (tokenError) throw tokenError;
    const { error } = await db.from('user_integrations').upsert(
      { user_id: state.userId, provider: state.provider, status: 'connected', external_id: tokens.external_id ?? null },
      { onConflict: 'user_id,provider' },
    );
    if (error) throw error;
    return back(`connected=${state.provider}`);
  } catch (e) {
    console.error('integrations-callback', e);
    return back('error=connect');
  }
});
