/**
 * QCF mushaf fonts — one font per printed page (604 in total).
 *
 * Each page of the Madinah mushaf has its own font whose glyphs are the exact
 * ligatures used in print, so a page rendered with its own font breaks lines
 * where the printed mushaf breaks them. The fonts are fetched on demand and
 * cached on the device instead of being bundled: 604 files would add ~90 MB to
 * the app (and to every OTA update), while one page is ~150 KB.
 *
 * QCF v1 (not v2) is used deliberately: React Native can only load ttf/otf, and
 * the v1 ttf files are 3–4× smaller than v2 for the same printed line breaks.
 */
import * as FileSystem from 'expo-file-system/legacy';
import * as Font from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FONT_BASE_URL = 'https://quran.com/fonts/quran/hafs/v1/ttf';
const KEY_FONT_USAGE = '@rami/qcf_font_usage';
/** Roughly 18 MB of cached fonts; pages beyond this are re-fetched when revisited. */
const MAX_CACHED_PAGES = 120;

/** Font family name registered for a page, e.g. "qcf_p255". */
export function getPageFontFamily(page: number): string {
  return `qcf_p${page}`;
}

function getFontDir(): string {
  const base = FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? '';
  return base.endsWith('/') ? `${base}qcf_fonts/` : `${base}/qcf_fonts/`;
}

function getFontPath(page: number): string {
  return `${getFontDir()}p${page}.ttf`;
}

async function ensureDir(): Promise<void> {
  const dir = getFontDir();
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
}

/** Families registered in this JS session; expo-font keeps them for the app's lifetime. */
const loadedFamilies = new Set<string>();
/** In-flight loads, so two panels asking for the same page share one download. */
const pending = new Map<number, Promise<boolean>>();

/** Pages ordered least-recently-used first, persisted so eviction survives restarts. */
async function loadUsage(): Promise<number[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_FONT_USAGE);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === 'number') : [];
  } catch {
    return [];
  }
}

async function touchUsage(page: number): Promise<void> {
  try {
    const usage = (await loadUsage()).filter((p) => p !== page);
    usage.push(page);
    const overflow = usage.length - MAX_CACHED_PAGES;
    if (overflow > 0) {
      const evicted = usage.splice(0, overflow);
      for (const p of evicted) {
        // Keep fonts already registered this session — deleting the file would
        // break a page still on screen; they are removed on a later run.
        if (loadedFamilies.has(getPageFontFamily(p))) {
          usage.unshift(p);
          continue;
        }
        await FileSystem.deleteAsync(getFontPath(p), { idempotent: true });
      }
    }
    await AsyncStorage.setItem(KEY_FONT_USAGE, JSON.stringify(usage));
  } catch {
    /* cache bookkeeping is best effort */
  }
}

/** True when the page's font file is already on the device. */
export async function isPageFontCached(page: number): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(getFontPath(page));
    return info.exists && (!('size' in info) || (info as { size?: number }).size !== 0);
  } catch {
    return false;
  }
}

/**
 * Downloads (if needed) and registers the font for `page`.
 * Resolves false when the font could not be made available — callers then fall
 * back to plain Uthmani text rather than showing empty glyph boxes.
 */
export async function ensurePageFont(page: number): Promise<boolean> {
  const family = getPageFontFamily(page);
  if (loadedFamilies.has(family)) return true;

  const inFlight = pending.get(page);
  if (inFlight) return inFlight;

  const task = (async () => {
    try {
      await ensureDir();
      const path = getFontPath(page);
      if (!(await isPageFontCached(page))) {
        const result = await FileSystem.downloadAsync(`${FONT_BASE_URL}/p${page}.ttf`, path);
        if (result.status !== 200) {
          await FileSystem.deleteAsync(path, { idempotent: true });
          return false;
        }
      }
      await Font.loadAsync({ [family]: path });
      loadedFamilies.add(family);
      void touchUsage(page);
      return true;
    } catch {
      return false;
    } finally {
      pending.delete(page);
    }
  })();

  pending.set(page, task);
  return task;
}

/** Warms the cache for a neighbouring page without blocking the caller. */
export function prefetchPageFont(page: number): void {
  if (page < 1 || page > 604) return;
  void ensurePageFont(page);
}
