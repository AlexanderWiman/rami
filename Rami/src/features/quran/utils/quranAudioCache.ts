/**
 * Cache Quran ayah audio for offline playback.
 * Caches when played; max 150 ayahs (~15–30 MB) to avoid filling storage.
 * Pre-download supports Juz Amma (surahs 95–114, ~131 verses, ~15–20 MB).
 */
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAyahAudioUrl, getGlobalAyahNumber } from './audio';
import { SURAH_LIST } from '../data/surahs';

const CACHE_INDEX_KEY = '@rami/quran_audio_cache_index';
const JUZ_AMMA_DOWNLOADED_KEY = '@rami/quran_audio_juz_amma';
const FULL_QURAN_DOWNLOADED_KEY = '@rami/quran_audio_full';
const DOWNLOADED_SURAHS_KEY = '@rami/quran_audio_downloaded_surahs';
const MAX_CACHED_AYAHS = 150;

/** Prefer documentDirectory for persistence; cacheDirectory may be cleared by OS. */
function getCacheDir(): string {
  const base = FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? '';
  return base.endsWith('/') ? `${base}quran_audio/` : `${base}/quran_audio/`;
}

type CacheEntry = { reciter: string; globalAyah: number; path: string };

async function ensureCacheDir(): Promise<void> {
  const dir = getCacheDir();
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

async function loadCacheIndex(): Promise<CacheEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveCacheIndex(entries: CacheEntry[]): Promise<void> {
  await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(entries));
}

async function evictOldestIfNeeded(entries: CacheEntry[]): Promise<CacheEntry[]> {
  if (entries.length <= MAX_CACHED_AYAHS) return entries;
  const toRemove = entries.slice(0, entries.length - MAX_CACHED_AYAHS);
  for (const e of toRemove) {
    try {
      await FileSystem.deleteAsync(e.path, { idempotent: true });
    } catch {
      /* ignore */
    }
  }
  return entries.slice(toRemove.length);
}

/**
 * Returns local file URI if cached, or fetches and caches, then returns local URI.
 * On fetch failure, returns the original URL so player can try streaming.
 */
export async function getResolvedAyahAudioUri(
  surahNumber: number,
  ayahInSurah: number,
  reciterId: string
): Promise<string> {
  const globalAyah = getGlobalAyahNumber(surahNumber, ayahInSurah);
  const cacheFileName = `${reciterId.replace(/[^a-z0-9._-]/gi, '_')}_${globalAyah}.mp3`;
  const cachePath = getCacheDir() + cacheFileName;

  await ensureCacheDir();

  const exists = await FileSystem.getInfoAsync(cachePath);
  if (exists.exists) {
    return cachePath;
  }

  const url = getAyahAudioUrl(surahNumber, ayahInSurah, reciterId);
  const url64 = url.includes('/128/') ? getAyahAudioUrl(surahNumber, ayahInSurah, reciterId, 64) : url;
  try {
    let result = await FileSystem.downloadAsync(url, cachePath);
    if (result.status !== 200 && url64 !== url) {
      await FileSystem.deleteAsync(cachePath, { idempotent: true });
      result = await FileSystem.downloadAsync(url64, cachePath);
    }
    if (result.status !== 200) throw new Error(`HTTP ${result.status}`);

    const entries = await loadCacheIndex();
    const newEntries = [...entries, { reciter: reciterId, globalAyah, path: cachePath }];
    const trimmed = await evictOldestIfNeeded(newEntries);
    await saveCacheIndex(trimmed);

    return cachePath;
  } catch {
    return url;
  }
}

/** Juz Amma = surahs 95–114 (~131 verses). */
const JUZ_AMMA_SURAHS = SURAH_LIST.filter((s) => s.number >= 95 && s.number <= 114);

/** Check if Juz Amma audio is downloaded for a reciter. */
export async function isJuzAmmaAudioDownloaded(reciterId: string): Promise<boolean> {
  const raw = await AsyncStorage.getItem(JUZ_AMMA_DOWNLOADED_KEY);
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) && parsed.includes(reciterId);
  } catch {
    return false;
  }
}

/**
 * Download Juz Amma audio (surahs 95–114) for offline playback.
 * ~131 verses, ~15–20 MB per reciter.
 */
