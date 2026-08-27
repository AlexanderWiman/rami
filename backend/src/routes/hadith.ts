/**
 * Hadith authenticity API — search, full hadith with its isnad, narrator dossiers.
 *
 * Backed by the Qatar UTS knowledge graph. Every value the app receives is
 * wrapped so it carries its own provenance: a `source_claim` is something the
 * source asserts (a classical ruling, a critic's words, a narrator's grade), a
 * `computed` field is something software derived. The app renders the two in
 * separate blocks, and nothing here ever synthesises a grading — the source's
 * hukm is passed through untouched or it is absent.
 */
import { Router } from 'express';
import {
  utsGet,
  claim,
  computed,
  isUtsConfigured,
  UtsUnavailableError,
  UTS_ATTRIBUTION,
  type Field,
} from '../services/utsClient';

const router = Router();

const MAX_LIMIT = 50;

/** Shapes returned by the UTS API, narrowed to the fields used here. */
interface UtsHit {
  hadithId: number;
  bookId?: number;
  bookName?: string;
  noInBook?: number | string;
  taraf?: string;
  hukm?: string;
  type?: string;
  groupId?: number;
  sanadCount?: number;
}

/** One link of a chain as `/api/hadith/:id` returns it, inside `sanad.chain`. */
interface UtsChainLink {
  rawiId: number;
  name?: string;
  rank?: string;
  tabaka?: number;
  /** 0 is the collection's author; the chain ascends towards the Companion. */
  pos?: number;
}

interface UtsWhySanad {
  sanadId: number;
  grade?: string;
  gradeClass?: string;
  hukm?: string;
  weakest?: { name?: string; rank?: string; rawiId?: number } | null;
  observations?: Array<{ type: string; name?: string; rawiId?: number; rank?: string; label?: string }>;
}

interface UtsHadith {
  hadithId: number;
  nass?: string;
  bookId?: number;
  noInBook?: number | string;
  hukm?: string;
  type?: string;
  groupId?: number;
  sanads?: Array<{
    sanadId?: number;
    hukm?: string;
    grade?: string;
    length?: number;
    chain?: UtsChainLink[];
  }>;
}

interface UtsQawl {
  qawl?: string;
  /** The critic (عالم) who said it */
  alem?: string;
  alemId?: number;
  /** UTS's own tagging of the statement: tadil | jarh | jahala */
  cls?: string;
}

interface UtsRawi {
  rawiId: number;
  name?: string;
  nickname?: string;
  rank?: string;
  tabaka?: number;
  deathYear?: number;
  deathYearRaw?: string;
  hasTadlis?: number | boolean;
  hasIkhtilat?: number | boolean;
  isStub?: number | boolean;
  aqwal?: UtsQawl[];
  jarh?: unknown;
  teachers?: Array<{ id: number; name?: string; n?: number }>;
  students?: Array<{ id: number; name?: string; n?: number }>;
}

function parseLimit(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 20;
  return Math.min(MAX_LIMIT, Math.floor(n));
}

/** Narrator traits the source records. Presented as notes, never as a verdict. */
function narratorFlags(r: {
  hasTadlis?: number | boolean;
  hasIkhtilat?: number | boolean;
  isStub?: number | boolean;
}): string[] {
  const flags: string[] = [];
  if (r.hasTadlis) flags.push('tadlis');
  if (r.hasIkhtilat) flags.push('ikhtilat');
  if (r.isStub) flags.push('stub');
  return flags;
}

/**
 * Arabic normalisation for our own query handling. UTS normalises server-side
 * too, but the relaxation ladder below needs to tokenise and measure terms, so
 * it has to see the same normalised form.
 */
function normalizeArabic(input: string): string {
  return input
    .replace(/[\u064B-\u0652\u0670\u0653-\u0655]/g, '') // harakat
    .replace(/\u0640/g, '') // tatweel
    .replace(/[\u0622\u0623\u0625]/g, '\u0627') // آ أ إ → ا
    .replace(/\u0649/g, '\u064A') // ى → ي
    .replace(/\u0629/g, '\u0647') // ة → ه
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Function words and formulaic openings that carry almost no selectivity in a
 * matn search — "قال رسول الله" matches a large share of the corpus.
 */
const LOW_VALUE_TERMS = new Set([
  'من', 'في', 'عن', 'علي', 'الي', 'ان', 'ما', 'لا', 'او', 'ثم', 'قد', 'كان',
  'كانت', 'هذا', 'هذه', 'ذلك', 'التي', 'الذي', 'له', 'لها', 'به', 'بها',
  'عليه', 'عليها', 'قال', 'قالت', 'يا', 'وقال', 'رسول', 'الله', 'النبي',
  'صلي', 'وسلم', 'حدثنا', 'اخبرنا', 'بن', 'ابن', 'ابي', 'وهو', 'كل',
]);

/** Terms worth searching on, most distinctive first (longest ≈ most specific). */
function distinctiveTerms(tokens: string[]): string[] {
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const term of tokens) {
    if (term.length < 3 || LOW_VALUE_TERMS.has(term) || seen.has(term)) continue;
    seen.add(term);
    terms.push(term);
  }
  return terms.sort((a, b) => b.length - a.length);
}

