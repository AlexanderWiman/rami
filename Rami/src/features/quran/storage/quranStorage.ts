/**
 * Quran storage: bookmarks, lastRead, and selected reciter persisted in AsyncStorage.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Bookmark, LastRead } from '../types';
import { isReciterId, getDefaultReciter } from '../constants/reciters';

const KEY_BOOKMARKS = '@rami/quran_bookmarks';
const KEY_SELECTED_RECITER = '@rami/quran_selected_reciter';
const KEY_LAST_READ = '@rami/quran_last_read';
const KEY_TAP_VERSE_HINT_SHOWN = '@rami/quran_tap_verse_hint_shown';
const KEY_AUDIO_POSITION = '@rami/quran_audio_position';

export async function loadBookmarks(): Promise<Bookmark[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_BOOKMARKS);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => typeof x?.surah === 'number' && typeof x?.ayah === 'number');
  } catch {
    return [];
  }
}

export async function saveBookmarks(bookmarks: Bookmark[]): Promise<void> {
  await AsyncStorage.setItem(KEY_BOOKMARKS, JSON.stringify(bookmarks));
}

export async function addBookmark(b: Bookmark): Promise<void> {
  const list = await loadBookmarks();
  if (list.some((x) => x.surah === b.surah && x.ayah === b.ayah)) return;
  list.push(b);
  await saveBookmarks(list);
}

export async function removeBookmark(b: Bookmark): Promise<void> {
  const list = (await loadBookmarks()).filter((x) => !(x.surah === b.surah && x.ayah === b.ayah));
  await saveBookmarks(list);
}

export async function loadLastRead(): Promise<LastRead | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_LAST_READ);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastRead;
    if (typeof parsed?.surah === 'number' && typeof parsed?.ayah === 'number' && typeof parsed?.timestamp === 'number')
      return parsed;
    return null;
  } catch {
    return null;
  }
}

export async function saveLastRead(lr: LastRead): Promise<void> {
  await AsyncStorage.setItem(KEY_LAST_READ, JSON.stringify(lr));
}

export async function getTapVerseHintShown(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY_TAP_VERSE_HINT_SHOWN);
    return raw === 'true';
  } catch {
    return false;
  }
}

export async function setTapVerseHintShown(): Promise<void> {
  await AsyncStorage.setItem(KEY_TAP_VERSE_HINT_SHOWN, 'true');
}

export type AudioPosition = { surah: number; ayah: number };

export async function loadAudioPosition(): Promise<AudioPosition | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_AUDIO_POSITION);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AudioPosition;
    if (typeof parsed?.surah === 'number' && typeof parsed?.ayah === 'number') return parsed;
    return null;
  } catch {
    return null;
  }
}

export async function saveAudioPosition(pos: AudioPosition): Promise<void> {
  await AsyncStorage.setItem(KEY_AUDIO_POSITION, JSON.stringify(pos));
}

export async function clearAudioPosition(): Promise<void> {
  await AsyncStorage.removeItem(KEY_AUDIO_POSITION);
}

export type { ReciterId } from '../constants/reciters';

export async function loadSelectedReciter(): Promise<string> {
  try {
    const raw = await AsyncStorage.getItem(KEY_SELECTED_RECITER);
    if (raw && isReciterId(raw)) return raw;
  } catch {
    /* ignore */
  }
  return getDefaultReciter();
}

export async function saveSelectedReciter(reciterId: string): Promise<void> {
  if (!isReciterId(reciterId)) return;
  await AsyncStorage.setItem(KEY_SELECTED_RECITER, reciterId);
}
