/**
 * Client for the Qatar UTS hadith knowledge-graph API (github.com/qataruts/hadith).
 *
 * The UTS server is deployed separately with the CC-BY-4.0 databases mounted;
 * UTS_API_URL points at it. Nothing here reshapes meaning — the job is to fetch,
 * fail predictably, and hand the raw payload to the route layer, which is what
 * wraps values in their provenance envelope.
 */

const UTS_API_URL = process.env.UTS_API_URL;
const REQUEST_TIMEOUT_MS = 20000;

/** Where a value came from, and whether anyone is allowed to read it as a ruling. */
export type Provenance =
  /** The source's own statement — a classical ruling, a critic's words, a grade. */
  | 'source_claim'
  /** Derived by software from source data. Never a ruling, never a grade. */
  | 'computed';

export interface Field<T> {
  value: T;
  kind: Provenance;
  /** Dataset the value is taken from */
  source: string;
  /** Table/column or endpoint the value came from, so a claim can be traced */
  sourceRef?: string;
  license: string;
}

export const UTS_SOURCE = 'qatar-uts';
export const UTS_LICENSE = 'CC-BY-4.0';

/** Attribution the app must display; CC-BY-4.0 makes this mandatory, not optional. */
export const UTS_ATTRIBUTION = {
  source: UTS_SOURCE,
  title: 'Hadith Knowledge Graph (الجامع)',
  author: 'Emad Jumaah',
  license: UTS_LICENSE,
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  datasetUrl: 'https://huggingface.co/datasets/emadjumaah/hadith-kg',
} as const;

/** A value the source itself asserts. */
export function claim<T>(value: T, sourceRef?: string): Field<T> {
  return { value, kind: 'source_claim', source: UTS_SOURCE, sourceRef, license: UTS_LICENSE };
}

/** A value this system derived. Kept in its own field so it can never pose as a ruling. */
export function computed<T>(value: T, sourceRef?: string): Field<T> {
  return { value, kind: 'computed', source: `${UTS_SOURCE}+rami`, sourceRef, license: UTS_LICENSE };
}

export class UtsUnavailableError extends Error {}

export function isUtsConfigured(): boolean {
  return Boolean(UTS_API_URL);
}

/**
 * GET `path` from the UTS API. Throws UtsUnavailableError when the service is
 * unreachable or misconfigured, so routes can answer 503 rather than 500.
 */
export async function utsGet<T>(path: string, params?: Record<string, string | number>): Promise<T | null> {
  if (!UTS_API_URL) throw new UtsUnavailableError('UTS_API_URL is not set');

  const url = new URL(path, UTS_API_URL);
  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, String(value));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new UtsUnavailableError(`UTS responded ${response.status}`);
    return (await response.json()) as T;
  } catch (err) {
    if (err instanceof UtsUnavailableError) throw err;
    throw new UtsUnavailableError(err instanceof Error ? err.message : 'UTS request failed');
  } finally {
    clearTimeout(timeout);
  }
}
