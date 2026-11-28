// Oura and Strava behind one shape. Each provider turns its API into a day
// of HRV, sleep and runs; the readiness engine never sees provider APIs.
// Endpoints follow Oura API v2 and Strava API v3; check them against the
// providers' current docs when registering the apps.
import { env } from './common.ts';

export type Provider = 'oura' | 'strava';

export interface Tokens {
  access_token: string;
  refresh_token?: string | null;
  expires_at?: string | null;
  scope?: string | null;
  external_id?: string | null;
}

export interface Run { startedAt: string; minutes: number; avgHr?: number | null; distanceKm?: number | null }

export interface DaySummary {
  hrv_ms?: number | null;
  hrv_baseline_ms?: number | null;
  sleep_minutes?: number | null;
  sleep_baseline_minutes?: number | null;
  runs?: Run[];
}

export interface ProviderApi {
  authorizeUrl(state: string, redirectUri: string): string;
  exchangeCode(code: string, redirectUri: string): Promise<Tokens>;
  refresh(refreshToken: string): Promise<Tokens>;
  /** The day's summary. `date` is the user's local date, YYYY-MM-DD. */
  fetchDay(accessToken: string, date: string): Promise<DaySummary>;
}

async function postForm(url: string, form: Record<string, string>) {
  const res = await fetch(url, { method: 'POST', body: new URLSearchParams(form) });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

async function getJson(url: string, token: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

const isoDaysBefore = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) - days * 86400000).toISOString().slice(0, 10);
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

const oura: ProviderApi = {
  authorizeUrl: (state, redirectUri) =>
    `https://cloud.ouraring.com/oauth/authorize?${new URLSearchParams({
      response_type: 'code', client_id: env('OURA_CLIENT_ID'), redirect_uri: redirectUri, scope: 'daily heartrate', state,
    })}`,
  async exchangeCode(code, redirectUri) {
    const t = await postForm('https://api.ouraring.com/oauth/token', {
      grant_type: 'authorization_code', code, redirect_uri: redirectUri,
      client_id: env('OURA_CLIENT_ID'), client_secret: env('OURA_CLIENT_SECRET'),
    });
    return { access_token: t.access_token, refresh_token: t.refresh_token, scope: t.scope,
      expires_at: new Date(Date.now() + (t.expires_in ?? 0) * 1000).toISOString() };
  },
  async refresh(refreshToken) {
    const t = await postForm('https://api.ouraring.com/oauth/token', {
      grant_type: 'refresh_token', refresh_token: refreshToken,
      client_id: env('OURA_CLIENT_ID'), client_secret: env('OURA_CLIENT_SECRET'),
    });
    return { access_token: t.access_token, refresh_token: t.refresh_token,
      expires_at: new Date(Date.now() + (t.expires_in ?? 0) * 1000).toISOString() };
  },
  async fetchDay(token, date) {
    // Today's main sleep, plus the 7 days before it for the baseline.
    const { data } = await getJson(
      `https://api.ouraring.com/v2/usercollection/sleep?start_date=${isoDaysBefore(date, 7)}&end_date=${date}`, token,
    );
    const nights = (data ?? []).filter((s: { type?: string }) => s.type === 'long_sleep');
    const today = nights.find((s: { day: string }) => s.day === date);
    const before = nights.filter((s: { day: string }) => s.day < date);
    return {
      hrv_ms: today?.average_hrv ?? null,
      hrv_baseline_ms: mean(before.map((s: { average_hrv?: number }) => s.average_hrv).filter(Boolean)),
      sleep_minutes: today?.total_sleep_duration != null ? today.total_sleep_duration / 60 : null,
      sleep_baseline_minutes: mean(before.map((s: { total_sleep_duration?: number }) => (s.total_sleep_duration ?? 0) / 60).filter(Boolean)),
    };
  },
};

const RUN_TYPES = new Set(['Run', 'TrailRun', 'VirtualRun']);
type StravaActivity = { type?: string; sport_type?: string; start_date: string; moving_time: number; average_heartrate?: number; distance?: number };
export const stravaRun = (a: StravaActivity): Run | null =>
  RUN_TYPES.has(a.sport_type ?? a.type ?? '')
    ? { startedAt: a.start_date, minutes: a.moving_time / 60, avgHr: a.average_heartrate ?? null, distanceKm: a.distance != null ? a.distance / 1000 : null }
    : null;

const strava: ProviderApi = {
  authorizeUrl: (state, redirectUri) =>
    `https://www.strava.com/oauth/authorize?${new URLSearchParams({
      client_id: env('STRAVA_CLIENT_ID'), response_type: 'code', redirect_uri: redirectUri,
      approval_prompt: 'auto', scope: 'activity:read', state,
    })}`,
  async exchangeCode(code) {
    const t = await postForm('https://www.strava.com/oauth/token', {
      client_id: env('STRAVA_CLIENT_ID'), client_secret: env('STRAVA_CLIENT_SECRET'), code, grant_type: 'authorization_code',
    });
    return { access_token: t.access_token, refresh_token: t.refresh_token, external_id: String(t.athlete?.id ?? ''),
      expires_at: new Date(t.expires_at * 1000).toISOString(), scope: 'activity:read' };
  },
  async refresh(refreshToken) {
    const t = await postForm('https://www.strava.com/oauth/token', {
      client_id: env('STRAVA_CLIENT_ID'), client_secret: env('STRAVA_CLIENT_SECRET'),
      grant_type: 'refresh_token', refresh_token: refreshToken,
    });
    return { access_token: t.access_token, refresh_token: t.refresh_token, expires_at: new Date(t.expires_at * 1000).toISOString() };
  },
  async fetchDay(token, date) {
    // Runs in the 24 hours before the start of the day (Garmin runs arrive through Strava).
    const end = Date.parse(`${date}T00:00:00Z`) / 1000;
    const activities: StravaActivity[] = await getJson(
      `https://www.strava.com/api/v3/athlete/activities?after=${end - 86400}&before=${end + 86400}&per_page=50`, token,
    );
    return { runs: activities.map(stravaRun).filter((r): r is Run => r !== null) };
  },
};

export const PROVIDERS: Record<Provider, ProviderApi> = { oura, strava };
export const isProvider = (p: unknown): p is Provider => p === 'oura' || p === 'strava';
