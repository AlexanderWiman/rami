/**
 * Mushaf page layout from the Quran.com API (v4).
 *
 * `verses/by_page/{n}?words=true` returns every word of a printed page with the
 * QCF glyph (`code_v1`) and the printed line it sits on. A page has 15 lines;
 * lines with no words are the ones the print reserves for a surah header and
 * its basmala, so those gaps are filled in surah order. That reproduces the
 * printed page exactly — including surah 9, which has no basmala and therefore
 * leaves only a single gap line.
 */
import * as FileSystem from 'expo-file-system/legacy';

const API_BASE = 'https://api.quran.com/api/v4';
const LINES_PER_PAGE = 15;
const REQUEST_TIMEOUT_MS = 20000;
/**
 * Surahs that do not get a separate basmala line: surah 9 has no basmala at
 * all, and in surah 1 the basmala is verse 1 and thus part of the word lines.
 */
const SURAHS_WITHOUT_BASMALA_LINE = [1, 9];

export interface MushafWord {
  /** QCF v1 glyph for this word (or the verse-end ornament) */
  glyph: string;
  /** "2:255" — which verse the word belongs to, used for highlighting */
  verseKey: string;
  /** Verse number inside its surah */
  ayah: number;
  surah: number;
  /** True for the ornament that carries the verse number */
  isVerseEnd: boolean;
}

export type MushafLine =
  | { kind: 'words'; lineNumber: number; words: MushafWord[] }
  | { kind: 'surahName'; lineNumber: number; surah: number }
  | { kind: 'basmala'; lineNumber: number; surah: number }
  | { kind: 'blank'; lineNumber: number };

export interface MushafPageData {
  page: number;
  /** Juz this page falls in. Absent for pages cached before it was recorded. */
  juz?: number;
  lines: MushafLine[];
  /** Verse keys on the page in reading order — used to follow the recitation. */
  verseKeys: string[];
  /** Plain Uthmani text per verse, for the fallback renderer and for sharing. */
  uthmani: Record<string, string>;
}

interface ApiWord {
  char_type_name?: string;
  line_number?: number;
  code_v1?: string;
}

interface ApiVerse {
  verse_key: string;
  verse_number: number;
  text_uthmani?: string;
  juz_number?: number;
  words?: ApiWord[];
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
  } finally {
    clearTimeout(timeout);
  }
}

function getCacheDir(): string {
  const base = FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? '';
  return base.endsWith('/') ? `${base}mushaf_pages/` : `${base}/mushaf_pages/`;
}

async function readCache(page: number): Promise<MushafPageData | null> {
  try {
    const path = `${getCacheDir()}p${page}.json`;
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return null;
    const raw = await FileSystem.readAsStringAsync(path);
    const parsed = JSON.parse(raw) as MushafPageData;
    return Array.isArray(parsed?.lines) && parsed.lines.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

async function writeCache(page: number, data: MushafPageData): Promise<void> {
  try {
    const dir = getCacheDir();
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    await FileSystem.writeAsStringAsync(`${dir}p${page}.json`, JSON.stringify(data));
  } catch {
    /* caching is best effort */
  }
}

/** Turns the API verses into 15 printed lines. Exported for testing. */
export function buildLines(verses: ApiVerse[]): MushafLine[] {
  const wordsByLine = new Map<number, MushafWord[]>();
  const surahStartsInOrder: number[] = [];

  for (const verse of verses) {
    const [surahRaw, ayahRaw] = verse.verse_key.split(':');
    const surah = Number(surahRaw);
    const ayah = Number(ayahRaw);
    if (verse.verse_number === 1) surahStartsInOrder.push(surah);

    for (const word of verse.words ?? []) {
      const glyph = word.code_v1;
      const lineNumber = word.line_number;
      if (!glyph || typeof lineNumber !== 'number') continue;
      const list = wordsByLine.get(lineNumber) ?? [];
      list.push({
        glyph,
        verseKey: verse.verse_key,
        surah,
        ayah,
        isVerseEnd: word.char_type_name === 'end',
      });
      wordsByLine.set(lineNumber, list);
    }
  }

  // Header lines a printed page reserves, in the order they appear.
  const headerQueue: Array<{ kind: 'surahName' | 'basmala'; surah: number }> = [];
  for (const surah of surahStartsInOrder) {
    headerQueue.push({ kind: 'surahName', surah });
    if (!SURAHS_WITHOUT_BASMALA_LINE.includes(surah)) headerQueue.push({ kind: 'basmala', surah });
  }

  const lines: MushafLine[] = [];
  for (let lineNumber = 1; lineNumber <= LINES_PER_PAGE; lineNumber += 1) {
    const words = wordsByLine.get(lineNumber);
    if (words && words.length > 0) {
      lines.push({ kind: 'words', lineNumber, words });
      continue;
    }
    const header = headerQueue.shift();
    if (header) {
      lines.push({ kind: header.kind, lineNumber, surah: header.surah });
    } else {
      lines.push({ kind: 'blank', lineNumber });
    }
  }

  // Pages 1 and 2 are printed with fewer, larger lines; drop the trailing
  // blanks so they are not rendered as a tall run of empty rows.
  while (lines.length > 0 && lines[lines.length - 1].kind === 'blank') lines.pop();

  return lines;
}

/**
 * Page layout for `page` (1–604). Reads the on-device cache first, so a page
 * that has been opened once works offline. Returns null on failure.
 */
export async function getMushafPage(page: number): Promise<MushafPageData | null> {
  const cached = await readCache(page);
  if (cached) return cached;

  try {
    const url =
      `${API_BASE}/verses/by_page/${page}` +
      '?words=true&per_page=50&fields=text_uthmani,juz_number' +
      '&word_fields=code_v1,line_number,char_type_name';
    const response = await fetchWithTimeout(url);
    if (!response.ok) return null;
    const json = (await response.json()) as { verses?: ApiVerse[] };
    const verses = json.verses ?? [];
    if (verses.length === 0) return null;

    const data: MushafPageData = {
      page,
      juz: verses[0]?.juz_number,
      lines: buildLines(verses),
      verseKeys: verses.map((v) => v.verse_key),
      uthmani: Object.fromEntries(verses.map((v) => [v.verse_key, v.text_uthmani ?? ''])),
    };
    await writeCache(page, data);
    return data;
  } catch {
    return null;
  }
}
