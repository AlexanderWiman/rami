/**
 * Qibla map: fullscreen map with user location and line to Kaaba.
 * Only UI we add is the back button (floating over the map).
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { ScreenWrapper } from '../../../components/ScreenWrapper';
import { BackBar } from '../../../components/BackBar';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { useTheme } from '../../../theme/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getString } from '../../../constants/i18n';
import { spacing } from '../../../theme/spacing';
import { fontSize } from '../../../theme/typography';
import { KAABA_LAT, KAABA_LON } from '../constants';

export function QiblaMapScreen() {
  const { colors, style: themeStyle } = useTheme();
  const isRoyal = themeStyle === 'royal';
  const { language } = useLanguage();
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapHeight, setMapHeight] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError(getString(language, 'locationPermissionNeeded'));
          setLoading(false);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({});
        const la = pos.coords.latitude;
        const lo = pos.coords.longitude;
        setLat(la);
        setLon(lo);
      } catch (e) {
        setError(e instanceof Error ? e.message : getString(language, 'couldNotGetDirection'));
      }
      setLoading(false);
    })();
  }, [language]);

  // Fallback: show map after short delay if onLayout never fires with height (some devices)
  useEffect(() => {
    const t = setTimeout(() => setMapHeight((h) => (h > 0 ? h : 300)), 150);
    return () => clearTimeout(t);
  }, []);

  if (loading) {
    return (
      <ScreenWrapper>
        <View style={styles.backOverlay}>
          <BackBar />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={isRoyal ? '#E6C27A' : colors.accent} />
          <Text style={[styles.hint, { color: isRoyal ? 'rgba(255,255,255,0.7)' : colors.textMuted }]}>
            {getString(language, 'findingDirection')}
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (error || lat == null || lon == null) {
    return (
      <ScreenWrapper>
        <View style={styles.backOverlay}>
          <BackBar />
        </View>
        <View style={styles.centered}>
          <Text style={[styles.hint, { color: isRoyal ? 'rgba(255,255,255,0.7)' : colors.textMuted }]}>
            {error ?? getString(language, 'noLocation')}
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  const latDelta = Math.min(180, Math.max(1, Math.abs(lat - KAABA_LAT) * 3, 20));
  const lonDelta = Math.min(360, Math.max(1, Math.abs(lon - KAABA_LON) * 3, 20));
  const region = {
    latitude: (lat + KAABA_LAT) / 2,
    longitude: (lon + KAABA_LON) / 2,
    latitudeDelta: latDelta,
    longitudeDelta: lonDelta,
  };
  const line = [
    { latitude: lat, longitude: lon },
    { latitude: KAABA_LAT, longitude: KAABA_LON },
  ];

  return (
    <ScreenWrapper disableBackground>
      <View style={StyleSheet.absoluteFill}>
        <View
          style={styles.mapContainer}
          onLayout={(e) => setMapHeight(e.nativeEvent.layout.height)}
        >
          {mapHeight > 0 && (
            <MapView
              style={StyleSheet.absoluteFill}
              initialRegion={region}
              showsUserLocation
              showsMyLocationButton
              mapType="standard"
            >
              <Marker coordinate={{ latitude: KAABA_LAT, longitude: KAABA_LON }} title="Kaaba" />
              <Polyline coordinates={line} strokeColor={isRoyal ? '#E6C27A' : '#1a472a'} strokeWidth={3} />
            </MapView>
          )}
        </View>
        <View style={styles.backOverlay} pointerEvents="box-none">
          <BackBar />
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hint: { fontSize: fontSize.md, marginTop: spacing.md, textAlign: 'center', marginHorizontal: spacing.lg },
  backOverlay: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
  },
  mapContainer: { flex: 1 },
});
