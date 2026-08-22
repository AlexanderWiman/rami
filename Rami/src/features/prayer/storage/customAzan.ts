/**
 * User-supplied adhan file: pick from the phone, copy into the app's document
 * directory (the picker URI is temporary) and remember it in AsyncStorage.
 *
 * In-app playback uses this file directly. Android notification sound cannot:
 * channel sounds must exist in the native binary at build time, so a prayer
 * notification with a custom file keeps the default notification sound and the
 * full custom adhan plays when the app is opened/foregrounded.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { CUSTOM_AZAN_KEY } from '../constants/customAzanKey';

const KEY_CUSTOM_AZAN = '@rami/custom_azan';

export { CUSTOM_AZAN_KEY };

export interface CustomAzan {
  /** file:// URI inside the app's document directory */
  uri: string;
  /** Original file name, shown in settings */
  name: string;
}

function getCustomAzanDir(): string {
  const base = FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? '';
  return base.endsWith('/') ? `${base}custom_azan/` : `${base}/custom_azan/`;
}

async function ensureDir(): Promise<void> {
  const dir = getCustomAzanDir();
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

/** Keeps only [a-zA-Z0-9._-] so the copied file name is safe on both platforms. */
function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_');
  return cleaned.length > 0 ? cleaned : 'adhan.mp3';
}

/** Returns the stored custom adhan, or null when none is set or the file is gone. */
export async function loadCustomAzan(): Promise<CustomAzan | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_CUSTOM_AZAN);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CustomAzan>;
    if (typeof parsed?.uri !== 'string' || parsed.uri.length === 0) return null;
    const info = await FileSystem.getInfoAsync(parsed.uri);
    if (!info.exists) {
      await AsyncStorage.removeItem(KEY_CUSTOM_AZAN);
      return null;
    }
    return { uri: parsed.uri, name: typeof parsed.name === 'string' ? parsed.name : 'adhan' };
  } catch {
    return null;
  }
}

export type PickCustomAzanResult =
  | { status: 'picked'; azan: CustomAzan }
  | { status: 'canceled' }
  | { status: 'error'; error: string };

/**
 * Opens the system file picker for an audio file and copies the pick into the
 * app's document directory. Replaces any previously picked file.
 */
export async function pickCustomAzan(): Promise<PickCustomAzanResult> {
  try {
    // Required lazily: expo-document-picker resolves its native module at
    // import time and throws when the installed build does not contain it.
    // Loading it here keeps that failure inside this call.
    const DocumentPicker = require('expo-document-picker') as typeof import('expo-document-picker');
    const result = await DocumentPicker.getDocumentAsync({
      type: 'audio/*',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.[0]) return { status: 'canceled' };

    const asset = result.assets[0];
    const originalName = asset.name ?? asset.uri.split('/').pop() ?? 'adhan.mp3';
    await ensureDir();
    // Remove earlier copies so the directory holds at most one file.
    await removeCustomAzanFiles();
    const target = `${getCustomAzanDir()}${Date.now()}_${sanitizeFileName(originalName)}`;
    await FileSystem.copyAsync({ from: asset.uri, to: target });

    const info = await FileSystem.getInfoAsync(target);
    if (!info.exists) return { status: 'error', error: 'Could not save the selected file.' };

    const azan: CustomAzan = { uri: target, name: originalName };
    await AsyncStorage.setItem(KEY_CUSTOM_AZAN, JSON.stringify(azan));
    return { status: 'picked', azan };
  } catch (e) {
    return { status: 'error', error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

/** Deletes copied files from the custom-azan directory (keeps the directory). */
async function removeCustomAzanFiles(): Promise<void> {
  try {
    const dir = getCustomAzanDir();
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) return;
    const entries = await FileSystem.readDirectoryAsync(dir);
    for (const entry of entries) {
      await FileSystem.deleteAsync(`${dir}${entry}`, { idempotent: true });
    }
  } catch {
    /* best effort */
  }
}

/** Forgets the custom adhan and deletes the copied file. */
export async function clearCustomAzan(): Promise<void> {
  await removeCustomAzanFiles();
  await AsyncStorage.removeItem(KEY_CUSTOM_AZAN);
}
