/**
 * Cache Quran text (Arabic + English) for offline reading.
 * Fetches from api.alquran.cloud and saves to FileSystem.
 * Full Quran text ~2–4 MB.
 */
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://api.alquran.cloud/v1/surah';
const EDITIONS = 'quran-uthmani,en.sahih';
const CACHE_INDEX_KEY = '@rami/quran_text_downloaded';
const ASYNC_STORAGE_PREFIX = '@rami/quran_surah_';

/** Prefer documentDirectory – persists across restarts. cacheDirectory may be cleared by OS. */
function getCacheDir(): string {
  const base = FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? '';
  return base.endsWith('/') ? `${base}quran_text/` : `${base}/quran_text/`;
}

function getAsyncStorageKey(surahNum: number): string {
  return `${ASYNC_STORAGE_PREFIX}${surahNum}`;
}

export type AyahText = Record<number, { ar?: string; en?: string }>;

function parseApiResponse(json: unknown): AyahText {
  const data = Array.isArray((json as { data?: unknown[] })?.data) ? (json as { data: unknown[] }).data : [];
  const editions = data as {
    edition?: { language?: string; identifier?: string };
    ayahs: { numberInSurah: number; text: string }[];
  }[];
  const arabic = editions.find(
    (e) => e.edition?.language === 'ar' || e.edition?.identifier === 'quran-uthmani'
  );
  const english = editions.find((e) => e.edition?.language === 'en');
  const merged: AyahText = {};
  arabic?.ayahs.forEach((ayah) => {
    merged[ayah.numberInSurah] = { ...merged[ayah.numberInSurah], ar: ayah.text };
  });
  english?.ayahs.forEach((ayah) => {
    merged[ayah.numberInSurah] = { ...merged[ayah.numberInSurah], en: ayah.text };
  });
  return merged;
}

async function ensureCacheDir(): Promise<void> {
  const dir = getCacheDir();
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

async function readFromFileSystem(path: string): Promise<AyahText | null> {
  try {
    const exists = await FileSystem.getInfoAsync(path);
    if (!exists.exists || (exists as { isDirectory?: boolean }).isDirectory) return null;
    const content = await FileSystem.readAsStringAsync(path);
    const parsed = JSON.parse(content) as Record<string, { ar?: string; en?: string }>;
    if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
      return parsed as AyahText;
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function readFromAsyncStorage(surahNum: number): Promise<AyahText | null> {
  try {
    const raw = await AsyncStorage.getItem(getAsyncStorageKey(surahNum));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, { ar?: string; en?: string }>;
    if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
      return parsed as AyahText;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Save surah to cache (FileSystem + AsyncStorage). Call after fetching from API. */
export async function saveSurahToCache(surahNum: number, merged: AyahText): Promise<void> {
  await ensureCacheDir();
  const path = getCacheDir() + `surah_${surahNum}.json`;
  const json = JSON.stringify(merged);
  try {
    await FileSystem.writeAsStringAsync(path, json);
  } catch {
    /* FileSystem may fail on some platforms */
  }
  try {
    await AsyncStorage.setItem(getAsyncStorageKey(surahNum), json);
  } catch {
    /* AsyncStorage may hit size limit */
  }
}

/**
 * Load surah text from cache if available, else fetch from API.
 * Uses FileSystem first, then AsyncStorage backup (persists better offline).
 */
export async function getSurahText(surahNum: number): Promise<AyahText | null> {
  await ensureCacheDir();
  const cacheDir = getCacheDir();
  const path = cacheDir + `surah_${surahNum}.json`;

  /* Try AsyncStorage first – more reliable offline; FileSystem/legacy can fail in some contexts */
  let merged = await readFromAsyncStorage(surahNum);
  if (!merged) {
    merged = await readFromFileSystem(path);
  }
  if (merged) return merged;

  try {
    const res = await fetch(`${API_BASE}/${surahNum}/editions/${EDITIONS}`);
    const json = await res.json();
    if (json?.code !== 200) return null;
    merged = parseApiResponse(json);
    await saveSurahToCache(surahNum, merged);
    return merged;
  } catch {
    return null;
  }
}

/**
 * Check if Quran text is fully downloaded.
 */
export async function isQuranTextDownloaded(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(CACHE_INDEX_KEY);
  return raw === '1';
}

/**
 * Download all 114 surahs. Call with onProgress(completed, total) for UI.
 */
export async function downloadFullQuranText(
  onProgress?: (completed: number, total: number) => void
): Promise<{ success: boolean; error?: string }> {
  await ensureCacheDir();
  const total = 114;
  const cacheDir = getCacheDir();

  for (let i = 1; i <= total; i++) {
    try {
      const res = await fetch(`${API_BASE}/${i}/editions/${EDITIONS}`);
      const json = await res.json();
      if (json?.code !== 200) throw new Error(`HTTP ${res.status}`);
      const merged = parseApiResponse(json);
      const path = cacheDir + `surah_${i}.json`;
      await FileSystem.writeAsStringAsync(path, JSON.stringify(merged));
      try {
        await AsyncStorage.setItem(getAsyncStorageKey(i), JSON.stringify(merged));
      } catch {
        /* AsyncStorage may hit size limit – FileSystem is primary */
      }
      onProgress?.(i, total);
    } catch (e) {
      await AsyncStorage.removeItem(CACHE_INDEX_KEY);
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Download failed',
      };
    }
  }

  await AsyncStorage.setItem(CACHE_INDEX_KEY, '1');
  return { success: true };
}
