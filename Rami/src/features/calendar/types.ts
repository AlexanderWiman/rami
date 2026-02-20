/**
 * Type definitions for the Islamic Calendar feature.
 */

export type HijriDate = {
  day: number;
  month: number;
  monthName: string;
  year: number;
  designation: string; // "AH" for Anno Hegirae
};

export type GregorianDate = {
  day: number;
  month: number;
  monthName: string;
  year: number;
};

export type TodayDateInfo = {
  hijri: HijriDate;
  gregorian: GregorianDate;
  cachedAt: number; // timestamp for cache validation
};

export type IslamicEvent = {
  key: string;
  hijriMonth: number;
  hijriDay: number;
};

export type UpcomingEvent = {
  key: string;
  hijriDate: string;
  gregorianDate: string;
  daysLeft: number;
};

export type ConversionResult = {
  hijri?: HijriDate;
  gregorian?: GregorianDate;
  cachedAt: number;
};
