import type { AsrMethodKey, CalculationMethodKey, HighLatitudeRuleKey, PrayerSettings } from '../types';

export type PrayerCountryPreset = Pick<PrayerSettings, 'calculationMethod' | 'asrMethod' | 'highLatitudeRule'> & {
  countryCode: string;
  label: string;
};

const DEFAULT_PRESET: PrayerCountryPreset = {
  countryCode: 'DEFAULT',
  label: 'Default',
  calculationMethod: 'MWL',
  asrMethod: 'Shafi',
  highLatitudeRule: 'MiddleOfNight',
};

export const COUNTRY_PRAYER_PRESETS: Record<string, PrayerCountryPreset> = {
  SE: {
    countryCode: 'SE',
    label: 'Sweden',
    calculationMethod: 'Diyanet',
    asrMethod: 'Shafi',
    highLatitudeRule: 'AngleBased',
  },
  MA: {
    countryCode: 'MA',
    label: 'Morocco',
    calculationMethod: 'Morocco',
    asrMethod: 'Shafi',
    highLatitudeRule: 'MiddleOfNight',
  },
  EG: {
    countryCode: 'EG',
    label: 'Egypt',
    calculationMethod: 'Egypt',
    asrMethod: 'Shafi',
    highLatitudeRule: 'MiddleOfNight',
  },
  DZ: {
    countryCode: 'DZ',
    label: 'Algeria',
    calculationMethod: 'Algeria',
    asrMethod: 'Shafi',
    highLatitudeRule: 'MiddleOfNight',
  },
  SD: {
    countryCode: 'SD',
    label: 'Sudan',
    calculationMethod: 'MWL',
    asrMethod: 'Shafi',
    highLatitudeRule: 'MiddleOfNight',
  },
};

const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  sweden: 'SE',
  sverige: 'SE',
  suede: 'SE',
  schweden: 'SE',
  morocco: 'MA',
  maroc: 'MA',
  marocko: 'MA',
  marruecos: 'MA',
  egypt: 'EG',
  egypten: 'EG',
  egypte: 'EG',
  egipto: 'EG',
  algeria: 'DZ',
  algeriet: 'DZ',
  algerie: 'DZ',
  argelia: 'DZ',
  sudan: 'SD',
};

export const CALCULATION_METHOD_KEYS: CalculationMethodKey[] = [
  'MWL',
  'Egypt',
  'UmmAlQura',
  'Karachi',
  'Diyanet',
  'Algeria',
  'Morocco',
];

export const ASR_METHOD_KEYS: AsrMethodKey[] = ['Shafi', 'Hanafi'];

export const HIGH_LATITUDE_RULE_KEYS: HighLatitudeRuleKey[] = [
  'MiddleOfNight',
  'SeventhOfNight',
  'AngleBased',
];

export function normalizeCountryCode(countryCode?: string | null): string | null {
  if (!countryCode) return null;
  const normalized = countryCode.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}

export function countryNameToCode(country?: string | null): string | null {
  if (!country) return null;
  return COUNTRY_NAME_TO_CODE[country.trim().toLowerCase()] ?? null;
}

export function getPrayerPresetForCountry(countryCode?: string | null): PrayerCountryPreset {
  const normalized = normalizeCountryCode(countryCode);
  if (!normalized) return DEFAULT_PRESET;
  return COUNTRY_PRAYER_PRESETS[normalized] ?? {
    ...DEFAULT_PRESET,
    countryCode: normalized,
  };
}

export function applyPresetToSettings(settings: PrayerSettings, countryCode?: string | null): PrayerSettings {
  const preset = getPrayerPresetForCountry(countryCode);
  return {
    ...settings,
    calculationMethod: preset.calculationMethod,
    asrMethod: preset.asrMethod,
    highLatitudeRule: preset.highLatitudeRule,
    presetSource: 'auto',
    presetCountryCode: preset.countryCode === 'DEFAULT' ? null : preset.countryCode,
  };
}

export function isSamePrayerPreset(settings: PrayerSettings, preset: PrayerCountryPreset): boolean {
  return (
    settings.calculationMethod === preset.calculationMethod &&
    settings.asrMethod === preset.asrMethod &&
    settings.highLatitudeRule === preset.highLatitudeRule
  );
}
