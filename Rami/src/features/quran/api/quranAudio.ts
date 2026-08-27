/**
 * Per-verse audio URLs from our backend, which fronts the Quran Foundation API.
 *
 * One request returns every verse's URL for a surah, so playback stops guessing
 * URL patterns per reciter and per CDN. The map is cached in memory for the
 * session and on disk for good, since a reciter's files do not move.
 *
 * Every function here fails soft and returns null: the caller keeps the legacy
 * URL builder as a fallback, so a backend hiccup makes recitation no worse than
 * it was before this existed.
 */
import * as FileSystem from 'expo-file-system/legacy';

const API_BASE_URL =
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) ||
  'https://adventurous-bravery-production.up.railway.app/api';

const REQUEST_TIMEOUT_MS = 20000;
const CACHE_DIR_NAME = 'quran_audio_urls';

/** ayah number within the surah → absolute audio URL */
export type SurahAudioUrls = Record<number, string>;

const memoryCache = new Map<string, SurahAudioUrls>();
/** In-flight requests, so a burst for the same surah makes one call. */
const pending = new Map<string, Promise<SurahAudioUrls | null>>();

function cacheKey(apiId: number, surah: number): string {
  return `${apiId}_${surah}`;
}

function cacheDir(): string {
  const base = FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? '';
  return `${base.endsWith('/') ? base : `${base}/`}${CACHE_DIR_NAME}/`;
}

async function readDiskCache(key: string): Promise<SurahAudioUrls | null> {
  try {
    const path = `${cacheDir()}${key}.json`;
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return null;
    const parsed = JSON.parse(await FileSystem.readAsStringAsync(path)) as SurahAudioUrls;
    return Object.keys(parsed).length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

async function writeDiskCache(key: string, urls: SurahAudioUrls): Promise<void> {
  try {
    const dir = cacheDir();
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    await FileSystem.writeAsStringAsync(`${dir}${key}.json`, JSON.stringify(urls));
  } catch {
    /* caching is best effort */
  }
}

async function fetchFromBackend(apiId: number, surah: number): Promise<SurahAudioUrls | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(
      `${API_BASE_URL}/quran/recitations/${apiId}/chapter/${surah}`,
      { signal: controller.signal, headers: { Accept: 'application/json' } }
    );
    if (!response.ok) return null;
    const json = (await response.json()) as {
      files?: Array<{ verseKey?: string; url?: string }>;
    };
    const urls: SurahAudioUrls = {};
    for (const file of json.files ?? []) {
      const ayah = Number(file.verseKey?.split(':')[1]);
      if (Number.isFinite(ayah) && file.url) urls[ayah] = file.url;
    }
    return Object.keys(urls).length > 0 ? urls : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Every verse's audio URL for one surah. Returns null when neither the cache nor
 * the backend can supply them, which is the caller's cue to fall back.
 */
export async function getSurahAudioUrls(
  apiId: number,
  surah: number
): Promise<SurahAudioUrls | null> {
  const key = cacheKey(apiId, surah);

  const inMemory = memoryCache.get(key);
  if (inMemory) return inMemory;

  const existing = pending.get(key);
  if (existing) return existing;

  const work = (async () => {
    const cached = await readDiskCache(key);
    if (cached) {
      memoryCache.set(key, cached);
      return cached;
    }
    const fetched = await fetchFromBackend(apiId, surah);
    if (fetched) {
      memoryCache.set(key, fetched);
      void writeDiskCache(key, fetched);
    }
    return fetched;
  })().finally(() => {
    pending.delete(key);
  });

  pending.set(key, work);
  return work;
}

/** One verse's URL, or null when the surah's map is unavailable. */
export async function getAyahAudioUrlFromApi(
  apiId: number,
  surah: number,
  ayah: number
): Promise<string | null> {
  const urls = await getSurahAudioUrls(apiId, surah);
  return urls?.[ayah] ?? null;
}
