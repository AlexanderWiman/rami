/**
 * Prefetch prayer times for 7 days ahead when online.
 * Fire-and-forget; does not block the main flow.
 * Uses existing getPrayerTimes + setCachedPrayerTimes.
 */
import type { PrayerTimesForDay } from '../types';
import { getPrayerTimes, settingsToAladhanParams } from './aladhan';
import { loadPrayerSettings, loadLocation, setCachedPrayerTimes } from '../storage/prayerSettings';

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Prefetch prayer times for today + 6 days ahead. Writes to existing cache.
 * Call when online; fails silently on network error.
 */
export async function prefetchPrayerTimesForWeek(): Promise<void> {
  try {
    const cachedLoc = await loadLocation();
    if (!cachedLoc) return;

    const settings = await loadPrayerSettings();
    const { lat, lon } = cachedLoc;
    const { method, school, latitudeAdjustmentMethod } = settingsToAladhanParams(settings);

    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateKey = toDateKey(d);

      try {
        const result: PrayerTimesForDay = await getPrayerTimes({
          date: d,
          lat,
          lon,
          method,
          school,
          latitudeAdjustmentMethod,
        });
        await setCachedPrayerTimes(
          dateKey,
          lat,
          lon,
          method,
          school,
          latitudeAdjustmentMethod,
          JSON.stringify(result)
        );
      } catch {
        // Skip this day on error; continue with others
      }
    }
  } catch {
    // Fail silently
  }
}
