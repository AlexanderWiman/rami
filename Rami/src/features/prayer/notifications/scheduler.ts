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
import type { PrayerTime, PrayerSettings } from '../types';
import { getPrayerName } from '../../../constants/i18n';
import type { Language } from '../types';
import { loadMuteNextPrayerUntil } from '../storage/muteNextPrayer';
import { isAzanSoundKey } from '../constants/azan';
import {
  PRAYER_CHANNEL_ID,
  getPrayerChannelIdForSound,
  ensureAndroidNotificationChannels,
  ensurePrayerChannelForSound,
} from './channels';

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
  await ensureAndroidNotificationChannels();
  const useCustomSound = settings.playAzanSound && isAzanSoundKey(settings.selectedSound);
  if (useCustomSound) await ensurePrayerChannelForSound(settings.selectedSound);
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
        vibrate: true,
        ...(Platform.OS === 'ios' && {
          data: { prayerName: p.name, screen: '/', playAzan: settings.playAzanSound },
        }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: p.time,
        channelId,
      },
    });
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
      vibrate: true,
      ...(Platform.OS === 'ios' && { data: { screen: '/', playAzan: settings.playAzanSound } }),
    },
    trigger,
  });
}
