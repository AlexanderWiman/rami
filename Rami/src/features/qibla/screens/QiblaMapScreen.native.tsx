/**
 * Qibla map fallback: when compass accuracy < threshold or sensor missing,
 * show "Show on map". Uses expo-location + react-native-maps: user pin,
 * line/arrow to Kaaba, bearing in degrees.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../theme/ThemeContext';
import { ScreenWrapper } from '../../../components/ScreenWrapper';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { KAABA_LAT, KAABA_LON } from '../constants';
import { getBearing } from '../utils/bearing';

export function QiblaMapScreen() {
  const router = useRouter();
  const { pageBackground } = useTheme();
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [bearing, setBearing] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Location permission denied');
          setLoading(false);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({});
        const la = pos.coords.latitude;
        const lo = pos.coords.longitude;
        setLat(la);
        setLon(lo);
        setBearing(getBearing(la, lo, KAABA_LAT, KAABA_LON));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not get location');
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <ScreenWrapper>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1a472a" />
          <Text style={styles.loadingText}>Getting location…</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (error || lat == null || lon == null) {
    return (
      <ScreenWrapper>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Qibla</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error ?? 'No location'}</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const region = {
    latitude: (lat + KAABA_LAT) / 2,
    longitude: (lon + KAABA_LON) / 2,
    latitudeDelta: Math.max(20, Math.abs(lat - KAABA_LAT) * 3),
    longitudeDelta: Math.max(20, Math.abs(lon - KAABA_LON) * 3),
  };
  const line = [
    { latitude: lat, longitude: lon },
    { latitude: KAABA_LAT, longitude: KAABA_LON },
  ];

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Qibla</Text>
      </View>
      <View style={styles.bearingBar}>
        <Text style={styles.bearingLabel}>Bearing to Kaaba:</Text>
        <Text style={styles.bearingValue}>{bearing != null ? `${Math.round(bearing)}°` : '—'}</Text>
      </View>
      <MapView style={styles.map} initialRegion={region} showsUserLocation showsMyLocationButton>
        <Marker coordinate={{ latitude: KAABA_LAT, longitude: KAABA_LON }} title="Kaaba" />
        <Polyline coordinates={line} strokeColor="#1a472a" strokeWidth={3} />
      </MapView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#555' },
  errorText: { fontSize: 16, color: '#c62828', textAlign: 'center', marginHorizontal: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
    backgroundColor: '#fff',
  },
  backBtn: { paddingVertical: 8, paddingRight: 16 },
  backBtnText: { fontSize: 18, color: '#1a472a', fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '700', color: '#111' },
  bearingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#1a472a',
    gap: 8,
  },
  bearingLabel: { fontSize: 14, color: 'rgba(255,255,255,0.9)' },
  bearingValue: { fontSize: 18, fontWeight: '700', color: '#fff' },
  map: { flex: 1, width: '100%' },
});
