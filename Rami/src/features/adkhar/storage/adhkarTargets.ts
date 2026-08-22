/**
 * Per-dhikr repetition target chosen by the user, keyed by adhkar item id.
 * An item with no entry uses the count that comes with the dhikr itself.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_TARGETS = '@rami/adhkar_targets';

/** Offered in the picker next to the dhikr's own count. */
export const TARGET_PRESETS = [3, 7, 33, 99, 100] as const;

export const MIN_TARGET = 1;
export const MAX_TARGET = 10000;

export type AdhkarTargets = Record<string, number>;

export async function loadAdhkarTargets(): Promise<AdhkarTargets> {
  try {
    const raw = await AsyncStorage.getItem(KEY_TARGETS);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed == null || typeof parsed !== 'object') return {};
    const result: AdhkarTargets = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        result[id] = clampTarget(value);
      }
    }
    return result;
  } catch {
    return {};
  }
}

export function clampTarget(value: number): number {
  return Math.min(MAX_TARGET, Math.max(MIN_TARGET, Math.round(value)));
}

/** Stores a custom target; pass null to go back to the dhikr's own count. */
export async function saveAdhkarTarget(itemId: string, target: number | null): Promise<AdhkarTargets> {
  const current = await loadAdhkarTargets();
  if (target == null) delete current[itemId];
  else current[itemId] = clampTarget(target);
  await AsyncStorage.setItem(KEY_TARGETS, JSON.stringify(current));
  return current;
}
