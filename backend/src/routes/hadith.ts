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

  try {
    const data = await utsGet<{ hits?: UtsHit[] }>('/api/search/hadiths', {
      q,
      limit: parseLimit(req.query.limit),
    });
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
    res.json({ hits, attribution: UTS_ATTRIBUTION });
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
