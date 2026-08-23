/**
 * Prayer settings storage with versioned schema and migration.
 * Extended: calculation method, asr, high-latitude, per-prayer offsets, per-prayer notify.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  PrayerSettings,
  Language,
  PrayerOffsetMinutes,
  PrayerNotifyFlags,
  PrayerName,
  CalculationMethodKey,
  AsrMethodKey,
  HighLatitudeRuleKey,
  PrayerPresetSource,
} from '../types';
import { PRAYER_NAMES_ORDER } from '../constants/methods';
import { isAzanSoundKey } from '../constants/azan';
import { CUSTOM_AZAN_KEY } from '../constants/customAzanKey';
import { CALCULATION_METHOD_KEYS, ASR_METHOD_KEYS, HIGH_LATITUDE_RULE_KEYS, normalizeCountryCode } from '../constants/presets';

const KEY_SETTINGS = '@rami/prayer_settings';
const KEY_LANGUAGE = '@rami/language';
const KEY_CACHED_TIMES = '@rami/cached_times';
const KEY_LOCATION = '@rami/location';
const KEY_THEME_STYLE = '@rami/theme_style';
const KEY_MUNICIPALITY_LABEL = '@rami/municipality_label';
const KEY_CLOCK_FORMAT = '@rami/clock_format';

export type ClockFormat = '12h' | '24h';

const CURRENT_SETTINGS_VERSION = 6;

export const DEFAULT_OFFSETS: PrayerOffsetMinutes = {
  Fajr: 0,
  Dhuhr: 0,
  Asr: 0,
  Maghrib: 0,
  Isha: 0,
};

const LEGACY_DEFAULT_OFFSETS: PrayerOffsetMinutes = {
  Fajr: 0,
  Dhuhr: 0,
  Asr: 4,
  Maghrib: -2,
  Isha: -10,
};

const DEFAULT_NOTIFY: PrayerNotifyFlags = {
  Fajr: true,
  Dhuhr: true,
  Asr: true,
  Maghrib: true,
  Isha: true,
};

/** Preset för Sverige (Islamiska Förbundet / Diyanet): SeventhOfNight + justeringar för matchning mot officiella tabeller */
export const SWEDEN_PRESET_OFFSETS: PrayerOffsetMinutes = {
  Fajr: -20,
  Dhuhr: -5,
  Asr: -5,
  Maghrib: -8,
  Isha: 0,
};

export const DEFAULT_SETTINGS: PrayerSettings = {
  settingsVersion: CURRENT_SETTINGS_VERSION,
  notificationsEnabled: true,
  playAzanSound: true,
  selectedSound: 'azan1',
  respectSilentMode: true,
  calculationMethod: 'MWL',
  asrMethod: 'Shafi',
  highLatitudeRule: 'MiddleOfNight',
  presetSource: 'auto',
  presetCountryCode: null,
  prayerOffsets: { ...DEFAULT_OFFSETS },
  prayerNotify: { ...DEFAULT_NOTIFY },
  alhamdulillahReminderEnabled: true,
};

function migrateFromV1(parsed: Record<string, unknown>): PrayerSettings {
  const base: PrayerSettings = {
    ...DEFAULT_SETTINGS,
    prayerOffsets: { ...DEFAULT_OFFSETS },
    prayerNotify: { ...DEFAULT_NOTIFY },
  };
  if (typeof parsed.notificationsEnabled === 'boolean') base.notificationsEnabled = parsed.notificationsEnabled;
  if (typeof parsed.playAzanSound === 'boolean') base.playAzanSound = parsed.playAzanSound;
  if (typeof parsed.selectedSound === 'string') base.selectedSound = parsed.selectedSound;
  if (typeof parsed.respectSilentMode === 'boolean') base.respectSilentMode = parsed.respectSilentMode;
  base.settingsVersion = CURRENT_SETTINGS_VERSION;
  return base;
}

function allOffsetsZero(offsets: Partial<Record<PrayerName, number>> | undefined): boolean {
  if (!offsets) return true;
  return PRAYER_NAMES_ORDER.every((n) => (offsets[n] ?? 0) === 0);
}

