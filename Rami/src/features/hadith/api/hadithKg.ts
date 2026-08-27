/**
 * Hadith authenticity API — our own backend, which fronts the Qatar UTS
 * knowledge graph (github.com/qataruts/hadith, data CC-BY-4.0).
 *
 * Every value arrives wrapped in a `Field` that says where it came from. The
 * distinction matters and is deliberate: `source_claim` is what a classical
 * authority or the source dataset asserts, `computed` is what software derived.
 * The UI must render them apart, and nothing computed may be presented as a
 * grading. Types here mirror the backend's envelope so that rule survives.
 */

const API_BASE_URL =
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) ||
  'https://adventurous-bravery-production.up.railway.app/api';

const REQUEST_TIMEOUT_MS = 20000;

export type Provenance = 'source_claim' | 'computed';

export interface Field<T> {
  value: T;
  kind: Provenance;
  source: string;
  sourceRef?: string;
  license: string;
}

export interface Attribution {
  source: string;
  title: string;
  author: string;
  license: string;
  licenseUrl: string;
  datasetUrl: string;
}

export interface HadithHit {
  hadithId: number;
  book: { id: number | null; name: string | null };
  noInBook: number | string | null;
  /** طرف — the opening words of the hadith, which is what search returns */
  text: string | null;
  type: string | null;
  chainCount: number;
  hukm: Field<string> | null;
}

/** One narrator inside a chain, in transmission order. */
export interface ChainNarrator {
  rawiId: number;
  name: string | null;
  position: number | null;
  rank: Field<string> | null;
  tabaqa: number | null;
  /** 'tadlis' | 'ikhtilat' | 'stub' — recorded traits, not verdicts */
  flags: string[];
}

export interface ChainObservation {
  type: string;
  name?: string;
  rawiId?: number;
  rank?: string;
  label?: string;
}

export interface HadithChain {
  sanadId: number;
  narrators: ChainNarrator[];
  hukm: Field<string> | null;
  grade: Field<string> | null;
  observations: Field<ChainObservation[]>;
}

export interface HadithDetail {
  hadithId: number;
  text: string | null;
  book: { id: number | null };
  noInBook: number | string | null;
  type: string | null;
  hukm: Field<string> | null;
  chains: HadithChain[];
  attribution: Attribution;
}

export interface CriticStatement {
  text: Field<string>;
  critic: string | null;
  criticId: number | null;
  classification: Field<string> | null;
}

export interface RawiDossier {
  rawiId: number;
  name: string | null;
  rank: Field<string> | null;
  tabaqa: number | null;
  deathYear: number | null;
  /** Death year as the source wrote it, when it is not a plain number */
  deathYearRaw: string | null;
  flags: string[];
  statements: CriticStatement[];
  jarhSummary: Field<unknown> | null;
  teachers: Array<{ rawiId: number; name: string | null }>;
  students: Array<{ rawiId: number; name: string | null }>;
  attribution: Attribution;
}

/** Search hits plus whether they answer a widened query rather than the exact one. */
export interface HadithSearchResult {
  hits: HadithHit[];
  relaxed: boolean;
}

export type Outcome<T> =
  | { status: 'ok'; data: T }
  | { status: 'empty' }
  | { status: 'unavailable' }
  | { status: 'error' };

async function getJson<T>(path: string): Promise<T | 'unavailable' | 'error'> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    // 503 is the backend saying the hadith service is down or unconfigured —
    // worth telling the user apart from a request that simply failed.
    if (response.status === 503) return 'unavailable';
    if (!response.ok) return 'error';
    return (await response.json()) as T;
  } catch {
    return 'error';
  } finally {
    clearTimeout(timeout);
  }
}

export async function searchHadith(
  query: string,
  limit = 20
): Promise<Outcome<HadithSearchResult>> {
  const trimmed = query.trim();
  if (!trimmed) return { status: 'empty' };
  const result = await getJson<{ hits?: HadithHit[]; relaxed?: boolean }>(
    `/hadith/search?q=${encodeURIComponent(trimmed)}&limit=${limit}`
  );
  if (result === 'unavailable') return { status: 'unavailable' };
  if (result === 'error') return { status: 'error' };
  const hits = result.hits ?? [];
  if (hits.length === 0) return { status: 'empty' };
  return { status: 'ok', data: { hits, relaxed: Boolean(result.relaxed) } };
}

export async function getHadith(hadithId: number): Promise<Outcome<HadithDetail>> {
  const result = await getJson<HadithDetail>(`/hadith/${hadithId}`);
  if (result === 'unavailable') return { status: 'unavailable' };
  if (result === 'error') return { status: 'error' };
  return { status: 'ok', data: result };
}

export async function getRawi(rawiId: number): Promise<Outcome<RawiDossier>> {
  const result = await getJson<RawiDossier>(`/hadith/rawi/${rawiId}`);
  if (result === 'unavailable') return { status: 'unavailable' };
  if (result === 'error') return { status: 'error' };
  return { status: 'ok', data: result };
}
