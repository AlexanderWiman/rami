/**
 * Quran Foundation content API.
 *
 * The new API is the same v4 shape the app already talks to, moved behind
 * OAuth2 client credentials: a token is fetched with the client id and secret,
 * then content requests carry `x-client-id` and `x-auth-token`. Those header
 * names are not guesswork — they are what the foundation's own JS SDK sends
 * (quran/api-js, sdk/fetcher.ts), where `Authorization: Bearer` is used only
 * against the oauth2 service itself.
 *
 * Credentials live here rather than in the app, which is the whole reason to
 * proxy: a client secret cannot ship inside a mobile bundle.
 *
 * Until QURAN_CLIENT_ID and QURAN_CLIENT_SECRET are set, this falls back to the
 * public unauthenticated v4 host the app used before, so the endpoints keep
 * answering and flip over the moment the credentials arrive.
 */

const CLIENT_ID = process.env.QURAN_CLIENT_ID;
const CLIENT_SECRET = process.env.QURAN_CLIENT_SECRET;
/** 'production' | 'prelive' — registration hands out pre-live credentials first. */
const ENVIRONMENT = process.env.QURAN_API_ENV === 'production' ? 'production' : 'prelive';

const HOSTS = {
  production: {
    content: 'https://apis.quran.foundation/content/api/v4',
    token: 'https://oauth2.quran.foundation/oauth2/token',
  },
  prelive: {
    content: 'https://apis-prelive.quran.foundation/content/api/v4',
    token: 'https://prelive-oauth2.quran.foundation/oauth2/token',
  },
} as const;

/** Used while no credentials are configured. No auth, no user features. */
const PUBLIC_CONTENT_BASE = 'https://api.quran.com/api/v4';

/** Per-verse audio comes back as a path; this is the host that serves it. */
export const AUDIO_CDN_BASE = 'https://verses.quran.foundation';

const REQUEST_TIMEOUT_MS = 20000;
/** Refresh a little early so a request never races the expiry. */
const TOKEN_EXPIRY_MARGIN_MS = 60_000;

export function isQuranApiAuthenticated(): boolean {
  return Boolean(CLIENT_ID && CLIENT_SECRET);
}

let cachedToken: { value: string; expiresAt: number } | null = null;
/** In-flight token request, so a burst of calls fetches one token, not many. */
let pendingToken: Promise<string> | null = null;

export class QuranApiError extends Error {}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function requestToken(): Promise<string> {
  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const response = await fetchWithTimeout(HOSTS[ENVIRONMENT].token, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=content',
  });
  if (!response.ok) {
    throw new QuranApiError(`token request failed (${response.status})`);
  }
  const json = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) throw new QuranApiError('token response had no access_token');

  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000 - TOKEN_EXPIRY_MARGIN_MS,
  };
  return cachedToken.value;
}

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;
  if (!pendingToken) {
    pendingToken = requestToken().finally(() => {
      pendingToken = null;
    });
  }
  return pendingToken;
}

/**
 * GET a content path such as `/resources/recitations`. Returns null on 404.
 * Throws QuranApiError when the upstream is unreachable or refuses the call.
 */
export async function quranContentGet<T>(
  path: string,
  params?: Record<string, string | number>
): Promise<T | null> {
  const base = isQuranApiAuthenticated() ? HOSTS[ENVIRONMENT].content : PUBLIC_CONTENT_BASE;
  const url = new URL(`${base}${path}`);
  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, String(value));
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (isQuranApiAuthenticated()) {
    headers['x-client-id'] = CLIENT_ID as string;
    headers['x-auth-token'] = await getToken();
  }

  try {
    const response = await fetchWithTimeout(url.toString(), { headers });
    if (response.status === 404) return null;
    if (response.status === 401 || response.status === 403) {
      // A stale token is the likely cause; drop it so the next call re-fetches.
      cachedToken = null;
      throw new QuranApiError(`content request rejected (${response.status})`);
    }
    if (!response.ok) throw new QuranApiError(`content request failed (${response.status})`);
    return (await response.json()) as T;
  } catch (err) {
    if (err instanceof QuranApiError) throw err;
    throw new QuranApiError(err instanceof Error ? err.message : 'content request failed');
  }
}

/**
 * Audio arrives in three shapes: absolute, a path relative to the audio CDN, or
 * — for some reciters, such as al-Tablawi — a bare host with no scheme like
 * `mirrors.quranicaudio.com/everyayah/...`. Prefixing that last kind with the
 * CDN base produces a 404, so a leading hostname is given a scheme instead.
 */
export function toAbsoluteAudioUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;

  const trimmed = url.replace(/^\/+/, '');
  const firstSegment = trimmed.split('/')[0] ?? '';
  if (firstSegment.includes('.') && !firstSegment.endsWith('.mp3')) {
    return `https://${trimmed}`;
  }
  return `${AUDIO_CDN_BASE}/${trimmed}`;
}
