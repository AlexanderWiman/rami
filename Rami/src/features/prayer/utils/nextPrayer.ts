import type { PrayerTime, NextPrayerResult } from '../types';

/**
 * The prayer we are "in" right now: the most recent prayer whose time <= now.
 * Used for ceremonial "Now" styling and orb pulse. null if we're before the first prayer.
 */
export function getCurrentPrayer(prayerTimes: PrayerTime[], now: Date): PrayerTime | null {
  const sorted = [...prayerTimes].sort((a, b) => a.time.getTime() - b.time.getTime());
  const t = now.getTime();
  let last: PrayerTime | null = null;
  for (const p of sorted) {
    if (p.time.getTime() <= t) last = p;
    else break;
  }
  return last;
}

/**
 * Computes the next prayer from now. If all prayers today have passed,
 * returns the first prayer of the next day (caller must fetch next day if needed).
 */
export function computeNextPrayer(prayerTimes: PrayerTime[], now: Date): NextPrayerResult | null {
  const sorted = [...prayerTimes].sort((a, b) => a.time.getTime() - b.time.getTime());
  for (const p of sorted) {
    if (p.time.getTime() > now.getTime()) {
      const secondsUntil = Math.floor((p.time.getTime() - now.getTime()) / 1000);
      return { prayer: p, secondsUntil };
    }
  }
  return null;
}

export function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

/** Short form for UI: "1h 12m" or "45m" or "0m" */
export function formatCountdownShort(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatTime(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
