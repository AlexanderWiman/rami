import { DateTime } from 'luxon';
import { query } from '../db';

// ── AlAdhan method mappings (mirrored from client constants/methods.ts) ──

const CALCULATION_METHOD_TO_ID: Record<string, number> = {
  MWL: 3,
  Egypt: 5,
  UmmAlQura: 4,
  Karachi: 1,
  Diyanet: 13,
};

const ASR_METHOD_TO_SCHOOL: Record<string, number> = {
  Shafi: 0,
  Hanafi: 1,
};

const HIGH_LATITUDE_TO_PARAM: Record<string, number> = {
  MiddleOfNight: 1,
  SeventhOfNight: 2,
  AngleBased: 3,
};

const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
type PrayerName = (typeof PRAYER_NAMES)[number];

const ALADHAN_BASE = 'https://api.aladhan.com/v1';
const RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1500;

// ── Prayer name translations for notification titles ──

const PRAYER_TITLES: Record<string, Record<PrayerName, string>> = {
  en: { Fajr: "It's time for Fajr", Dhuhr: "It's time for Dhuhr", Asr: "It's time for Asr", Maghrib: "It's time for Maghrib", Isha: "It's time for Isha" },
  ar: { Fajr: 'حان وقت الفجر', Dhuhr: 'حان وقت الظهر', Asr: 'حان وقت العصر', Maghrib: 'حان وقت المغرب', Isha: 'حان وقت العشاء' },
  tr: { Fajr: 'İmsak vakti geldi', Dhuhr: 'Öğle vakti geldi', Asr: 'İkindi vakti geldi', Maghrib: 'Akşam vakti geldi', Isha: 'Yatsı vakti geldi' },
  fr: { Fajr: "C'est l'heure du Fajr", Dhuhr: "C'est l'heure du Dhuhr", Asr: "C'est l'heure de l'Asr", Maghrib: "C'est l'heure du Maghrib", Isha: "C'est l'heure de l'Isha" },
  es: { Fajr: 'Es hora del Fajr', Dhuhr: 'Es hora del Dhuhr', Asr: 'Es hora del Asr', Maghrib: 'Es hora del Maghrib', Isha: 'Es hora del Isha' },
  sv: { Fajr: 'Dags för Fajr', Dhuhr: 'Dags för Dhuhr', Asr: 'Dags för Asr', Maghrib: 'Dags för Maghrib', Isha: 'Dags för Isha' },
  de: { Fajr: 'Zeit für Fajr', Dhuhr: 'Zeit für Dhuhr', Asr: 'Zeit für Asr', Maghrib: 'Zeit für Maghrib', Isha: 'Zeit für Isha' },
};

function getPrayerTitle(lang: string, prayer: PrayerName): string {
  return PRAYER_TITLES[lang]?.[prayer] ?? PRAYER_TITLES.en[prayer];
}

// ── Helpers ──

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function roundCoord(n: number): number {
  return Math.round(n * 10000) / 10000;
}

// ── AlAdhan API ──

interface AlAdhanTimings {
  Fajr: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  Sunrise: string;
  [key: string]: string;
}

async function fetchFromAlAdhan(
  dateKey: string,
  lat: number,
  lon: number,
  method: number,
  school: number,
  latAdj: number
): Promise<AlAdhanTimings> {
  const [y, m, d] = dateKey.split('-').map(Number);
  const timestamp = Math.floor(new Date(y, m - 1, d, 12, 0, 0).getTime() / 1000);
  const url = `${ALADHAN_BASE}/timings/${timestamp}?latitude=${lat}&longitude=${lon}&method=${method}&school=${school}&latitudeAdjustmentMethod=${latAdj}`;

  for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status >= 500) {
        if (attempt < RETRY_ATTEMPTS - 1) {
          await sleep(RETRY_BASE_DELAY_MS * (attempt + 1));
          continue;
        }
        throw new Error(`AlAdhan API error: ${res.status}`);
      }
      if (!res.ok) throw new Error(`AlAdhan API error: ${res.status}`);
      const json = (await res.json()) as { data: { timings: AlAdhanTimings } };
      return json.data.timings;
    } catch (err) {
      if (attempt === RETRY_ATTEMPTS - 1) throw err;
      await sleep(RETRY_BASE_DELAY_MS * (attempt + 1));
    }
  }
  throw new Error('AlAdhan fetch failed after retries');
}

/**
 * Fetch prayer times for a date+location+method, using DB cache first.
 */
export async function fetchPrayerTimes(
  dateKey: string,
  lat: number,
  lon: number,
  method: number,
  school: number,
  latAdj: number
): Promise<AlAdhanTimings> {
  const rLat = roundCoord(lat);
  const rLon = roundCoord(lon);

  const cached = await query(
    `SELECT timings FROM prayer_times_cache
     WHERE date_key = $1 AND latitude = $2 AND longitude = $3
       AND method = $4 AND school = $5 AND lat_adj = $6`,
    [dateKey, rLat, rLon, method, school, latAdj]
  );

  if (cached.rows.length > 0) {
    return cached.rows[0].timings as AlAdhanTimings;
  }

  const timings = await fetchFromAlAdhan(dateKey, lat, lon, method, school, latAdj);

  await query(
    `INSERT INTO prayer_times_cache (date_key, latitude, longitude, method, school, lat_adj, timings)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (date_key, latitude, longitude, method, school, lat_adj)
     DO UPDATE SET timings = $7, fetched_at = NOW()`,
    [dateKey, rLat, rLon, method, school, latAdj, JSON.stringify(timings)]
  );

  return timings;
}

