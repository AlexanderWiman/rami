/**
 * Onboarding: persist "done" so we show onboarding only when settings absent.
 *
 * On Android, AsyncStorage may survive reinstalls via allowBackup.
 * Guard against that by also requiring location data to exist.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_ONBOARDING_DONE = '@rami/onboarding_done';
const KEY_LOCATION = '@rami/location';

export async function isOnboardingDone(): Promise<boolean> {
  const [onboardingRaw, locationRaw] = await Promise.all([
    AsyncStorage.getItem(KEY_ONBOARDING_DONE),
    AsyncStorage.getItem(KEY_LOCATION),
  ]);
  return onboardingRaw === 'true' && locationRaw !== null;
}

export async function setOnboardingDone(): Promise<void> {
  await AsyncStorage.setItem(KEY_ONBOARDING_DONE, 'true');
}
