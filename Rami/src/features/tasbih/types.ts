/**
 * Tasbih / dhikr counter types.
 * Built-in presets have fixed ids; custom dhikr use generated ids.
 */
export type BuiltInPresetId =
  | 'subhanallah'
  | 'alhamdulillah'
  | 'allahuakbar'
  | 'astaghfirallah'
  | 'lahawla'
  | 'tahlil'
  | 'salawat';

export interface CustomDhikrItem {
  id: string;
  /** Display label (e.g. English or transliteration) */
  label: string;
  /** Optional Arabic label */
  labelAr?: string;
  target: number;
}

export interface TasbihSettings {
  /** Override target count for built-in presets. Key = preset id, value = target. */
  presetTargetOverrides: Partial<Record<BuiltInPresetId, number>>;
  customDhikr: CustomDhikrItem[];
}

export const DEFAULT_TASBIH_SETTINGS: TasbihSettings = {
  presetTargetOverrides: {},
  customDhikr: [],
};