function matchesOffsets(
  offsets: Partial<Record<PrayerName, number>> | undefined,
  expected: PrayerOffsetMinutes
): boolean {
  if (!offsets) return false;
  return PRAYER_NAMES_ORDER.every((n) => offsets[n] === expected[n]);
}

function isCalculationMethodKey(value: unknown): value is CalculationMethodKey {
  return typeof value === 'string' && CALCULATION_METHOD_KEYS.includes(value as CalculationMethodKey);
}

function isAsrMethodKey(value: unknown): value is AsrMethodKey {
  return typeof value === 'string' && ASR_METHOD_KEYS.includes(value as AsrMethodKey);
}

function isHighLatitudeRuleKey(value: unknown): value is HighLatitudeRuleKey {
  return typeof value === 'string' && HIGH_LATITUDE_RULE_KEYS.includes(value as HighLatitudeRuleKey);
}

function isPresetSource(value: unknown): value is PrayerPresetSource {
  return value === 'auto' || value === 'manual';
}

function hadManualCalculationSettings(parsed: Record<string, unknown>): boolean {
  if (parsed.presetSource === 'manual') return true;
  const method = parsed.calculationMethod;
  const asr = parsed.asrMethod;
  const highLat = parsed.highLatitudeRule;
  return (
    (isCalculationMethodKey(method) && method !== 'Diyanet') ||
    (isAsrMethodKey(asr) && asr !== 'Shafi') ||
    (isHighLatitudeRuleKey(highLat) && highLat !== 'MiddleOfNight')
  );
}

function migrate(parsed: Record<string, unknown>): PrayerSettings {
  const version = (parsed.settingsVersion as number) ?? 1;
  if (version < 2) return migrateFromV1(parsed);

  const merged = { ...DEFAULT_SETTINGS, ...parsed } as PrayerSettings;
  merged.prayerOffsets = { ...DEFAULT_OFFSETS, ...(parsed.prayerOffsets as Partial<PrayerOffsetMinutes> | undefined) };
  merged.prayerNotify = { ...DEFAULT_NOTIFY, ...(parsed.prayerNotify as Partial<PrayerNotifyFlags> | undefined) };
  merged.calculationMethod = isCalculationMethodKey(parsed.calculationMethod)
    ? parsed.calculationMethod
    : DEFAULT_SETTINGS.calculationMethod;
  merged.asrMethod = isAsrMethodKey(parsed.asrMethod)
    ? parsed.asrMethod
    : DEFAULT_SETTINGS.asrMethod;
  merged.highLatitudeRule = isHighLatitudeRuleKey(parsed.highLatitudeRule)
    ? parsed.highLatitudeRule
    : DEFAULT_SETTINGS.highLatitudeRule;
  merged.presetSource = isPresetSource(parsed.presetSource)
    ? parsed.presetSource
    : hadManualCalculationSettings(parsed)
      ? 'manual'
      : 'auto';
  merged.presetCountryCode = normalizeCountryCode(parsed.presetCountryCode as string | null | undefined);

  for (const name of PRAYER_NAMES_ORDER) {
    if (typeof merged.prayerOffsets[name] !== 'number') merged.prayerOffsets[name] = DEFAULT_OFFSETS[name];
    if (typeof merged.prayerNotify[name] !== 'boolean') merged.prayerNotify[name] = true;
  }

  // v2 -> v3: fix users whose offsets were incorrectly stored as all-zeros
  if (version < 3 && allOffsetsZero(merged.prayerOffsets)) {
    merged.prayerOffsets = { ...DEFAULT_OFFSETS };
  }

  // v5 -> v6: customer requested neutral defaults. Preserve custom edits, but
  // migrate users who still have the old shipped default offsets.
  if (version < 6 && matchesOffsets(merged.prayerOffsets, LEGACY_DEFAULT_OFFSETS)) {
    merged.prayerOffsets = { ...DEFAULT_OFFSETS };
  }

  if (!isAzanSoundKey(merged.selectedSound) && merged.selectedSound !== CUSTOM_AZAN_KEY) {
    merged.selectedSound = DEFAULT_SETTINGS.selectedSound;
  }
  if (typeof merged.alhamdulillahReminderEnabled !== 'boolean') {
    merged.alhamdulillahReminderEnabled = DEFAULT_SETTINGS.alhamdulillahReminderEnabled;
  }
  merged.settingsVersion = CURRENT_SETTINGS_VERSION;
  return merged;
}

