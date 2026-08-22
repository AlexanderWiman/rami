/**
 * Android notification channel configuration.
 * Uses new channel IDs (prayer_times_high_v2) because existing channels are immutable—
 * devices with old silent "prayer-times" or "expo_audio_channel" cannot be fixed in-place.
 */
import * as Notifications from 'expo-notifications';
import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';
import {
  AndroidAudioUsage,
  AndroidAudioContentType,
} from 'expo-notifications';
import { isAzanSoundKey } from '../constants/azan';

/**
 * Bundled azan .wav files from the expo-notifications plugin exist only in the app’s own
 * native binary (dev client / standalone). Expo Go never includes project notification
 * assets — `appOwnership` is unreliable (often null), so use the Expo Go native module check.
 */
export function areBundledNotificationAzanSoundsAvailable(): boolean {
  return !isRunningInExpoGo();
}

/** Single channel for default-sound prayer notifications. Always has sound + vibration. */
export const PRAYER_CHANNEL_ID = 'prayer_times_high_v2';

/** Channel ID for custom azan sound (e.g. prayer_times_high_v2_azan1). */
export function getPrayerChannelIdForSound(selectedSound: string): string {
  if (!isAzanSoundKey(selectedSound)) return PRAYER_CHANNEL_ID;
  return `${PRAYER_CHANNEL_ID}_${selectedSound}`;
}

function getNotificationSoundName(selectedSound: string): string {
  return isAzanSoundKey(selectedSound) ? `${selectedSound}_notification.wav` : 'default';
}

const DEFAULT_VIBRATION_PATTERN = [0, 250, 250, 250];

/**
 * Creates/overwrites the default prayer channel with sound + vibration.
 * Idempotent; safe to call on every app start.
 */
async function ensureDefaultPrayerChannel(): Promise<void> {
  await Notifications.setNotificationChannelAsync(PRAYER_CHANNEL_ID, {
    name: 'Prayer times',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    enableVibrate: true,
    vibrationPattern: DEFAULT_VIBRATION_PATTERN,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

/**
 * Creates/overwrites a custom-azan prayer channel with sound + vibration.
 * Idempotent; safe to call on every app start.
 */
async function ensureCustomAzanChannel(selectedSound: string): Promise<void> {
  const soundName = getNotificationSoundName(selectedSound);
  const channelId = getPrayerChannelIdForSound(selectedSound);
  await Notifications.setNotificationChannelAsync(channelId, {
    name: 'Prayer times',
    importance: Notifications.AndroidImportance.MAX,
    sound: soundName,
    enableVibrate: true,
    vibrationPattern: DEFAULT_VIBRATION_PATTERN,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    audioAttributes: {
      usage: AndroidAudioUsage.ALARM,
      contentType: AndroidAudioContentType.SONIFICATION,
      flags: {
        enforceAudibility: true,
        requestHardwareAudioVideoSynchronization: false,
      },
    },
  });
}

/**
 * Boot step: ensure the default Android prayer channel exists.
 * Call on app start, before scheduling any notifications.
 * Custom azan channels are created on-demand when scheduling.
 * Safe for iOS (no-op).
 */
export async function ensureAndroidNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await ensureDefaultPrayerChannel();
}

/**
 * Ensures the channel for the given sound exists. Call before scheduling when using custom azan.
 * Idempotent.
 */
export async function ensurePrayerChannelForSound(selectedSound: string): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (!areBundledNotificationAzanSoundsAvailable()) return;
  if (isAzanSoundKey(selectedSound)) {
    await ensureCustomAzanChannel(selectedSound);
  } else {
    await ensureDefaultPrayerChannel();
  }
}
