/**
 * Hijri Calendar API — uses AlAdhan API for conversions.
 * Falls back to local @tabby_ai/hijri-converter when offline.
 * Caches results in AsyncStorage for 24 hours.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { gregorianToHijri as localGregorianToHijri, hijriToGregorian as localHijriToGregorian } from '@tabby_ai/hijri-converter';
import type { TodayDateInfo, HijriDate, GregorianDate, ConversionResult } from '../types';

const ALADHAN_BASE = 'https://api.aladhan.com/v1';
const CACHE_KEY_TODAY = '@calendar/today';
const CACHE_KEY_CONVERSION_PREFIX = '@calendar/conversion/';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// English month names for offline fallback (CalendarScreen uses i18n for display)
const HIJRI_MONTH_NAMES: Record<number, string> = {
  1: 'Muharram', 2: 'Safar', 3: "Rabi' al-Awwal", 4: "Rabi' al-Thani",
  5: 'Jumada al-Awwal', 6: 'Jumada al-Thani', 7: 'Rajab', 8: "Sha'ban",
  9: 'Ramadan', 10: 'Shawwal', 11: "Dhu al-Qa'dah", 12: 'Dhu al-Hijjah',
};
const GREGORIAN_MONTH_NAMES: Record<number, string> = {
  1: 'January', 2: 'February', 3: 'March', 4: 'April', 5: 'May', 6: 'June',
  7: 'July', 8: 'August', 9: 'September', 10: 'October', 11: 'November', 12: 'December',
};

function offlineGregorianToHijri(day: number, month: number, year: number): HijriDate | null {
  try {
    const h = localGregorianToHijri({ year, month, day });
    return {
      day: h.day,
      month: h.month,
      monthName: HIJRI_MONTH_NAMES[h.month] ?? '',
      year: h.year,
      designation: 'AH',
    };
  } catch {
    return null;
  }
}

function offlineHijriToGregorian(day: number, month: number, year: number): GregorianDate | null {
  try {
    const g = localHijriToGregorian({ year, month, day });
    return {
      day: g.day,
      month: g.month,
      monthName: GREGORIAN_MONTH_NAMES[g.month] ?? '',
      year: g.year,
    };
  } catch {
    return null;
  }
}

/**
 * Get today's Hijri date from AlAdhan API.
 * Caches the result for 24 hours.
 */
