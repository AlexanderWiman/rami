/**
 * Locally saved favourites for the doubts (shubuhat) list.
 * Stored on the device only — the threads themselves come from the backend.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_FAVORITES = '@rami/forum_favorites';

/** Thread ids the user marked as favourite, newest first. */
export async function loadFavoriteThreadIds(): Promise<number[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_FAVORITES);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is number => typeof id === 'number');
  } catch {
    return [];
  }
}

async function save(ids: number[]): Promise<void> {
  await AsyncStorage.setItem(KEY_FAVORITES, JSON.stringify(ids));
}

/** Adds or removes the id and returns the resulting list. */
export async function toggleFavoriteThread(threadId: number): Promise<number[]> {
  const current = await loadFavoriteThreadIds();
  const next = current.includes(threadId)
    ? current.filter((id) => id !== threadId)
    : [threadId, ...current];
  await save(next);
  return next;
}
