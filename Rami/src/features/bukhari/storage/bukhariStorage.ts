import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BukhariBookmark, BukhariContentLanguage, BukhariLastRead } from '../types';

const KEY_BOOKMARKS = '@rami/bukhari_bookmarks';
export const MAX_BUKHARI_FAVORITES = 50;
const KEY_LAST_READ = '@rami/bukhari_last_read';
const KEY_CONTENT_LANGUAGE = '@rami/bukhari_content_language';

export async function loadBukhariBookmarks(): Promise<BukhariBookmark[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_BOOKMARKS);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) =>
        typeof item?.bookId === 'number' &&
        typeof item?.chapterId === 'number' &&
        typeof item?.hadithId === 'string' &&
        typeof item?.hadithNumber === 'number'
    ) as BukhariBookmark[];
  } catch {
    return [];
  }
}

export async function saveBukhariBookmarks(bookmarks: BukhariBookmark[]): Promise<void> {
  await AsyncStorage.setItem(KEY_BOOKMARKS, JSON.stringify(bookmarks));
}

export async function toggleBukhariBookmark(bookmark: BukhariBookmark): Promise<boolean> {
  const bookmarks = await loadBukhariBookmarks();
  const index = bookmarks.findIndex((item) => item.hadithId === bookmark.hadithId);
  if (index >= 0) {
    bookmarks.splice(index, 1);
    await saveBukhariBookmarks(bookmarks);
    return false;
  }
  if (bookmarks.length >= MAX_BUKHARI_FAVORITES) {
    throw new Error('MAX_FAVORITES_REACHED');
  }
  bookmarks.push(bookmark);
  await saveBukhariBookmarks(bookmarks);
  return true;
}

export async function loadBukhariLastRead(): Promise<BukhariLastRead | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_LAST_READ);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown as BukhariLastRead;
    if (
      typeof parsed?.bookId === 'number' &&
      typeof parsed?.chapterId === 'number' &&
      typeof parsed?.hadithId === 'string' &&
      typeof parsed?.hadithNumber === 'number' &&
      typeof parsed?.timestamp === 'number'
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveBukhariLastRead(lastRead: BukhariLastRead): Promise<void> {
  await AsyncStorage.setItem(KEY_LAST_READ, JSON.stringify(lastRead));
}

export async function loadBukhariContentLanguage(): Promise<BukhariContentLanguage> {
  try {
    const raw = await AsyncStorage.getItem(KEY_CONTENT_LANGUAGE);
    if (raw === 'ar' || raw === 'en') return raw;
  } catch {
    /* ignore */
  }
  return 'en';
}

export async function saveBukhariContentLanguage(language: BukhariContentLanguage): Promise<void> {
  await AsyncStorage.setItem(KEY_CONTENT_LANGUAGE, language);
}
