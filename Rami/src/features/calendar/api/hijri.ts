/**
 * Hijri Calendar API — uses AlAdhan API for conversions.
 * Caches results in AsyncStorage for 24 hours.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TodayDateInfo, HijriDate, GregorianDate, ConversionResult } from '../types';

const ALADHAN_BASE = 'https://api.aladhan.com/v1';
const CACHE_KEY_TODAY = '@calendar/today';
const CACHE_KEY_CONVERSION_PREFIX = '@calendar/conversion/';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

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
    // Check cache
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as ConversionResult;
      if (Date.now() - parsed.cachedAt < CACHE_DURATION_MS && parsed.hijri) {
        return parsed.hijri;
      }
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
    return null;
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
    // Check cache
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as ConversionResult;
      if (Date.now() - parsed.cachedAt < CACHE_DURATION_MS && parsed.gregorian) {
        return parsed.gregorian;
      }
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
    return null;
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
