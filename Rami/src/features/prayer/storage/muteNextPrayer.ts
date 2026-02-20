/**
 * UX 2.0: "Mute Next Prayer" — persist until-timestamp so scheduler skips that one notification.
 * User taps Mute in RadialMenu → we save nextPrayer.prayer.time.getTime().
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_MUTE_NEXT_UNTIL = '@rami/mute_next_prayer_until';

export async function loadMuteNextPrayerUntil(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_MUTE_NEXT_UNTIL);
    if (raw == null) return null;
    const ts = parseInt(raw, 10);
    return Number.isNaN(ts) ? null : ts;
  } catch {
    return null;
  }
}

export async function saveMuteNextPrayerUntil(timestamp: number): Promise<void> {
  await AsyncStorage.setItem(KEY_MUTE_NEXT_UNTIL, String(timestamp));
}