export async function downloadJuzAmmaAudio(
  reciterId: string,
  onProgress?: (completed: number, total: number) => void
): Promise<{ success: boolean; error?: string }> {
  await ensureCacheDir();
  const cacheDir = getCacheDir();
  let total = 0;
  for (const s of JUZ_AMMA_SURAHS) total += s.ayahCount;
  let completed = 0;

  for (const surah of JUZ_AMMA_SURAHS) {
    for (let ayah = 1; ayah <= surah.ayahCount; ayah++) {
      try {
        const globalAyah = getGlobalAyahNumber(surah.number, ayah);
        const cacheFileName = `${reciterId.replace(/[^a-z0-9._-]/gi, '_')}_${globalAyah}.mp3`;
        const cachePath = cacheDir + cacheFileName;
        const exists = await FileSystem.getInfoAsync(cachePath);
        if (exists.exists) {
          completed++;
          onProgress?.(completed, total);
          continue;
        }
        const url = getAyahAudioUrl(surah.number, ayah, reciterId);
        const url64 = url.includes('/128/') ? getAyahAudioUrl(surah.number, ayah, reciterId, 64) : url;
        let result = await FileSystem.downloadAsync(url, cachePath);
        if (result.status !== 200 && url64 !== url) {
          await FileSystem.deleteAsync(cachePath, { idempotent: true });
          result = await FileSystem.downloadAsync(url64, cachePath);
        }
        if (result.status !== 200) throw new Error(`HTTP ${result.status}`);
        /* Pre-downloaded files: don't add to evictable cache index – keep them permanent */
      } catch (e) {
        return {
          success: false,
          error: e instanceof Error ? e.message : 'Download failed',
        };
      }
      completed++;
      onProgress?.(completed, total);
    }
  }

  const existing = await AsyncStorage.getItem(JUZ_AMMA_DOWNLOADED_KEY);
  let reciters: string[] = [];
  try {
    reciters = existing ? (JSON.parse(existing) as string[]) : [];
  } catch {
    /* ignore */
  }
  if (!reciters.includes(reciterId)) {
    reciters.push(reciterId);
    await AsyncStorage.setItem(JUZ_AMMA_DOWNLOADED_KEY, JSON.stringify(reciters));
  }
  return { success: true };
}

const TOTAL_AYAHS = 6236;

/** Get set of surah numbers downloaded for a reciter. */
export async function getDownloadedSurahs(reciterId: string): Promise<Set<number>> {
  try {
    const raw = await AsyncStorage.getItem(DOWNLOADED_SURAHS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as Record<string, number[]>;
    const arr = parsed[reciterId];
    return Array.isArray(arr) ? new Set(arr) : new Set();
  } catch {
    return new Set();
  }
}

async function saveDownloadedSurahs(reciterId: string, surahs: Set<number>): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(DOWNLOADED_SURAHS_KEY);
    const parsed: Record<string, number[]> = raw ? (JSON.parse(raw) as Record<string, number[]>) : {};
    parsed[reciterId] = Array.from(surahs);
    await AsyncStorage.setItem(DOWNLOADED_SURAHS_KEY, JSON.stringify(parsed));
  } catch {
    /* ignore */
  }
}

/** Check if a surah is downloaded for a reciter. Uses cached set first, then verifies first ayah. */
export async function isSurahAudioDownloaded(reciterId: string, surahNumber: number): Promise<boolean> {
  const downloaded = await getDownloadedSurahs(reciterId);
  if (downloaded.has(surahNumber)) return true;
  const surah = SURAH_LIST.find((s) => s.number === surahNumber);
  if (!surah) return false;
  const cacheDir = getCacheDir();
  const firstPath = cacheDir + `${reciterId.replace(/[^a-z0-9._-]/gi, '_')}_${getGlobalAyahNumber(surahNumber, 1)}.mp3`;
  const firstExists = await FileSystem.getInfoAsync(firstPath);
  if (!firstExists.exists) return false;
  const lastPath = cacheDir + `${reciterId.replace(/[^a-z0-9._-]/gi, '_')}_${getGlobalAyahNumber(surahNumber, surah.ayahCount)}.mp3`;
  const lastExists = await FileSystem.getInfoAsync(lastPath);
  return lastExists.exists;
}

/**
 * Download one surah's audio for offline playback.
 * ~0.5–8 MB per surah depending on length.
 */
