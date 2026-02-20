/**
 * UX 2.0: Haptic feedback for meaningful actions.
 * Light impact = selections; Medium = alignment / ceremony.
 * TODO: Respect "Reduce Motion" / "Haptic" OS setting when exposed by React Native.
 */
import * as Haptics from 'expo-haptics';

export async function hapticLight(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    /* no-op if haptics unavailable */
  }
}

export async function hapticMedium(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    /* no-op */
  }
}

export async function hapticSelection(): Promise<void> {
  try {
    await Haptics.selectionAsync();
  } catch {
    /* no-op */
  }
}

export async function hapticSuccess(): Promise<void> {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    /* no-op */
  }
}
