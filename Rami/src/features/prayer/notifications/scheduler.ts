/**
 * Prayer notification scheduler. Schedules only prayers with prayerNotify[name]=true,
 * using offset-adjusted times (caller passes already-adjusted PrayerTime[]).
 * UX 2.0: Skips the "muted" next prayer when user chose Mute Next Prayer (loadMuteNextPrayerUntil).
 * When playAzanSound is on: uses 30-sec bundled azan as notification sound (plays when app is closed).
 *
 * Uses prayer_times_high_v2 channel (see channels.ts) to avoid immutable silent channels on existing devices.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { PrayerTime, PrayerSettings, Language } from '../types';
import { getPrayerName, getString } from '../../../constants/i18n';
import { loadMuteNextPrayerUntil } from '../storage/muteNextPrayer';
import { isAzanSoundKey } from '../constants/azan';
import {
  PRAYER_CHANNEL_ID,
  getPrayerChannelIdForSound,
  ensureAndroidNotificationChannels,
  ensurePrayerChannelForSound,
} from './channels';

/** Prefix for hourly dhikr slot ids (`${prefix}-${index}`). Rescheduled whenever prayer notifications refresh. */
export const DHIKR_HOURLY_NOTIFICATION_ID_PREFIX = 'rami-dhikr-hourly';

/** First hourly slot id; kept for any older code or caches expecting this export. */
export const ALHAMDULILLAH_REMINDER_NOTIFICATION_ID = `${DHIKR_HOURLY_NOTIFICATION_ID_PREFIX}-0`;

/** Rolling window of one-shot notifications; stays under iOS ~64 cap with same-day prayer reminders. */
const DHIKR_HOURLY_SLOT_COUNT = 36;
const HOUR_MS = 60 * 60 * 1000;

function nextCalendarHourAfterNow(): Date {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(0, 0);
  if (d.getTime() <= Date.now()) {
    d.setTime(d.getTime() + HOUR_MS);
  }
  return d;
}

/** Sound name for notification (matches assets/sounds/{key}_notification.wav — underscore for Android). */
function getNotificationSoundName(selectedSound: string): string {
  return isAzanSoundKey(selectedSound) ? `${selectedSound}_notification.wav` : 'default';
}

/**
 * Schedules local notifications for each prayer time today where prayerNotify[name] is true.
 * Skips the prayer whose time equals muteNextPrayerUntil (user muted that one).
 * On Android 8+: uses prayer_times_high_v2 channel (sound + vibration enabled).
 */
export async function scheduleTodayNotifications(
  prayerTimes: PrayerTime[],
  settings: PrayerSettings,
  lang: Language
): Promise<void> {
  if (!settings.notificationsEnabled) return;
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  // Always ensure Android channels exist (needed for both local AND remote push sound)
  await ensureAndroidNotificationChannels();
  const useCustomSound = settings.playAzanSound && isAzanSoundKey(settings.selectedSound);
  if (useCustomSound) await ensurePrayerChannelForSound(settings.selectedSound);

  // Always schedule local notifications regardless of remote push status.
  // Remote push is an additional delivery mechanism, not a replacement —
  // the backend can miss pushes due to server restarts, cron failures, or stale tokens.
  const now = Date.now();
  const muteUntil = await loadMuteNextPrayerUntil();
  const channelId =
    Platform.OS === 'android'
      ? useCustomSound
        ? getPrayerChannelIdForSound(settings.selectedSound)
        : PRAYER_CHANNEL_ID
      : undefined;
  const sound = Platform.OS === 'ios' ? (useCustomSound ? getNotificationSoundName(settings.selectedSound) : true) : true;
  for (const p of prayerTimes) {
    if (!settings.prayerNotify[p.name]) continue;
    if (p.time.getTime() <= now) continue;
    if (muteUntil != null && p.time.getTime() === muteUntil) continue; // Mute Next Prayer
    const titleEn = `It's time for ${p.name}`;
    const titleAr = `حان وقت ${getPrayerName('ar', p.name)}`;
    const title = lang === 'ar' ? titleAr : titleEn;
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: '',
        sound,
        vibrate: [0, 250, 250, 250],
        data: {
          ramiKind: 'prayer' as const,
          prayerName: p.name,
          screen: '/',
          playAzan: settings.playAzanSound,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: p.time,
        channelId,
      },
    });
  }
}

/**
 * Local dhikr reminders every clock hour, alternating alhamdulillah and salawat (not via backend).
 * Uses a rolling window of DATE triggers (re-filled whenever notifications are rescheduled).
 */
export async function scheduleAlhamdulillahReminder(
  settings: PrayerSettings,
  lang: Language
): Promise<void> {
  if (!settings.notificationsEnabled || !settings.alhamdulillahReminderEnabled) return;
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  await ensureAndroidNotificationChannels();
  const channelId = Platform.OS === 'android' ? PRAYER_CHANNEL_ID : undefined;
  const titleAlham = getString(lang, 'alhamdulillahNotificationTitle');
  const bodyAlham = getString(lang, 'alhamdulillahNotificationBody');
  const titleSalawat = getString(lang, 'salawatNotificationTitle');
  const bodySalawat = getString(lang, 'salawatNotificationBody');

  let fireAt = nextCalendarHourAfterNow();
  for (let i = 0; i < DHIKR_HOURLY_SLOT_COUNT; i++) {
    const isAlham = i % 2 === 0;
    await Notifications.scheduleNotificationAsync({
      identifier: `${DHIKR_HOURLY_NOTIFICATION_ID_PREFIX}-${i}`,
      content: {
        title: isAlham ? titleAlham : titleSalawat,
        body: isAlham ? bodyAlham : bodySalawat,
        sound: true,
        vibrate: [0, 250, 250, 250],
        data: isAlham
          ? { ramiKind: 'alhamdulillah' as const, screen: '/' }
          : { ramiKind: 'salawat' as const, screen: '/' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireAt,
        channelId,
      },
    });
    fireAt = new Date(fireAt.getTime() + HOUR_MS);
  }
}

/** Cancels all scheduled prayer notifications. */
export async function cancelAllPrayerNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Schedules a test notification for ~10 seconds from now. Use to verify notification + sound on device.
 * Uses prayer_times_high_v2 channel on Android.
 */
export async function scheduleTestNotification(settings: PrayerSettings): Promise<void> {
  await ensureAndroidNotificationChannels();
  const useCustomSound = settings.playAzanSound && isAzanSoundKey(settings.selectedSound);
  if (useCustomSound) await ensurePrayerChannelForSound(settings.selectedSound);
  const channelId =
    Platform.OS === 'android'
      ? useCustomSound
        ? getPrayerChannelIdForSound(settings.selectedSound)
        : PRAYER_CHANNEL_ID
      : undefined;
  const sound = Platform.OS === 'ios' ? (useCustomSound ? getNotificationSoundName(settings.selectedSound) : true) : true;
  const trigger: Notifications.TimeIntervalTriggerInput = {
    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
    seconds: 10,
    channelId,
  };
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Test – Böneutrop',
      body: 'Om du hör detta har notisen fungerat.',
      sound,
      vibrate: [0, 250, 250, 250],
      ...(Platform.OS === 'ios' && { data: { screen: '/', playAzan: settings.playAzanSound } }),
    },
    trigger,
  });
}