export async function downloadSurahAudio(
  reciterId: string,
  surahNumber: number,
  onProgress?: (done: number, total: number) => void
): Promise<{ success: boolean; error?: string }> {
  const surah = SURAH_LIST.find((s) => s.number === surahNumber);
  if (!surah) return { success: false, error: 'Invalid surah' };
  await ensureCacheDir();
  const cacheDir = getCacheDir();
  const total = surah.ayahCount;
  let done = 0;

  for (let ayah = 1; ayah <= surah.ayahCount; ayah++) {
    try {
      const globalAyah = getGlobalAyahNumber(surahNumber, ayah);
      const cacheFileName = `${reciterId.replace(/[^a-z0-9._-]/gi, '_')}_${globalAyah}.mp3`;
      const cachePath = cacheDir + cacheFileName;
      const exists = await FileSystem.getInfoAsync(cachePath);
      if (exists.exists) {
        done++;
        onProgress?.(done, total);
        continue;
      }
      const url = getAyahAudioUrl(surahNumber, ayah, reciterId);
      const url64 = url.includes('/128/') ? getAyahAudioUrl(surahNumber, ayah, reciterId, 64) : url;
      let result = await FileSystem.downloadAsync(url, cachePath);
      if (result.status !== 200 && url64 !== url) {
        await FileSystem.deleteAsync(cachePath, { idempotent: true });
        result = await FileSystem.downloadAsync(url64, cachePath);
      }
      if (result.status !== 200) throw new Error(`HTTP ${result.status}`);
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Download failed' };
    }
    done++;
    onProgress?.(done, total);
  }

  const downloaded = await getDownloadedSurahs(reciterId);
  downloaded.add(surahNumber);
  await saveDownloadedSurahs(reciterId, downloaded);
  return { success: true };
}

/** Check if full Quran audio is downloaded for a reciter. */
export async function isFullQuranAudioDownloaded(reciterId: string): Promise<boolean> {
  const raw = await AsyncStorage.getItem(FULL_QURAN_DOWNLOADED_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed) && parsed.includes(reciterId)) return true;
    } catch {
      /* ignore */
    }
  }
  const downloaded = await getDownloadedSurahs(reciterId);
  return downloaded.size >= 114;
}

/**
 * Download full Quran audio (6236 verses) for offline playback.
 * ~500–600 MB, 30–60 min on good connection. All reciters supported.
 */
export async function downloadFullQuranAudio(
  reciterId: string,
  onProgress?: (completed: number, total: number) => void
): Promise<{ success: boolean; error?: string }> {
  await ensureCacheDir();
  const cacheDir = getCacheDir();
  const total = TOTAL_AYAHS;
  let completed = 0;

  for (const surah of SURAH_LIST) {
    for (let ayah = 1; ayah <= surah.ayahCount; ayah++) {
      try {
        const globalAyah = getGlobalAyahNumber(surah.number, ayah);
        const cacheFileName = `${reciterId.replace(/[^a-z0-9._-]/gi, '_')}_${globalAyah}.mp3`;
        const cachePath = cacheDir + cacheFileName;
        const exists = await FileSystem.getInfoAsync(cachePath);
        if (exists.exists) {
          completed++;
          onProgress?.(completed, total);
          continue;
        }
        const url = getAyahAudioUrl(surah.number, ayah, reciterId);
        const url64 = url.includes('/128/') ? getAyahAudioUrl(surah.number, ayah, reciterId, 64) : url;
        let result = await FileSystem.downloadAsync(url, cachePath);
        if (result.status !== 200 && url64 !== url) {
          await FileSystem.deleteAsync(cachePath, { idempotent: true });
          result = await FileSystem.downloadAsync(url64, cachePath);
        }
        if (result.status !== 200) throw new Error(`HTTP ${result.status}`);
      } catch (e) {
        return {
          success: false,
          error: e instanceof Error ? e.message : 'Download failed',
        };
      }
      completed++;
      onProgress?.(completed, total);
    }
  }

  const existing = await AsyncStorage.getItem(FULL_QURAN_DOWNLOADED_KEY);
  let reciters: string[] = [];
  try {
    reciters = existing ? (JSON.parse(existing) as string[]) : [];
  } catch {
    /* ignore */
  }
  if (!reciters.includes(reciterId)) {
    reciters.push(reciterId);
    await AsyncStorage.setItem(FULL_QURAN_DOWNLOADED_KEY, JSON.stringify(reciters));
  }
  const allSurahs = new Set(SURAH_LIST.map((s) => s.number));
  await saveDownloadedSurahs(reciterId, allSurahs);
  return { success: true };
}