export async function loadPrayerSettings(): Promise<PrayerSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY_SETTINGS);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return migrate(parsed);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function savePrayerSettings(settings: PrayerSettings): Promise<void> {
  const toSave = { ...settings, settingsVersion: CURRENT_SETTINGS_VERSION };
  await AsyncStorage.setItem(KEY_SETTINGS, JSON.stringify(toSave));
}

const VALID_LANGUAGES: Language[] = ['en', 'ar', 'tr', 'fr', 'es', 'sv', 'de'];

export async function loadLanguage(): Promise<Language> {
  const raw = await AsyncStorage.getItem(KEY_LANGUAGE);
  if (raw && VALID_LANGUAGES.includes(raw as Language)) return raw as Language;
  return 'ar';
}

export async function saveLanguage(lang: Language): Promise<void> {
  await AsyncStorage.setItem(KEY_LANGUAGE, lang);
}

export async function loadThemeStyle(): Promise<'classic' | 'royal'> {
  const raw = await AsyncStorage.getItem(KEY_THEME_STYLE);
  if (raw === 'classic' || raw === 'royal') return raw;
  return 'classic';
}

export async function saveThemeStyle(style: 'classic' | 'royal'): Promise<void> {
  await AsyncStorage.setItem(KEY_THEME_STYLE, style);
}

export interface CachedLocation {
  lat: number;
  lon: number;
  label?: string;
  countryCode?: string;
  country?: string;
  /** When true, use this location instead of GPS (user set manually). */
  manual?: boolean;
}

export async function loadLocation(): Promise<CachedLocation | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_LOCATION);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedLocation;
    if (typeof parsed?.lat === 'number' && typeof parsed?.lon === 'number') {
      parsed.countryCode = normalizeCountryCode(parsed.countryCode) ?? undefined;
      // If location has no label, try to attach the last known municipality label
      if (!parsed.label) {
        const municipalityLabel = await AsyncStorage.getItem(KEY_MUNICIPALITY_LABEL);
        if (municipalityLabel) {
          parsed.label = municipalityLabel;
        }
      }
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveLocation(loc: CachedLocation): Promise<void> {
  await AsyncStorage.setItem(KEY_LOCATION, JSON.stringify(loc));
}

export async function loadMunicipalityLabel(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_MUNICIPALITY_LABEL);
    return raw ? raw : null;
  } catch {
    return null;
  }
}

export async function saveMunicipalityLabel(label: string): Promise<void> {
  await AsyncStorage.setItem(KEY_MUNICIPALITY_LABEL, label);
}

export async function loadClockFormat(): Promise<ClockFormat> {
  const raw = await AsyncStorage.getItem(KEY_CLOCK_FORMAT);
  if (raw === '12h' || raw === '24h') return raw;
  return '24h';
}

export async function saveClockFormat(format: ClockFormat): Promise<void> {
  await AsyncStorage.setItem(KEY_CLOCK_FORMAT, format);
}

/** Cache key includes method/asr/latAdj when provided so cache is invalidated when calculation params change */
export function prayerTimesCacheKey(
  dateKey: string,
  lat: number,
  lon: number,
  method: number = 2,
  school: number = 0,
  latAdj: number = 1
): string {
  return `${KEY_CACHED_TIMES}/${dateKey}_${lat.toFixed(4)}_${lon.toFixed(4)}_m${method}_s${school}_a${latAdj}`;
}

export async function getCachedPrayerTimes(
  dateKey: string,
  lat: number,
  lon: number,
  method: number = 2,
  school: number = 0,
  latAdj: number = 1
): Promise<string | null> {
  const key = prayerTimesCacheKey(dateKey, lat, lon, method, school, latAdj);
  return AsyncStorage.getItem(key);
}

export async function setCachedPrayerTimes(
  dateKey: string,
  lat: number,
  lon: number,
  method: number,
  school: number,
  latAdj: number,
  json: string
): Promise<void> {
  const key = prayerTimesCacheKey(dateKey, lat, lon, method, school, latAdj);
  await AsyncStorage.setItem(key, json);
}
