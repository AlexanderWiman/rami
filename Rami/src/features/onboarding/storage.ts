/**
 * Onboarding: persist "done" so we show onboarding only when settings absent.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_ONBOARDING_DONE = '@rami/onboarding_done';

export async function isOnboardingDone(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(KEY_ONBOARDING_DONE);
  return raw === 'true';
}

export async function setOnboardingDone(): Promise<void> {
  await AsyncStorage.setItem(KEY_ONBOARDING_DONE, 'true');
}
