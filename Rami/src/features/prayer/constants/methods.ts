/**
 * Maps UI calculation/asr/high-latitude keys to AlAdhan API values.
 * Used by aladhan.ts when building the request.
 */
import type { CalculationMethodKey, AsrMethodKey, HighLatitudeRuleKey, PrayerName } from '../types';

/** AlAdhan API method IDs - see https://api.aladhan.com/v1/methods */
export const CALCULATION_METHOD_TO_ID: Record<CalculationMethodKey, number> = {
  MWL: 3,        // Muslim World League (Islamiska Förbundet rekommenderar)
  Egypt: 5,      // Egyptian General Authority of Survey
  UmmAlQura: 4, // Umm Al-Qura University, Makkah
  Karachi: 1,   // University of Islamic Sciences, Karachi
  Diyanet: 13,  // Diyanet İşleri Başkanlığı, Turkey (Muslim Pro, Istanbul)
  Algeria: 19,  // Algeria
  Morocco: 21,  // Morocco
};

export const ASR_METHOD_TO_SCHOOL: Record<AsrMethodKey, number> = {
  Shafi: 0,
  Hanafi: 1,
};

/** AlAdhan latitudeAdjustmentMethod: 1=MidNight, 2=OneSeventh, 3=AngleBased */
export const HIGH_LATITUDE_TO_PARAM: Record<HighLatitudeRuleKey, number> = {
  MiddleOfNight: 1,
  SeventhOfNight: 2,
  AngleBased: 3,
};

export const PRAYER_NAMES_ORDER: PrayerName[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