/** How much search signal a run of words carries: content words, weighted by length. */
function windowScore(words: string[]): number {
  let score = 0;
  for (const w of words) {
    if (w.length < 3 || LOW_VALUE_TERMS.has(w)) continue;
    score += w.length + 2;
  }
  return score;
}

/**
 * Runs of `size` consecutive words, richest in content words first.
 *
 * A pasted hadith carries its matn contiguously, so some window of it matches
 * the printed text even though the whole paste never will. Ordering by content
 * matters: the isnad also forms windows, and those would otherwise be tried
 * first and answer with whatever book happens to share a narrator's name.
 */
function contentWindows(tokens: string[], size: number, max: number): string[] {
  if (tokens.length <= size) return [];
  const windows: Array<{ q: string; score: number }> = [];
  for (let i = 0; i + size <= tokens.length; i += 1) {
    const words = tokens.slice(i, i + size);
    const score = windowScore(words);
    if (score === 0) continue;
    windows.push({ q: words.join(' '), score });
  }
  return windows
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((w) => w.q);
}

/** Attempts are capped so a hopeless query cannot fan out into many requests. */
const MAX_QUERY_ATTEMPTS = 10;

/**
 * Query variants to try, in order, until one returns hits.
 *
 * The first is always what the user typed — an exact phrase should win on its
 * own terms. After that the net widens in the order that keeps precision
 * longest: contiguous runs of the input (a pasted hadith), then its most
 * distinctive words, then prefix forms (a term whose ending differs, which is
 * what a missing letter usually amounts to), and only last an OR across terms,
 * which always matches something and so must never pre-empt a sharper attempt.
 */
function buildQueryLadder(query: string): string[] {
  const ladder = [query.trim()];
  const tokens = normalizeArabic(query).split(' ').filter(Boolean);
  const terms = distinctiveTerms(tokens);
  if (terms.length === 0) return ladder;

  const add = (candidate: string) => {
    if (candidate && !ladder.includes(candidate) && ladder.length < MAX_QUERY_ATTEMPTS) {
      ladder.push(candidate);
    }
  };
  const top = (n: number) => terms.slice(0, n);

  for (const w of contentWindows(tokens, 4, 2)) add(w);
  for (const w of contentWindows(tokens, 3, 2)) add(w);
  if (terms.length > 1) add(top(4).join(' '));
  add(top(4).map((t) => `${t}*`).join(' '));
  // OR before the weak two-term AND: when the user's wording substitutes a word,
  // ranking across many terms finds the intended hadith, whereas two common
  // words in isolation tend to land on an unrelated narration that shares them.
  if (terms.length > 1) add(top(6).join(' OR '));
  add(top(2).join(' '));
  add(terms[0]);
  add(`${terms[0]}*`);
  return ladder;
}

function sendUnavailable(res: Parameters<Parameters<typeof router.get>[1]>[1], err: unknown): void {
  const message = err instanceof Error ? err.message : 'Hadith service unavailable';
  console.error('UTS error:', message);
  res.status(503).json({ error: 'hadith_service_unavailable' });
}

/** Search the corpus. Returns identity plus the source's own ruling, nothing derived. */
router.get('/search', async (req, res) => {
  if (!isUtsConfigured()) {
    res.status(503).json({ error: 'hadith_service_unconfigured' });
    return;
  }
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!q) {
    res.json({ hits: [], attribution: UTS_ATTRIBUTION });
    return;
  }

  const limit = parseLimit(req.query.limit);

  try {
    // Walk the ladder until something matches. `relaxed` tells the app that the
    // hits answer a widened query, so it can say so rather than implying the
    // user's exact wording was found.
    const ladder = buildQueryLadder(q);
    let data: { hits?: UtsHit[] } | null = null;
    let matchedQuery = q;
    for (const candidate of ladder) {
      data = await utsGet<{ hits?: UtsHit[] }>('/api/search/hadiths', { q: candidate, limit });
      if ((data?.hits ?? []).length > 0) {
        matchedQuery = candidate;
        break;
      }
    }

    const hits = (data?.hits ?? []).map((h) => ({
      hadithId: h.hadithId,
      book: { id: h.bookId ?? null, name: h.bookName ?? null },
      noInBook: h.noInBook ?? null,
      text: h.taraf ?? null,
      type: h.type ?? null,
      chainCount: h.sanadCount ?? 0,
      /** The source's ruling as printed. Absent when the source has none. */
      hukm: h.hukm ? claim(h.hukm, `hadiths.hukm#${h.hadithId}`) : null,
    }));
    res.json({
      hits,
      relaxed: matchedQuery !== q,
      matchedQuery,
      attribution: UTS_ATTRIBUTION,
    });
  } catch (err) {
    sendUnavailable(res, err);
  }
});

