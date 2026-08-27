/**
 * Which printed pages each surah occupies, from the Quran.com chapters endpoint.
 *
 * The local PAGE_MAP is an approximation past page 50, so it cannot be used to
 * jump to a surah — it would land on the wrong page. These ranges come from the
 * same source as the page layout we render, so a jump lands where the surah
 * actually starts in the Medina mushaf.
 *
 * Fetched once and cached on device; a surah's page range never changes.
 */
import * as FileSystem from 'expo-file-system/legacy';

const API_URL = 'https://api.quran.com/api/v4/chapters';
const REQUEST_TIMEOUT_MS = 15000;
const CACHE_FILE = 'surah_pages.json';

/** surah number → [first page, last page] */
export type SurahPageRanges = Record<number, [number, number]>;

interface ApiChapter {
  id: number;
  pages?: [number, number];
}

let memoryCache: SurahPageRanges | null = null;

function cachePath(): string {
  const base = FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? '';
  return `${base.endsWith('/') ? base : `${base}/`}${CACHE_FILE}`;
}

async function readCache(): Promise<SurahPageRanges | null> {
  try {
    const info = await FileSystem.getInfoAsync(cachePath());
    if (!info.exists) return null;
    const parsed = JSON.parse(await FileSystem.readAsStringAsync(cachePath())) as SurahPageRanges;
    return Object.keys(parsed).length === 114 ? parsed : null;
  } catch {
    return null;
  }
}

async function writeCache(ranges: SurahPageRanges): Promise<void> {
  try {
    await FileSystem.writeAsStringAsync(cachePath(), JSON.stringify(ranges));
  } catch {
    /* caching is best effort */
  }
}

/** Page ranges for all 114 surahs, or null when unavailable offline on first use. */
export async function getSurahPageRanges(): Promise<SurahPageRanges | null> {
  if (memoryCache) return memoryCache;

  const cached = await readCache();
  if (cached) {
    memoryCache = cached;
    return cached;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(API_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    const json = (await response.json()) as { chapters?: ApiChapter[] };
    const ranges: SurahPageRanges = {};
    for (const chapter of json.chapters ?? []) {
      if (chapter.pages && chapter.pages.length === 2) ranges[chapter.id] = chapter.pages;
    }
    if (Object.keys(ranges).length !== 114) return null;
    memoryCache = ranges;
    void writeCache(ranges);
    return ranges;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
