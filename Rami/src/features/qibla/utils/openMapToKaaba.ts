/**
 * Opens the system map app with directions to the Kaaba.
 * Uses Google Maps on Android, Apple Maps on iOS.
 * Avoids in-app MapView which requires Google API key on Android.
 */
import { Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import { KAABA_LAT, KAABA_LON } from '../constants';

export async function openMapToKaaba(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return false;

    const pos = await Location.getCurrentPositionAsync({});
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;

    const origin = `${lat},${lon}`;
    const destination = `${KAABA_LAT},${KAABA_LON}`;

    let url: string;
    if (Platform.OS === 'ios') {
      url = `https://maps.apple.com/?daddr=${destination}&saddr=${origin}`;
    } else {
      url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&origin=${origin}`;
    }

    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
