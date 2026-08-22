/**
 * Hadith grading via the official Dorar al-Saniyya encyclopaedia API
 * (https://dorar.net/article/389 — "خدمة واجهة الموسوعة الحديثية API").
 *
 * GET https://dorar.net/dorar_api.json?skey=<query>&page=<n>
 *   → { ahadith: { result: "<html fragment>" } }
 *
 * The fragment repeats, once per hadith: the hadith text, then an info block
 * whose labels are الراوي / المحدث / المصدر / الصفحة أو الرقم / خلاصة حكم المحدث.
 *
 * React Native has no DOM, so the fragment is parsed as a string. Rather than
 * matching (possibly nested) <div> elements, records are cut on the positions
 * of the labels themselves: a new record starts at every الراوي label, and the
 * markup between two records is that record's hadith text.
 */

const DORAR_API_URL = 'https://dorar.net/dorar_api.json';
const REQUEST_TIMEOUT_MS = 15000;

export interface HadithResult {
  /** Hadith text (Arabic, diacritics as returned) */
  hadith: string;
  /** الراوي — the companion who narrated it */
  rawi: string;
  /** المحدث — the scholar who graded it */
  mohdith: string;
  /** المصدر — the book the grading is taken from */
  book: string;
  /** الصفحة أو الرقم — page or hadith number in that book */
  numberOrPage: string;
  /** درجة الحديث / خلاصة حكم المحدث — the grading itself */
  grade: string;
}

export type HadithSearchOutcome =
  | { status: 'ok'; results: HadithResult[] }
  | { status: 'empty' }
  | { status: 'error'; error: string };

/** Named entities that appear in Dorar's markup, plus numeric ones. */
function decodeEntities(input: string): string {
  return input
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code: string) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/** Strips tags, decodes entities and collapses whitespace. */
function toPlainText(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

/** Field order as Dorar prints it. `grade` accepts either grading label. */
const FIELD_LABELS: ReadonlyArray<{ field: keyof Omit<HadithResult, 'hadith'>; labels: string[] }> = [
  { field: 'rawi', labels: ['الراوي'] },
  { field: 'mohdith', labels: ['المحدث'] },
  { field: 'book', labels: ['المصدر'] },
  { field: 'numberOrPage', labels: ['الصفحة أو الرقم'] },
  { field: 'grade', labels: ['درجة الحديث', 'خلاصة حكم المحدث'] },
];

const RECORD_START_LABEL = 'الراوي';

interface LabelHit {
  field: keyof Omit<HadithResult, 'hadith'>;
  /** Index of the label in the fragment */
  start: number;
  /** Index just past the label text */
  end: number;
}

/** All label occurrences in document order. */
function findLabelHits(html: string): LabelHit[] {
  const hits: LabelHit[] = [];
  for (const { field, labels } of FIELD_LABELS) {
    for (const label of labels) {
      let from = 0;
      for (;;) {
        const idx = html.indexOf(label, from);
        if (idx === -1) break;
        hits.push({ field, start: idx, end: idx + label.length });
        from = idx + label.length;
      }
    }
  }
  return hits.sort((a, b) => a.start - b.start);
}

/** Leading colons/pipes and trailing pipes that Dorar puts around values. */
function cleanValue(text: string): string {
  return text
    .replace(/^[:：|\s-]+/, '')
    .replace(/[|\s]+$/, '')
    .trim();
}

/**
 * Value of one field: the markup between the label and whichever comes first —
 * the next label or the end of the element holding the value. Bounding on the
 * closing tag keeps a missing value from swallowing the next hadith's text.
 */
function readValue(html: string, hit: LabelHit, nextLabelStart: number): string {
  const closingDiv = html.indexOf('</div>', hit.end);
  const candidates = [nextLabelStart, closingDiv === -1 ? html.length : closingDiv];
  const end = Math.min(...candidates.filter((n) => n > hit.end));
  return cleanValue(toPlainText(html.slice(hit.end, end)));
}

/** Parses the HTML fragment returned in `ahadith.result`. */
export function parseDorarHtml(html: string): HadithResult[] {
  const hits = findLabelHits(html);
  if (hits.length === 0) return [];

  // Group hits into records; every الراوي label opens a new record.
  const groups: LabelHit[][] = [];
  for (const hit of hits) {
    const isRecordStart = hit.field === 'rawi';
    if (isRecordStart || groups.length === 0) groups.push([hit]);
    else groups[groups.length - 1].push(hit);
  }

  const results: HadithResult[] = [];
  for (let i = 0; i < groups.length; i += 1) {
    const group = groups[i];
    const groupStart = group[0].start;
    // Hadith text = markup between the previous record's last field and this
    // record's first label, with the info block's own tags stripped out.
    const previousGroup = i > 0 ? groups[i - 1] : null;
    const textFrom = previousGroup
      ? readValueEnd(html, previousGroup[previousGroup.length - 1], groupStart)
      : 0;
    const hadith = toPlainText(html.slice(textFrom, groupStart))
      .replace(new RegExp(`${RECORD_START_LABEL}\\s*:?\\s*$`), '')
      .replace(/^\d+\s*-\s*/, '')
      .trim();

    const record: HadithResult = {
      hadith,
      rawi: '',
      mohdith: '',
      book: '',
      numberOrPage: '',
      grade: '',
    };
    for (let j = 0; j < group.length; j += 1) {
      const hit = group[j];
      // A field runs until the next label in this record, or until the next record.
      const boundary =
        j + 1 < group.length ? group[j + 1].start : nextRecordStart(groups, i, html.length);
      const value = readValue(html, hit, boundary);
      // Keep the first non-empty value: `grade` has two possible labels.
      if (value.length > 0 && record[hit.field].length === 0) record[hit.field] = value;
    }

    if (hadith.length > 0) results.push(record);
  }

  return results;
}

/** Start of the next record, or `fallback` for the last one. */
function nextRecordStart(groups: LabelHit[][], index: number, fallback: number): number {
  const next = groups[index + 1];
  return next ? next[0].start : fallback;
}

/** Where a field's value ends — used as the start of the following hadith text. */
function readValueEnd(html: string, hit: LabelHit, limit: number): number {
  const closingDiv = html.indexOf('</div>', hit.end);
  if (closingDiv !== -1 && closingDiv < limit) return closingDiv;
  return hit.end;
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json, text/plain, */*' },
    });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Searches the encyclopaedia. `page` is 1-based; Dorar returns ~15 per page.
 * Never throws — network and parse problems come back as { status: 'error' }.
 */
export async function searchHadith(query: string, page = 1): Promise<HadithSearchOutcome> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return { status: 'empty' };

  const url = `${DORAR_API_URL}?skey=${encodeURIComponent(trimmed)}&page=${page}`;
  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      return { status: 'error', error: `HTTP ${response.status}` };
    }
    const data = (await response.json()) as { ahadith?: { result?: string } };
    const fragment = data?.ahadith?.result;
    if (typeof fragment !== 'string' || fragment.trim().length === 0) {
      return { status: 'empty' };
    }
    const results = parseDorarHtml(fragment);
    return results.length > 0 ? { status: 'ok', results } : { status: 'empty' };
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      return { status: 'error', error: 'timeout' };
    }
    return { status: 'error', error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
