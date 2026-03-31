/**
 * usePrayerTimes: fetches and caches prayer times using settings (method, asr, high-lat, offsets).
 * Cache key includes method/school/latAdj. Refreshes when location or date changes.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import type {
  PrayerTimesForDay,
  NextPrayerResult,
  PrayerSettings,
  Language,
  PrayerName,
} from '../types';
import { getPrayerTimes, settingsToAladhanParams, applyPrayerOffsets } from '../api/aladhan';
import { computeNextPrayer } from '../utils/nextPrayer';
import {
  loadPrayerSettings,
  savePrayerSettings,
  loadLocation,
  saveLocation,
  loadMunicipalityLabel,
  saveMunicipalityLabel,
  loadClockFormat,
  saveClockFormat,
  getCachedPrayerTimes,
  setCachedPrayerTimes,
  type CachedLocation,
  type ClockFormat,
} from '../storage/prayerSettings';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getString } from '../../../constants/i18n';
import {
  scheduleTodayNotifications,
  cancelAllPrayerNotifications,
  scheduleAlhamdulillahReminder,
} from '../notifications/scheduler';
import { ensureAndroidNotificationChannels } from '../notifications/channels';
import { prefetchPrayerTimesForWeek } from '../api/prayerPrefetch';
import { syncPreferencesToBackend } from '../../../services/pushRegistration';

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Module-level cache for municipality label - persists across component remounts within same session
let _cachedMunicipality: string | null = null;

/** Call when user manually selects a new location — clears stale cache so the new label is used. */
export function clearLocationCache(): void {
  _cachedMunicipality = null;
}

/**
 * Reschedule prayer notifications from storage. Call when app returns to foreground
 * to mitigate Samsung/Android battery optimization clearing scheduled alarms.
 */
export async function reschedulePrayerNotificationsFromStorage(): Promise<void> {
  try {
    const settings = await loadPrayerSettings();
    if (!settings.notificationsEnabled) return;
    const cachedLoc = await loadLocation();
    if (!cachedLoc) return;
    const { lat, lon } = cachedLoc;
    const dateKey = toDateKey(new Date());
    const { method, school, latitudeAdjustmentMethod } = settingsToAladhanParams(settings);
    let raw: PrayerTimesForDay;
    const cachedJson = await getCachedPrayerTimes(dateKey, lat, lon, method, school, latitudeAdjustmentMethod);
    if (cachedJson) {
      try {
        raw = JSON.parse(cachedJson) as PrayerTimesForDay;
      } catch {
        raw = await getPrayerTimes({
          date: new Date(),
          lat,
          lon,
          method,
          school,
          latitudeAdjustmentMethod,
        });
      }
    } else {
      raw = await getPrayerTimes({
        date: new Date(),
        lat,
        lon,
        method,
        school,
        latitudeAdjustmentMethod,
      });
    }
    const times = applyPrayerOffsets(
      raw.times.map((t) => ({ ...t, time: new Date(t.time) })),
      settings.prayerOffsets
    );
    const { loadLanguage } = await import('../storage/prayerSettings');
    const lang = await loadLanguage();
    await cancelAllPrayerNotifications();
    await scheduleTodayNotifications(times, settings, lang);
    await scheduleAlhamdulillahReminder(settings, lang);
  } catch {
    /* ignore */
  }
}

/** Shared lock so all usePrayerTimes instances serialize notification scheduling (avoids 5x notifications when multiple screens mount). */
let _scheduleLock: Promise<void> = Promise.resolve();