// ── Push schedule computation ──

export interface PushDeviceRow {
  id: string;
  device_id: string;
  expo_push_token: string;
  platform: string;
  timezone: string;
  latitude: number;
  longitude: number;
  calculation_method: string;
  asr_method: string;
  high_latitude_rule: string;
  prayer_offsets: Record<PrayerName, number>;
  prayer_notify: Record<PrayerName, boolean>;
  notifications_enabled: boolean;
  language: string;
  selected_sound: string;
  play_azan_sound: boolean;
}

export interface ScheduledPushRow {
  device_id: string; // UUID from push_devices.id
  prayer_name: string;
  send_at: Date;
  title: string;
  body: string;
}

/**
 * Compute scheduled push rows for a device for the next N days (default 2).
 * Returns rows ready to INSERT into scheduled_pushes.
 */
export async function computeScheduledPushes(
  device: PushDeviceRow,
  days: number = 2
): Promise<ScheduledPushRow[]> {
  if (!device.notifications_enabled || device.latitude == null || device.longitude == null) {
    return [];
  }

  const method = CALCULATION_METHOD_TO_ID[device.calculation_method] ?? 13;
  const school = ASR_METHOD_TO_SCHOOL[device.asr_method] ?? 0;
  const latAdj = HIGH_LATITUDE_TO_PARAM[device.high_latitude_rule] ?? 1;
  const offsets = device.prayer_offsets ?? {};
  const notify = device.prayer_notify ?? {};
  const lang = device.language ?? 'en';
  const now = new Date();
  const rows: ScheduledPushRow[] = [];

  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const dateKey = toDateKey(d);
    const [y, m, day] = dateKey.split('-').map(Number);

    let timings: AlAdhanTimings;
    try {
      timings = await fetchPrayerTimes(dateKey, device.latitude, device.longitude, method, school, latAdj);
    } catch (err) {
      console.error(`Failed to fetch prayer times for ${dateKey} device=${device.device_id}:`, err);
      continue;
    }

    for (const prayer of PRAYER_NAMES) {
      if (notify[prayer] === false) continue;

      const raw = timings[prayer];
      if (!raw) continue;
      const timeStr = raw.split(' ')[0]; // strip "(EET)" suffix if present
      const [h, min] = timeStr.split(':').map(Number);
      if (isNaN(h) || isNaN(min)) continue;

      const offsetMin = offsets[prayer] ?? 0;
      const local = DateTime.fromObject(
        { year: y, month: m, day, hour: h, minute: min },
        { zone: device.timezone }
      );

      if (!local.isValid) {
        console.warn(`Invalid timezone ${device.timezone} for device ${device.device_id}`);
        continue;
      }

      const adjusted = local.plus({ minutes: offsetMin });
      const sendAt = adjusted.toJSDate();

      if (sendAt.getTime() <= now.getTime()) continue;

      rows.push({
        device_id: device.id,
        prayer_name: prayer,
        send_at: sendAt,
        title: getPrayerTitle(lang, prayer),
        body: '',
      });
    }
  }

  return rows;
}

/**
 * Regenerate scheduled pushes for a single device:
 * delete future unsent pushes, then insert new ones for 2 days.
 */
export async function regenerateScheduleForDevice(device: PushDeviceRow): Promise<number> {
  await query(
    `DELETE FROM scheduled_pushes WHERE device_id = $1 AND sent = false AND send_at > NOW()`,
    [device.id]
  );

  const rows = await computeScheduledPushes(device);
  if (rows.length === 0) return 0;

  const values: any[] = [];
  const placeholders: string[] = [];
  let idx = 1;
  for (const r of rows) {
    placeholders.push(`($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4})`);
    values.push(r.device_id, r.prayer_name, r.send_at, r.title, r.body);
    idx += 5;
  }

  await query(
    `INSERT INTO scheduled_pushes (device_id, prayer_name, send_at, title, body)
     VALUES ${placeholders.join(', ')}`,
    values
  );

  return rows.length;
}

/**
 * Regenerate scheduled pushes for ALL active devices.
 * Groups by location+method to minimize AlAdhan API calls.
 */
export async function regenerateAllSchedules(): Promise<void> {
  const result = await query(
    `SELECT * FROM push_devices WHERE notifications_enabled = true AND latitude IS NOT NULL`
  );

  const devices = result.rows as PushDeviceRow[];
  console.log(`[pushScheduler] Regenerating schedules for ${devices.length} devices`);

  let total = 0;
  for (const device of devices) {
    try {
      const count = await regenerateScheduleForDevice(device);
      total += count;
    } catch (err) {
      console.error(`[pushScheduler] Failed to regenerate for device ${device.device_id}:`, err);
    }
  }

  console.log(`[pushScheduler] Scheduled ${total} pushes across ${devices.length} devices`);

  // Clean up old sent pushes (> 7 days) and stale cache (> 14 days)
  await query(`DELETE FROM scheduled_pushes WHERE sent = true AND send_at < NOW() - INTERVAL '7 days'`);
  await query(`DELETE FROM prayer_times_cache WHERE fetched_at < NOW() - INTERVAL '14 days'`);
}
