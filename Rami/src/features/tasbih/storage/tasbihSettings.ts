import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TasbihSettings, CustomDhikrItem } from '../types';
import { DEFAULT_TASBIH_SETTINGS } from '../types';

const KEY_TASBIH = '@rami/tasbih_settings';

export async function loadTasbihSettings(): Promise<TasbihSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY_TASBIH);
    if (!raw) return { ...DEFAULT_TASBIH_SETTINGS };
    const parsed = JSON.parse(raw) as TasbihSettings;
    return {
      presetTargetOverrides: parsed.presetTargetOverrides ?? {},
      customDhikr: Array.isArray(parsed.customDhikr)
        ? parsed.customDhikr.filter(
            (x): x is CustomDhikrItem =>
              x && typeof x.id === 'string' && typeof x.label === 'string' && typeof x.target === 'number' && x.target >= 1
          )
        : [],
    };
  } catch {
    return { ...DEFAULT_TASBIH_SETTINGS };
  }
}

export async function saveTasbihSettings(settings: TasbihSettings): Promise<void> {
  await AsyncStorage.setItem(KEY_TASBIH, JSON.stringify(settings));
}

export async function addCustomDhikr(item: CustomDhikrItem): Promise<TasbihSettings> {
  const current = await loadTasbihSettings();
  const next = {
    ...current,
    customDhikr: [...current.customDhikr, item],
  };
  await saveTasbihSettings(next);
  return next;
}

export async function updateCustomDhikr(id: string, updates: Partial<CustomDhikrItem>): Promise<TasbihSettings> {
  const current = await loadTasbihSettings();
  const customDhikr = current.customDhikr.map((x) =>
    x.id === id ? { ...x, ...updates } : x
  );
  const next = { ...current, customDhikr };
  await saveTasbihSettings(next);
  return next;
}

export async function removeCustomDhikr(id: string): Promise<TasbihSettings> {
  const current = await loadTasbihSettings();
  const next = {
    ...current,
    customDhikr: current.customDhikr.filter((x) => x.id !== id),
  };
  await saveTasbihSettings(next);
  return next;
}

export async function setPresetTargetOverride(
  presetId: string,
  target: number | null
): Promise<TasbihSettings> {
  const current = await loadTasbihSettings();
  const overrides = { ...current.presetTargetOverrides };
  if (target == null) {
    delete overrides[presetId as keyof typeof overrides];
  } else {
    (overrides as Record<string, number>)[presetId] = target;
  }
  const next = { ...current, presetTargetOverrides: overrides };
  await saveTasbihSettings(next);
  return next;
}