export async function getTodayHijriDate(): Promise<TodayDateInfo | null> {
  try {
    // Check cache first
    const cached = await AsyncStorage.getItem(CACHE_KEY_TODAY);
    if (cached) {
      const parsed = JSON.parse(cached) as TodayDateInfo;
      const now = Date.now();
      // Check if cache is from today and not expired
      const cachedDate = new Date(parsed.cachedAt);
      const today = new Date();
      if (
        cachedDate.toDateString() === today.toDateString() &&
        now - parsed.cachedAt < CACHE_DURATION_MS
      ) {
        return parsed;
      }
    }

    // Fetch from API
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();

    const url = `${ALADHAN_BASE}/gToH/${dd}-${mm}-${yyyy}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`AlAdhan API error: ${res.status}`);
    }

    const data = await res.json();
    const hijriData = data.data?.hijri;
    const gregorianData = data.data?.gregorian;

    if (!hijriData || !gregorianData) {
      throw new Error('Invalid API response');
    }

    const result: TodayDateInfo = {
      hijri: {
        day: parseInt(hijriData.day, 10),
        month: parseInt(hijriData.month.number, 10),
        monthName: hijriData.month.en,
        year: parseInt(hijriData.year, 10),
        designation: hijriData.designation?.abbreviated || 'AH',
      },
      gregorian: {
        day: parseInt(gregorianData.day, 10),
        month: parseInt(gregorianData.month.number, 10),
        monthName: gregorianData.month.en,
        year: parseInt(gregorianData.year, 10),
      },
      cachedAt: Date.now(),
    };

    // Cache the result
    await AsyncStorage.setItem(CACHE_KEY_TODAY, JSON.stringify(result));
    return result;
  } catch (error) {
    console.error('Failed to get today Hijri date:', error);
    // Offline: try expired cache from today first
    const cached = await AsyncStorage.getItem(CACHE_KEY_TODAY);
    if (cached) {
      const parsed = JSON.parse(cached) as TodayDateInfo;
      const cachedDate = new Date(parsed.cachedAt);
      const today = new Date();
      if (cachedDate.toDateString() === today.toDateString()) {
        return parsed;
      }
    }
    // Offline fallback: use local conversion
    const today = new Date();
    const hijri = offlineGregorianToHijri(today.getDate(), today.getMonth() + 1, today.getFullYear());
    if (hijri) {
      const result: TodayDateInfo = {
        hijri,
        gregorian: {
          day: today.getDate(),
          month: today.getMonth() + 1,
          monthName: GREGORIAN_MONTH_NAMES[today.getMonth() + 1] ?? '',
          year: today.getFullYear(),
        },
        cachedAt: Date.now(),
      };
      await AsyncStorage.setItem(CACHE_KEY_TODAY, JSON.stringify(result));
      return result;
    }
    return null;
  }
}

/**
 * Convert Gregorian date to Hijri.
 */
export async function gregorianToHijri(
  day: number,
  month: number,
  year: number
): Promise<HijriDate | null> {
  const cacheKey = `${CACHE_KEY_CONVERSION_PREFIX}g2h/${day}-${month}-${year}`;
  
  try {
    // Check cache (including expired when offline)
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as ConversionResult;
      if (parsed.hijri) return parsed.hijri;
    }

    // Fetch from API
    const dd = String(day).padStart(2, '0');
    const mm = String(month).padStart(2, '0');
    const url = `${ALADHAN_BASE}/gToH/${dd}-${mm}-${year}`;
    
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`AlAdhan API error: ${res.status}`);
    }

    const data = await res.json();
    const hijriData = data.data?.hijri;

    if (!hijriData) {
      throw new Error('Invalid API response');
    }

    const result: HijriDate = {
      day: parseInt(hijriData.day, 10),
      month: parseInt(hijriData.month.number, 10),
      monthName: hijriData.month.en,
      year: parseInt(hijriData.year, 10),
      designation: hijriData.designation?.abbreviated || 'AH',
    };

    // Cache the result
    await AsyncStorage.setItem(
      cacheKey,
      JSON.stringify({ hijri: result, cachedAt: Date.now() })
    );

    return result;
  } catch (error) {
    console.error('Failed to convert Gregorian to Hijri:', error);
    const result = offlineGregorianToHijri(day, month, year);
    if (result) {
      await AsyncStorage.setItem(cacheKey, JSON.stringify({ hijri: result, cachedAt: Date.now() }));
    }
    return result;
  }
}

/**
 * Convert Hijri date to Gregorian.
 */
export async function hijriToGregorian(
  day: number,
  month: number,
  year: number
): Promise<GregorianDate | null> {
  const cacheKey = `${CACHE_KEY_CONVERSION_PREFIX}h2g/${day}-${month}-${year}`;
  
  try {
    // Check cache (including expired when offline)
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as ConversionResult;
      if (parsed.gregorian) return parsed.gregorian;
    }

    // Fetch from API
    const dd = String(day).padStart(2, '0');
    const mm = String(month).padStart(2, '0');
    const url = `${ALADHAN_BASE}/hToG/${dd}-${mm}-${year}`;
    
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`AlAdhan API error: ${res.status}`);
    }

    const data = await res.json();
    const gregorianData = data.data?.gregorian;

    if (!gregorianData) {
      throw new Error('Invalid API response');
    }

    const result: GregorianDate = {
      day: parseInt(gregorianData.day, 10),
      month: parseInt(gregorianData.month.number, 10),
      monthName: gregorianData.month.en,
      year: parseInt(gregorianData.year, 10),
    };

    // Cache the result
    await AsyncStorage.setItem(
      cacheKey,
      JSON.stringify({ gregorian: result, cachedAt: Date.now() })
    );

    return result;
  } catch (error) {
    console.error('Failed to convert Hijri to Gregorian:', error);
    const result = offlineHijriToGregorian(day, month, year);
    if (result) {
      await AsyncStorage.setItem(cacheKey, JSON.stringify({ gregorian: result, cachedAt: Date.now() }));
    }
    return result;
  }
}

/**
 * Get the Gregorian date for a Hijri event in the current or next Hijri year.
 */
export async function getEventGregorianDate(
  hijriMonth: number,
  hijriDay: number,
  currentHijriYear: number
): Promise<{ gregorian: GregorianDate; daysLeft: number } | null> {
  try {
    // Try current year first
    let result = await hijriToGregorian(hijriDay, hijriMonth, currentHijriYear);
    
    if (result) {
      const eventDate = new Date(result.year, result.month - 1, result.day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const daysLeft = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      // If event has passed, try next year
      if (daysLeft < 0) {
        result = await hijriToGregorian(hijriDay, hijriMonth, currentHijriYear + 1);
        if (result) {
          const nextYearDate = new Date(result.year, result.month - 1, result.day);
          const nextDaysLeft = Math.ceil((nextYearDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return { gregorian: result, daysLeft: nextDaysLeft };
        }
      } else {
        return { gregorian: result, daysLeft };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Failed to get event Gregorian date:', error);
    return null;
  }
}
