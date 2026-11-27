// Shared helpers for the integration Edge Functions (Deno).
import { createClient } from 'npm:@supabase/supabase-js@2';

export const env = (name: string): string => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing secret: ${name}`);
  return value;
};

/** Service-role client: bypasses RLS, so it can read and write integration_tokens. */
export const admin = () => createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'));

/** The signed-in user behind a request, from its Authorization header. */
export async function requestUser(req: Request) {
  const client = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Response('Not signed in', { status: 401 });
  return data.user;
}

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// OAuth state: user id, provider and expiry, signed with OAUTH_STATE_SECRET,
// so the callback knows whose tokens it's storing and that nobody forged it.
const key = async () => crypto.subtle.importKey(
  'raw', new TextEncoder().encode(env('OAUTH_STATE_SECRET')), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'],
);
const b64 = (bytes: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

export async function signState(payload: { userId: string; provider: string }): Promise<string> {
  const body = b64(new TextEncoder().encode(JSON.stringify({ ...payload, exp: Date.now() + 10 * 60 * 1000 })));
  const sig = b64(await crypto.subtle.sign('HMAC', await key(), new TextEncoder().encode(body)));
  return `${body}.${sig}`;
}

export async function verifyState(state: string): Promise<{ userId: string; provider: string } | null> {
  const [body, sig] = state.split('.');
  if (!body || !sig) return null;
  const ok = await crypto.subtle.verify('HMAC', await key(), unb64(sig), new TextEncoder().encode(body));
  if (!ok) return null;
  const payload = JSON.parse(new TextDecoder().decode(unb64(body)));
  return payload.exp > Date.now() ? { userId: payload.userId, provider: payload.provider } : null;
}

export const callbackUrl = () => `${env('SUPABASE_URL')}/functions/v1/integrations-callback`;
