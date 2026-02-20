/**
 * Asma ul Husna voice preference storage.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AsmaVoiceId } from '../constants/voices';

const KEY_ASMA_VOICE = '@rami/asma_voice';

export async function loadAsmaVoice(): Promise<AsmaVoiceId> {
  try {
    const raw = await AsyncStorage.getItem(KEY_ASMA_VOICE);
    if (raw && typeof raw === 'string') return raw;
  } catch {
    /* ignore */
  }
  return 'ar';
}

export async function saveAsmaVoice(voiceId: AsmaVoiceId): Promise<void> {
  await AsyncStorage.setItem(KEY_ASMA_VOICE, voiceId);
}
