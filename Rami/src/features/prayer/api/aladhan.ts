/**
 * AlAdhan API client. Extended to accept calculation method, asr school,
 * latitudeAdjustmentMethod. Returns raw times; caller applies offsets.
 *
 * Alternative APIs for prayer times (e.g. if AlAdhan is inaccurate for your region):
 * - islamic-network.com/prayer-times-api (supports Sweden, high-latitude)
 * - salahtimes.com (Sweden-specific)
 * - Diyanet / Islamiska Förbundet for Sweden-specific offsets
 */
import type { PrayerName, PrayerTimesForDay, PrayerTime, PrayerSettings } from '../types';
import { CALCULATION_METHOD_TO_ID, ASR_METHOD_TO_SCHOOL, HIGH_LATITUDE_TO_PARAM } from '../constants/methods';

const ALADHAN_BASE = 'https://api.aladhan.com/v1';

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse time string (HH:mm) for the given date in local time. Uses local date components to avoid UTC-midnight quirks that can shift the day or trigger time. */
function parseTime(dateKey: string, timeStr: string): Date {
  const [h, m] = timeStr.split(':').map(Number);
  const [y, mo, day] = dateKey.split('-').map(Number);
  return new Date(y, mo - 1, day, h, m, 0, 0);
}

export interface GetPrayerTimesParams {
  date: Date;
  lat: number;
  lon: number;
  /** Calculation method id (2=MWL, 3=Egypt, 4=UmmAlQura, 5=Karachi) */
  method: number;
  /** Asr school: 0=Shafi, 1=Hanafi */
  school: number;
  /** Latitude adjustment: 1=MidNight, 2=OneSeventh, 3=AngleBased */
  latitudeAdjustmentMethod: number;
}

/** Applies per-prayer offset minutes to a copy of times. */
export function applyPrayerOffsets(
  times: PrayerTime[],
  offsets: Partial<Record<PrayerName, number>>
): PrayerTime[] {
  return times.map((t) => {
    const off = offsets[t.name] ?? 0;
    if (off === 0) return { ...t, time: new Date(t.time) };
    return {
      ...t,
      time: new Date(t.time.getTime() + off * 60 * 1000),
    };
  });
}

const RETRY_ATTEMPTS = 5;
const RETRY_BASE_DELAY_MS = 1500;

/** Sleep helper for retry backoff */
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Fetches prayer times from AlAdhan API (raw). Caller applies offsets.
 * Retries on 5xx (server temporarily unavailable).
 */
export async function getPrayerTimes(params: GetPrayerTimesParams): Promise<PrayerTimesForDay> {
  const { date, lat, lon, method, school, latitudeAdjustmentMethod } = params;
  const timestamp = Math.floor(date.getTime() / 1000);
  const url = `${ALADHAN_BASE}/timings/${timestamp}?latitude=${lat}&longitude=${lon}&method=${method}&school=${school}&latitudeAdjustmentMethod=${latitudeAdjustmentMethod}`;
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt++) {
    const res = await fetch(url);
    if (res.ok) {
      lastError = null;
      const data = (await res.json()) as {
        data?: {
          timings?: Record<string, string>;
          date?: { readable?: string };
        };
      };
      const timings = data?.data?.timings;
      if (!timings) {
        throw new Error('Invalid response from AlAdhan API');
      }
      const dateKey = toDateKey(date);
      const names: PrayerName[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
      const times: PrayerTime[] = names.map((name) => {
        const raw = timings[name];
        if (!raw) {
          throw new Error(`Missing timing for ${name}`);
        }
        const timeStr = raw.split(' ')[0];
        const time = parseTime(dateKey, timeStr);
        return { name, time, dateKey };
      });
      let sunrise: Date | null = null;
      const sunriseRaw = timings['Sunrise'];
      if (sunriseRaw) {
        const timeStr = sunriseRaw.split(' ')[0];
        sunrise = parseTime(dateKey, timeStr);
      }
      return { dateKey, times, sunrise };
    }
    lastError = new Error(`AlAdhan API error: ${res.status}`);
    if (res.status >= 500 && res.status < 600 && attempt < RETRY_ATTEMPTS - 1) {
      const delayMs = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
      await sleep(delayMs);
    } else {
      throw lastError;
    }
  }
  throw lastError ?? new Error('Failed to fetch prayer times');
}

/** Build API params from PrayerSettings. */
export function settingsToAladhanParams(settings: PrayerSettings): Omit<GetPrayerTimesParams, 'date' | 'lat' | 'lon'> {
  return {
    method: CALCULATION_METHOD_TO_ID[settings.calculationMethod],
    school: ASR_METHOD_TO_SCHOOL[settings.asrMethod],
    latitudeAdjustmentMethod: HIGH_LATITUDE_TO_PARAM[settings.highLatitudeRule],
  };
}
