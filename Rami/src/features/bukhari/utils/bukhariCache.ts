import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchBukhariDataset } from '../api/bukhariApi';
import type { BukhariBook, BukhariChapter, BukhariContentLanguage, BukhariDataset, BukhariHadith } from '../types';
import { getBookChapterKey } from '../types';

const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const CACHE_PREFIX = '@rami/bukhari_dataset_';
const CACHE_VERSION_KEY = '@rami/bukhari_cache_version';
const CACHE_VERSION = '1';

function getCacheDir(): string {
  const base = FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? '';
  return base.endsWith('/') ? `${base}bukhari/` : `${base}/bukhari/`;
}

function getFsPath(language: BukhariContentLanguage): string {
  return `${getCacheDir()}dataset_${language}.json`;
}

function getStorageKey(language: BukhariContentLanguage): string {
  return `${CACHE_PREFIX}${language}`;
}

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(getCacheDir());
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(getCacheDir(), { intermediates: true });
  }
}

function isDataset(value: unknown): value is BukhariDataset {
  const data = value as BukhariDataset | undefined;
  return !!data && Array.isArray(data.books) && typeof data.updatedAt === 'number';
}

async function readFs(language: BukhariContentLanguage): Promise<BukhariDataset | null> {
  try {
    const path = getFsPath(language);
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists || (info as { isDirectory?: boolean }).isDirectory) return null;
    const raw = await FileSystem.readAsStringAsync(path);
    const parsed = JSON.parse(raw) as unknown;
    return isDataset(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function readStorage(language: BukhariContentLanguage): Promise<BukhariDataset | null> {
  try {
    const raw = await AsyncStorage.getItem(getStorageKey(language));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isDataset(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveBukhariDataset(dataset: BukhariDataset): Promise<void> {
  await ensureDir();
  const json = JSON.stringify(dataset);
  try {
    await FileSystem.writeAsStringAsync(getFsPath(dataset.language), json);
  } catch {
    /* ignore fs write errors */
  }
  try {
    await AsyncStorage.setItem(getStorageKey(dataset.language), json);
    await AsyncStorage.setItem(CACHE_VERSION_KEY, CACHE_VERSION);
  } catch {
    /* ignore storage write errors */
  }
}

export async function getCachedBukhariDataset(language: BukhariContentLanguage): Promise<BukhariDataset | null> {
  const version = await AsyncStorage.getItem(CACHE_VERSION_KEY);
  if (version !== CACHE_VERSION) return null;
  const fromStorage = await readStorage(language);
  if (fromStorage) return fromStorage;
  return readFs(language);
}

async function fetchAndCache(language: BukhariContentLanguage): Promise<BukhariDataset> {
  const remote = await fetchBukhariDataset(language);
  await saveBukhariDataset(remote);
  return remote;
}

export async function getBukhariDataset(
  language: BukhariContentLanguage,
  options?: { forceRefresh?: boolean }
): Promise<BukhariDataset> {
  const cached = await getCachedBukhariDataset(language);
  if (options?.forceRefresh) return fetchAndCache(language);
  if (!cached) return fetchAndCache(language);
  const expired = Date.now() - cached.updatedAt > CACHE_TTL_MS;
  if (expired) {
    fetchAndCache(language).catch(() => {
      /* keep stale cache if background refresh fails */
    });
  }
  return cached;
}

export async function getBukhariBooks(
  language: BukhariContentLanguage,
  options?: { forceRefresh?: boolean }
): Promise<BukhariBook[]> {
  const dataset = await getBukhariDataset(language, options);
  return dataset.books;
}

export async function getBukhariChapters(
  language: BukhariContentLanguage,
  bookId: number
): Promise<BukhariChapter[]> {
  const dataset = await getBukhariDataset(language);
  return dataset.chaptersByBook[bookId] ?? [];
}

export async function getBukhariHadiths(
  language: BukhariContentLanguage,
  bookId: number,
  chapterId: number
): Promise<BukhariHadith[]> {
  const dataset = await getBukhariDataset(language);
  return dataset.hadithsByBookChapter[getBookChapterKey(bookId, chapterId)] ?? [];
}

export async function prefetchPopularBooks(
  language: BukhariContentLanguage,
  bookIds: number[]
): Promise<void> {
  const dataset = await getBukhariDataset(language);
  bookIds.forEach((bookId) => {
    (dataset.chaptersByBook[bookId] ?? []).forEach((chapter) => {
      // Forces chapter map access so future readers use warm in-memory path.
      void dataset.hadithsByBookChapter[getBookChapterKey(bookId, chapter.id)];
    });
  });
}