/**
 * One hadith in full: text, every isnad as an ordered chain of narrators, the
 * source's ruling per chain, and the derived isnad observations kept apart.
 */
router.get('/:id(\\d+)', async (req, res) => {
  if (!isUtsConfigured()) {
    res.status(503).json({ error: 'hadith_service_unconfigured' });
    return;
  }
  const id = Number(req.params.id);

  try {
    const [hadith, why] = await Promise.all([
      utsGet<UtsHadith>(`/api/hadith/${id}`),
      utsGet<{ sanads?: UtsWhySanad[] }>(`/api/hadith/${id}/why`),
    ]);
    if (!hadith) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    const whyBySanad = new Map<number, UtsWhySanad>();
    for (const s of why?.sanads ?? []) whyBySanad.set(s.sanadId, s);

    const chains = (hadith.sanads ?? []).map((sanad) => {
      const sanadId = sanad.sanadId ?? 0;
      const w = whyBySanad.get(sanadId);
      // pos 0 is the collection's author; the chain ascends to the Companion, so
      // transmission order (Prophet ﷺ → … → author) is the reverse of pos order.
      const narrators = [...(sanad.chain ?? [])]
        .sort((a, b) => (b.pos ?? 0) - (a.pos ?? 0))
        .map((r) => ({
          rawiId: r.rawiId,
          name: r.name ?? null,
          position: r.pos ?? null,
          rank: r.rank ? claim(r.rank, `rawis.rank#${r.rawiId}`) : null,
          tabaqa: r.tabaka ?? null,
          flags: [] as string[],
        }));

      const hukm = sanad.hukm ?? w?.hukm;
      const grade = sanad.grade ?? w?.grade;
      return {
        sanadId,
        narrators,
        /** The source's ruling on this chain, verbatim. */
        hukm: hukm ? claim(hukm, `sanads.hukum#${sanadId}`) : null,
        grade: grade ? claim(grade, `sanads.matn#${sanadId}`) : null,
        /**
         * Structural notes computed from the chain (broken link, tadlis,
         * ikhtilat, weakest narrator). Evidence for the reader — not a ruling.
         */
        observations: computed(w?.observations ?? [], `hadith/${id}/why`),
      };
    });

    res.json({
      hadithId: hadith.hadithId,
      text: hadith.nass ?? null,
      book: { id: hadith.bookId ?? null },
      noInBook: hadith.noInBook ?? null,
      type: hadith.type ?? null,
      hukm: hadith.hukm ? claim(hadith.hukm, `hadiths.hukm#${id}`) : null,
      chains,
      attribution: UTS_ATTRIBUTION,
    });
  } catch (err) {
    sendUnavailable(res, err);
  }
});

/**
 * Narrator dossier: biography, and every critic's statement (jarh wa ta'dil) as
 * written. The aggregated leaning is returned separately and clearly computed.
 */
router.get('/rawi/:id(\\d+)', async (req, res) => {
  if (!isUtsConfigured()) {
    res.status(503).json({ error: 'hadith_service_unconfigured' });
    return;
  }
  const id = Number(req.params.id);

  try {
    const rawi = await utsGet<UtsRawi>(`/api/rawi/${id}`);
    if (!rawi) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    const statements = (rawi.aqwal ?? []).map((a, index) => ({
      /** The critic's words, unedited. This is the primary evidence. */
      text: claim(a.qawl ?? '', `aqwal#${id}.${index}`),
      critic: a.alem ?? null,
      criticId: a.alemId ?? null,
      /** Software's reading of that statement's leaning. Never shown as a grade. */
      classification: a.cls ? computed(a.cls, `aqwal#${id}.${index}`) : null,
    }));

    res.json({
      rawiId: rawi.rawiId,
      name: rawi.nickname ?? rawi.name ?? null,
      rank: rawi.rank ? claim(rawi.rank, `rawis.rank#${id}`) : null,
      tabaqa: rawi.tabaka ?? null,
      deathYear: rawi.deathYear ?? null,
      deathYearRaw: rawi.deathYearRaw ?? null,
      flags: narratorFlags(rawi),
      statements,
      /** Aggregate leaning across the statements above — computed, advisory. */
      jarhSummary: rawi.jarh ? computed(rawi.jarh, `rawi/${id}`) : null,
      teachers: (rawi.teachers ?? []).map((t) => ({ rawiId: t.id, name: t.name ?? null })),
      students: (rawi.students ?? []).map((t) => ({ rawiId: t.id, name: t.name ?? null })),
      attribution: UTS_ATTRIBUTION,
    });
  } catch (err) {
    sendUnavailable(res, err);
  }
});

export default router;
export type { Field };