export function usePrayerTimes() {
  const { language, setLanguage } = useLanguage();
  const lastMunicipalityLabel = useRef<string | null>(null);
  const currentLabelRef = useRef<string | null>(null);
  const forceFullRefreshRef = useRef(false);
  const [today, setToday] = useState<PrayerTimesForDay | null>(null);
  const [nextPrayer, setNextPrayer] = useState<NextPrayerResult | null>(null);
  const [tomorrowFirstPrayer, setTomorrowFirstPrayer] = useState<{
    name: PrayerName;
    time: Date;
  } | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocationState] = useState<CachedLocation | null>(null);
  const [locationLabel, setLocationLabel] = useState<string>('');
  const [settings, setSettingsState] = useState<PrayerSettings | null>(null);
  const [clockFormat, setClockFormatState] = useState<ClockFormat>('24h');

  const dateKey = toDateKey(new Date());

  const fetchAndSetTomorrow = useCallback(async (lat: number, lon: number, s: PrayerSettings) => {
    const { method, school, latitudeAdjustmentMethod } = settingsToAladhanParams(s);
    const tom = new Date();
    tom.setDate(tom.getDate() + 1);
    const tomorrowKey = toDateKey(tom);
    try {
      let raw: PrayerTimesForDay;
      const cached = await getCachedPrayerTimes(
        tomorrowKey,
        lat,
        lon,
        method,
        school,
        latitudeAdjustmentMethod
      );
      if (cached) {
        raw = JSON.parse(cached) as PrayerTimesForDay;
      } else {
        raw = await getPrayerTimes({
          date: tom,
          lat,
          lon,
          method,
          school,
          latitudeAdjustmentMethod,
        });
        await setCachedPrayerTimes(
          tomorrowKey,
          lat,
          lon,
          method,
          school,
          latitudeAdjustmentMethod,
          JSON.stringify(raw)
        );
      }
      const times = applyPrayerOffsets(
        raw.times.map((t) => ({ ...t, time: new Date(t.time) })),
        s.prayerOffsets
      );
      const sorted = [...times].sort((a, b) => a.time.getTime() - b.time.getTime());
      const first = sorted[0];
      if (first) setTomorrowFirstPrayer({ name: first.name, time: first.time });
    } catch {
      // ignore
    }
  }, []);

  const refreshTimes = useCallback(async () => {
    setError(null);
    setTomorrowFirstPrayer(null);
    let lat: number;
    let lon: number;
    const skipFastPath = forceFullRefreshRef.current;
    if (skipFastPath) forceFullRefreshRef.current = false;

    const s = await loadPrayerSettings();
    setSettingsState(s);
    const cachedLoc = await loadLocation();
    const { method, school, latitudeAdjustmentMethod } = settingsToAladhanParams(s);

    // Load cached municipality - prefer module-level cache, then ref, then AsyncStorage
    if (!_cachedMunicipality && !lastMunicipalityLabel.current) {
      const stored = await loadMunicipalityLabel();
      if (stored) {
        _cachedMunicipality = stored;
        lastMunicipalityLabel.current = stored;
      }
    } else if (_cachedMunicipality && !lastMunicipalityLabel.current) {
      lastMunicipalityLabel.current = _cachedMunicipality;
    }

    // Fast path: show cached content immediately if we have location + prayer times (skip when doing background refresh)
    if (!skipFastPath && cachedLoc) {
      lat = cachedLoc.lat;
      lon = cachedLoc.lon;
      setLocationState(cachedLoc);
      setLocationLabel(cachedLoc.label ?? `${lat.toFixed(2)}, ${lon.toFixed(2)}`);
      if (cachedLoc.label) {
        _cachedMunicipality = cachedLoc.label;
        lastMunicipalityLabel.current = cachedLoc.label;
      }
      const cachedJson = await getCachedPrayerTimes(dateKey, lat, lon, method, school, latitudeAdjustmentMethod);
      if (cachedJson) {
        try {
          const parsed = JSON.parse(cachedJson) as PrayerTimesForDay;
          if (parsed.sunrise != null) {
            const times = applyPrayerOffsets(
              parsed.times.map((t) => ({ ...t, time: new Date(t.time) })),
              s.prayerOffsets
            );
            const sunrise = parsed.sunrise != null ? new Date(parsed.sunrise) : null;
            const adjusted = { dateKey: parsed.dateKey, times, sunrise };
            setToday(adjusted);
            const next = computeNextPrayer(adjusted.times, new Date());
            setNextPrayer(next);
            setCountdownSeconds(next?.secondsUntil ?? null);
            if (!next) fetchAndSetTomorrow(lat, lon, s);
            setLoading(false);
            // Refresh in background (GPS, API) — don't block
            forceFullRefreshRef.current = true;
            refreshTimes().catch(() => {});
            return;
          }
        } catch {
          /* fall through to full refresh */
        }
      }
    }

    async function setLabelFromCoords(lat: number, lon: number) {
      try {
        const addresses = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
        const first = addresses[0];
        if (first) {
          // Build label from available fields - works globally (not just Sweden)
          // Priority: city > subregion (kommun) > district > region (län) — subregion is municipality in Sweden
          let locality = first.city || first.subregion || first.district || first.region;

          // Android: city/subregion often null; try parsing formattedAddress for various formats
          if (!locality && Platform.OS === 'android' && first.formattedAddress) {
            const parts = first.formattedAddress.split(',').map((p: string) => p.trim());
            if (parts.length >= 2) {
              // Swedish: "Street, PostalCode Place, Country" - middle part has place
              const middlePart = parts[parts.length - 2];
              const placeMatch = middlePart?.match(/^\d+\s*\d*\s+(.+)$/);
              if (placeMatch?.[1]) {
                locality = placeMatch[1];
              } else {
                // US/UK/etc: "Street, City, State/Region" or "Street, City, Postcode"
                locality = middlePart || parts[0];
              }
            } else if (parts.length === 1) {
              locality = parts[0];
            }
          }

          const parts = locality
            ? [locality, first.country].filter(Boolean)
            : [first.region, first.country].filter(Boolean);
          const nextLabel = parts.length > 0 ? parts.join(', ') : first.formattedAddress || '';
          const hasCityLevel = !!(first.city || first.subregion || first.district);
          const isRegionOnly = !hasCityLevel && !!(first.region || first.country);

          if (locality && nextLabel) {
            _cachedMunicipality = nextLabel;
            lastMunicipalityLabel.current = nextLabel;
            saveMunicipalityLabel(nextLabel).catch(() => {});
            saveLocation({ lat, lon, label: nextLabel }).catch(() => {});
          }
          let fallbackLabel: string | null = null;
          if (isRegionOnly) {
            try {
              const nm = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
                { headers: { 'User-Agent': 'RamiPrayerApp/1.0' } }
              ).then((r) => r.json());
              const a = nm?.address;
              if (a) {
                const p = [a.city, a.town, a.village, a.municipality, a.county, a.state, a.country].filter(Boolean);
                fallbackLabel = p.length > 0 ? p.join(', ') : null;
              }
            } catch {
              /* ignore */
            }
            if (!fallbackLabel) {
              fallbackLabel = _cachedMunicipality || lastMunicipalityLabel.current || (await loadMunicipalityLabel());
            }
            if (fallbackLabel) {
              _cachedMunicipality = fallbackLabel;
              lastMunicipalityLabel.current = fallbackLabel;
              saveMunicipalityLabel(fallbackLabel).catch(() => {});
            }
          }
          const finalLabel = isRegionOnly && fallbackLabel ? fallbackLabel : nextLabel;
          if (finalLabel) {
            saveLocation({ lat, lon, label: finalLabel }).catch(() => {});
          }
          setLocationLabel(finalLabel || `${lat.toFixed(2)}, ${lon.toFixed(2)}`);
        } else {
          try {
            const nm = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
              { headers: { 'User-Agent': 'RamiPrayerApp/1.0' } }
            ).then((r) => r.json());
            const a = nm?.address;
            if (a) {
              const p = [a.city, a.town, a.village, a.municipality, a.county, a.state, a.country].filter(Boolean);
              const label = p.length > 0 ? p.join(', ') : '';
              if (label) {
                _cachedMunicipality = label;
                lastMunicipalityLabel.current = label;
                saveMunicipalityLabel(label).catch(() => {});
                saveLocation({ lat, lon, label }).catch(() => {});
                setLocationLabel(label);
              } else {
                setLocationLabel(`${lat.toFixed(2)}, ${lon.toFixed(2)}`);
              }
            } else {
              setLocationLabel(`${lat.toFixed(2)}, ${lon.toFixed(2)}`);
            }
          } catch {
            setLocationLabel(`${lat.toFixed(2)}, ${lon.toFixed(2)}`);
          }
        }
      } catch {
        setLocationLabel('');
      }
    }

    // When user set manual location, use it and skip GPS.
    if (cachedLoc?.manual) {
      lat = cachedLoc.lat;
      lon = cachedLoc.lon;
      setLocationState(cachedLoc);
      setLocationLabel(cachedLoc.label ?? `${lat.toFixed(2)}, ${lon.toFixed(2)}`);
      if (cachedLoc.label) {
        _cachedMunicipality = cachedLoc.label;
        lastMunicipalityLabel.current = cachedLoc.label;
      }
    } else {
    // Otherwise: use current position. Fallback to cached when GPS unavailable or permission denied.
    const LOCATION_TIMEOUT_MS = 5000;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (cachedLoc) {
          lat = cachedLoc.lat;
          lon = cachedLoc.lon;
          setLocationState(cachedLoc);
          if (cachedLoc.label) {
            setLocationLabel(cachedLoc.label);
            _cachedMunicipality = cachedLoc.label;
            lastMunicipalityLabel.current = cachedLoc.label;
          }
          setLabelFromCoords(lat, lon);
        } else {
          setError('Location permission denied');
          setLoading(false);
          return;
        }
      } else {
        let pos: Location.LocationObject | null = null;
        // Try last known position first (often instant) before waiting for GPS
        pos = await Location.getLastKnownPositionAsync({ maxAge: 600000 });
        if (!pos) {
          try {
            pos = await Promise.race([
              Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Location timeout')), LOCATION_TIMEOUT_MS)
              ),
            ]);
          } catch (timeoutOrError) {
            const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 600000 });
            if (lastKnown) pos = lastKnown;
            if (!pos) throw timeoutOrError;
          }
        }
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
        const currentLoc = { lat, lon };
        setLocationState(currentLoc);
        saveLocation(currentLoc).catch(() => {});
        if (cachedLoc?.label) {
          setLocationLabel(cachedLoc.label);
          _cachedMunicipality = cachedLoc.label;
          lastMunicipalityLabel.current = cachedLoc.label;
        }
        setLabelFromCoords(lat, lon);
      }
    } catch (e) {
      if (cachedLoc) {
        lat = cachedLoc.lat;
        lon = cachedLoc.lon;
        setLocationState(cachedLoc);
        if (cachedLoc.label) {
          setLocationLabel(cachedLoc.label);
          _cachedMunicipality = cachedLoc.label;
          lastMunicipalityLabel.current = cachedLoc.label;
        }
        setLabelFromCoords(lat, lon);
      } else {
        const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 600000 });
        if (lastKnown) {
          lat = lastKnown.coords.latitude;
          lon = lastKnown.coords.longitude;
          const loc = { lat, lon };
          setLocationState(loc);
          saveLocation(loc).catch(() => {});
          setLabelFromCoords(lat, lon);
        } else {
          setError(e instanceof Error ? e.message : 'Could not get location');
          setLoading(false);
          return;
        }
      }
    }
    }

    const cachedJson = await getCachedPrayerTimes(dateKey, lat, lon, method, school, latitudeAdjustmentMethod);
    const applyOffsetsAndSet = (raw: PrayerTimesForDay) => {
      const times = applyPrayerOffsets(
        raw.times.map((t) => ({ ...t, time: new Date(t.time) })),
        s.prayerOffsets
      );
      const sunrise = raw.sunrise != null ? new Date(raw.sunrise) : null;
      const adjusted = { dateKey: raw.dateKey, times, sunrise };
      setToday(adjusted);
      const next = computeNextPrayer(adjusted.times, new Date());
      setNextPrayer(next);
      setCountdownSeconds(next?.secondsUntil ?? null);
      return next;
    };

    let usedCache = false;
    if (cachedJson) {
      try {
        const parsed = JSON.parse(cachedJson) as PrayerTimesForDay;
        if (parsed.sunrise != null) {
          const next = applyOffsetsAndSet(parsed);
          if (!next) fetchAndSetTomorrow(lat, lon, s);
          usedCache = true;
        }
      } catch {
        // fallback to fetch
      }
    }

    if (!usedCache) {
      try {
        const result = await getPrayerTimes({
          date: new Date(),
          lat,
          lon,
          method,
          school,
          latitudeAdjustmentMethod,
        });
        await setCachedPrayerTimes(dateKey, lat, lon, method, school, latitudeAdjustmentMethod, JSON.stringify(result));
        const next = applyOffsetsAndSet(result);
        if (!next) fetchAndSetTomorrow(lat, lon, s);
        // Prefetch 7 days ahead (fire-and-forget; fails silently when offline)
        prefetchPrayerTimesForWeek().catch(() => {});
      } catch (e) {
        const apiError = e instanceof Error ? e.message : '';
        const isApiError = /AlAdhan API error: 5\d{2}/.test(apiError) || apiError.includes('Failed to fetch');
        if (isApiError) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayKey = toDateKey(yesterday);
          const yesterdayCached = await getCachedPrayerTimes(yesterdayKey, lat, lon, method, school, latitudeAdjustmentMethod);
          if (yesterdayCached) {
            try {
              const parsed = JSON.parse(yesterdayCached) as PrayerTimesForDay;
              const today = new Date();
              const todayTimes = parsed.times.map((t) => {
                const d = new Date(t.time);
                return { name: t.name, time: new Date(today.getFullYear(), today.getMonth(), today.getDate(), d.getHours(), d.getMinutes(), 0, 0), dateKey };
              });
              const sunriseAdj = parsed.sunrise
                ? (() => {
                    const sd = new Date(parsed.sunrise!);
                    return new Date(today.getFullYear(), today.getMonth(), today.getDate(), sd.getHours(), sd.getMinutes(), 0, 0);
                  })()
                : null;
              const fallback = { dateKey, times: todayTimes, sunrise: sunriseAdj };
              const next = applyOffsetsAndSet(fallback);
              if (!next) fetchAndSetTomorrow(lat, lon, s);
            } catch {
              setError(getString(language, 'prayerTimesServiceUnavailable'));
            }
          } else {
            setError(getString(language, 'prayerTimesServiceUnavailable'));
          }
        } else {
          setError(apiError || getString(language, 'error'));
        }
      }
    } else {
      // Used cache; still try prefetch (may have stale cache, fails silently when offline)
      prefetchPrayerTimesForWeek().catch(() => {});
    }
    setLoading(false);
  }, [dateKey, language, settings?.calculationMethod, settings?.asrMethod, settings?.highLatitudeRule, fetchAndSetTomorrow]);

  useEffect(() => {
    loadPrayerSettings().then((s) => {
      setSettingsState(s);
    });
    loadClockFormat().then(setClockFormatState);
    refreshTimes();
  }, [refreshTimes]);

  // Update position every 5 minutes (e.g. when user moves)
  const LOCATION_UPDATE_INTERVAL_MS = 5 * 60 * 1000;
  useEffect(() => {
    const id = setInterval(refreshTimes, LOCATION_UPDATE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refreshTimes]);

  useEffect(() => {
    currentLabelRef.current = locationLabel || null;
  }, [locationLabel, location]);

  // Countdown refresh: update at least twice per minute (every 15s)
  useEffect(() => {
    if (!today) return;
    const update = () => {
      const next = computeNextPrayer(today.times, new Date());
      setNextPrayer(next);
      setCountdownSeconds(next?.secondsUntil ?? null);
    };
    update();
    const id = setInterval(update, 15000);
    return () => clearInterval(id);
  }, [today?.dateKey, today?.times]);

  // When all prayers today have passed, fetch tomorrow's first (e.g. after Isha) so we can show "Fajr tomorrow at …"
  useEffect(() => {
    if (!today || nextPrayer || !location || !settings || tomorrowFirstPrayer) return;
    fetchAndSetTomorrow(location.lat, location.lon, settings);
  }, [today, nextPrayer, location, settings, tomorrowFirstPrayer, fetchAndSetTomorrow]);

  const updateSettings = useCallback(async (s: PrayerSettings) => {
    setSettingsState(s);
    await savePrayerSettings(s);
    refreshTimes();
    if (today && s.notificationsEnabled) {
      await cancelAllPrayerNotifications();
      await scheduleTodayNotifications(today.times, s, language);
      await scheduleAlhamdulillahReminder(s, language);
    } else if (!s.notificationsEnabled) {
      await cancelAllPrayerNotifications();
    }
    // Sync to backend for remote push (fire-and-forget)
    syncPreferencesToBackend({
      calculationMethod: s.calculationMethod,
      asrMethod: s.asrMethod,
      highLatitudeRule: s.highLatitudeRule,
      prayerOffsets: s.prayerOffsets,
      prayerNotify: s.prayerNotify,
      notificationsEnabled: s.notificationsEnabled,
      language,
      selectedSound: s.selectedSound,
      playAzanSound: s.playAzanSound,
    }).catch(() => {});
  }, [today, language, refreshTimes]);

  const updateLanguage = useCallback(
    (lang: Language) => {
      setLanguage(lang);
    },
    [setLanguage]
  );

  const refreshSchedule = useCallback(async () => {
    if (!today || !settings) return;
    await cancelAllPrayerNotifications();
    await scheduleTodayNotifications(today.times, settings, language);
    await scheduleAlhamdulillahReminder(settings, language);
  }, [today, settings, language]);

  const setClockFormat = useCallback((format: ClockFormat) => {
    setClockFormatState(format);
    saveClockFormat(format).catch(() => {});
  }, []);

  // Schedule notifications when today + settings are ready; only prayers with prayerNotify[name]=true.
  // Uses latest settings from storage so all hook instances respect toggles (e.g. notifications off in one screen).
  useEffect(() => {
    if (!today || !settings) return;
    const prevLock = _scheduleLock;
    _scheduleLock = (async () => {
      await prevLock;
      const latest = await loadPrayerSettings();
      if (!latest.notificationsEnabled) {
        await cancelAllPrayerNotifications();
        return;
      }
      await ensureAndroidNotificationChannels();
      await cancelAllPrayerNotifications();
      await scheduleTodayNotifications(today.times, latest, language);
      await scheduleAlhamdulillahReminder(latest, language);
    })();
  }, [
    today?.dateKey,
    settings?.notificationsEnabled,
    settings?.alhamdulillahReminderEnabled,
    settings?.playAzanSound,
    settings?.selectedSound,
    // Use JSON so we only re-run when actual prayerNotify values change, not object reference
    settings?.prayerNotify == null ? null : JSON.stringify(settings.prayerNotify),
    language,
  ]);

  return {
    today,
    nextPrayer,
    tomorrowFirstPrayer,
    countdownSeconds,
    loading,
    error,
    location: locationLabel || null,
    settings,
    language,
    clockFormat,
    use12h: clockFormat === '12h',
    setClockFormat,
    refreshTimes,
    updateSettings,
    updateLanguage,
    refreshSchedule,
    setLocation: async (loc: CachedLocation) => {
      await saveLocation(loc);
      setLocationState(loc);
      setLocationLabel(loc.label ?? `${loc.lat.toFixed(2)}, ${loc.lon.toFixed(2)}`);
      await refreshTimes();
      syncPreferencesToBackend({ latitude: loc.lat, longitude: loc.lon }).catch(() => {});
    },
  };
}
