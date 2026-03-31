/**
 * Push notification registration service.
 * Manages device UUID, Expo Push Token, and backend sync.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = '@rami/device_id';
const REMOTE_PUSH_ACTIVE_KEY = '@rami/remote_push_active';

const API_BASE_URL =
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) ||
  'https://adventurous-bravery-production.up.railway.app/api';

const PROJECT_ID = Constants.expoConfig?.extra?.eas?.projectId ?? '81f46652-472d-4138-9a21-10d8415590c1';

// ── Device ID ──

function generateUUID(): string {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 1
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function getOrCreateDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = generateUUID();
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

// ── Remote push active flag ──

export async function isRemotePushRegistered(): Promise<boolean> {
  const val = await AsyncStorage.getItem(REMOTE_PUSH_ACTIVE_KEY);
  return val === 'true';
}

async function setRemotePushActive(active: boolean): Promise<void> {
  if (active) {
    await AsyncStorage.setItem(REMOTE_PUSH_ACTIVE_KEY, 'true');
  } else {
    await AsyncStorage.removeItem(REMOTE_PUSH_ACTIVE_KEY);
  }
}

// ── Push token ──

async function getExpoPushToken(): Promise<string | null> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });
    return tokenData.data;
  } catch (err) {
    console.warn('[pushRegistration] Failed to get push token:', err);
    return null;
  }
}

// ── Backend API calls ──

interface RegisterParams {
  latitude?: number;
  longitude?: number;
  timezone?: string;
  calculationMethod?: string;
  asrMethod?: string;
  highLatitudeRule?: string;
  prayerOffsets?: Record<string, number>;
  prayerNotify?: Record<string, boolean>;
  notificationsEnabled?: boolean;
  language?: string;
  selectedSound?: string;
  playAzanSound?: boolean;
}

/**
 * Register this device for remote push notifications.
 * Requests permissions, gets Expo Push Token, sends to backend.
 * Returns true if successfully registered.
 */
export async function registerForPushNotifications(params?: RegisterParams): Promise<boolean> {
  try {
    const token = await getExpoPushToken();
    if (!token) return false;

    const deviceId = await getOrCreateDeviceId();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const body = {
      deviceId,
      expoPushToken: token,
      platform: Platform.OS,
      timezone,
      ...params,
    };

    const res = await fetch(`${API_BASE_URL}/push/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.warn('[pushRegistration] register failed:', res.status);
      return false;
    }

    await setRemotePushActive(true);
    return true;
  } catch (err) {
    console.warn('[pushRegistration] register error:', err);
    return false;
  }
}

/**
 * Sync notification preferences to backend (call after settings change).
 * Fire-and-forget — failures are silently ignored.
 */
export async function syncPreferencesToBackend(params: {
  latitude?: number;
  longitude?: number;
  timezone?: string;
  calculationMethod?: string;
  asrMethod?: string;
  highLatitudeRule?: string;
  prayerOffsets?: Record<string, number>;
  prayerNotify?: Record<string, boolean>;
  notificationsEnabled?: boolean;
  language?: string;
  selectedSound?: string;
  playAzanSound?: boolean;
}): Promise<void> {
  try {
    const isActive = await isRemotePushRegistered();
    if (!isActive) return;

    const deviceId = await getOrCreateDeviceId();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    await fetch(`${API_BASE_URL}/push/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, timezone, ...params }),
    });
  } catch {
    // Fire-and-forget
  }
}

/** Unregister this device from remote push. */
export async function unregisterPush(): Promise<void> {
  try {
    const deviceId = await getOrCreateDeviceId();
    await fetch(`${API_BASE_URL}/push/unregister`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId }),
    });
  } catch {
    // ignore
  } finally {
    await setRemotePushActive(false);
  }
}

/** Send a test push notification to this device via backend. */
export async function sendTestPush(): Promise<boolean> {
  try {
    const isActive = await isRemotePushRegistered();
    if (!isActive) return false;

    const deviceId = await getOrCreateDeviceId();
    const res = await fetch(`${API_BASE_URL}/push/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
