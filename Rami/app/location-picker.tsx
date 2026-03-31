/**
 * Manual location picker — search city/place and use GPS.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/theme/ThemeContext';
import { useLanguage } from '../src/contexts/LanguageContext';
import { ScreenWrapper } from '../src/components/ScreenWrapper';
import { BackBar } from '../src/components/BackBar';
import { GlassCard } from '../src/components/GlassCard';
import { getString } from '../src/constants/i18n';
import { saveLocation, saveMunicipalityLabel } from '../src/features/prayer/storage/prayerSettings';
import type { CachedLocation } from '../src/features/prayer/storage/prayerSettings';
import { clearLocationCache } from '../src/features/prayer/hooks/usePrayerTimes';
import { spacing, radius } from '../src/theme/spacing';
import { fontSize, fontWeight, fontFamily } from '../src/theme/typography';

type GeocodeResult = {
  lat: number;
  lon: number;
  label: string;
};

export default function LocationPickerScreen() {
  const { colors, style: themeStyle } = useTheme();
  const isRoyal = themeStyle === 'royal';
  const { language } = useLanguage();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const textPrimary = isRoyal ? 'rgba(255,255,255,0.95)' : colors.text;
  const textMuted = isRoyal ? 'rgba(255,255,255,0.55)' : colors.textMuted;
  const chipBg = isRoyal ? 'rgba(10, 25, 18, 0.5)' : colors.surfaceGlass;
  const chipBorder = isRoyal ? 'rgba(255,255,255,0.15)' : colors.border;
  const cardBg = isRoyal ? 'rgba(10, 25, 18, 0.72)' : colors.surfaceGlass;
  const cardBorder = isRoyal ? 'rgba(230, 194, 122, 0.28)' : colors.border;

  const searchPlaceholder = getString(language, 'locationSearchPlaceholder');
  const searchHint = getString(language, 'locationSearchHint');
  const useCurrentLabel = getString(language, 'useCurrentLocation');
  const noResultsLabel = getString(language, 'locationSearchNoResults');

  const quickCountries = language === 'ar' ? ['ليبيا', 'مصر', 'السعودية', 'تركيا'] : ['Libya', 'Egypt', 'Saudi Arabia', 'Turkey'];

  const buildLabel = useCallback((first: Location.LocationGeocodedAddress) => {
    const parts = [first.city, first.subregion, first.region, first.country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : '';
  }, []);

  const handleSearch = useCallback(async (overrideQuery?: string) => {
    const q = (overrideQuery ?? query).trim();
    if (!q || q.length < 2) return;
    if (overrideQuery) setQuery(overrideQuery);
    setError(null);
    setLoading(true);
    setResults([]);
    try {
      let geocoded: { latitude: number; longitude: number }[] = [];
      try {
        geocoded = await Location.geocodeAsync(q);
      } catch {
        geocoded = [];
      }
      type NominatimSearchItem = { lat: string; lon: string; display_name?: string };
      let nominatimResults: NominatimSearchItem[] | null = null;
      if (geocoded.length === 0) {
        nominatimResults = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=8`,
          { headers: { 'User-Agent': 'RamiPrayerApp/1.0' } }
        ).then((r) => r.json());
        geocoded = (nominatimResults || []).map((p) => ({
          latitude: parseFloat(p.lat),
          longitude: parseFloat(p.lon),
        }));
      }
      if (geocoded.length === 0) {
        setResults([]);
      } else {
        const items: GeocodeResult[] = await Promise.all(
          geocoded.slice(0, 8).map(async (g, i) => {
            const fromNominatim = nominatimResults?.[i]?.display_name;
            if (fromNominatim) {
              return { lat: g.latitude, lon: g.longitude, label: fromNominatim };
            }
            try {
              const addr = await Location.reverseGeocodeAsync({ latitude: g.latitude, longitude: g.longitude });
              const first = addr[0];
              let label = first ? buildLabel(first) : '';
              const hasCityLevel = first && !!(first.city || first.subregion || first.district);
              const isRegionOnly = first && !hasCityLevel && !!(first.region || first.country);
              if (isRegionOnly || !label) {
                const nm = await fetch(
                  `https://nominatim.openstreetmap.org/reverse?lat=${g.latitude}&lon=${g.longitude}&format=json`,
                  { headers: { 'User-Agent': 'RamiPrayerApp/1.0' } }
                ).then((r) => r.json());
                const a = nm?.address;
                if (a) {
                  const p = [a.city, a.town, a.village, a.municipality, a.county, a.state, a.country].filter(Boolean);
                  const nmLabel = p.join(', ');
                  if (nmLabel) label = nmLabel;
                }
              }
              return { lat: g.latitude, lon: g.longitude, label: label || `${g.latitude.toFixed(2)}, ${g.longitude.toFixed(2)}` };
            } catch {
              return { lat: g.latitude, lon: g.longitude, label: `${g.latitude.toFixed(2)}, ${g.longitude.toFixed(2)}` };
            }
          })
        );
        setResults(items);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, buildLabel]);
  const runSearch = () => handleSearch();
  const runSearchCountry = (country: string) => handleSearch(country);

  const handleUseGps = useCallback(async () => {
    setError(null);
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError(getString(language, 'locationPermissionNeeded'));
        setGpsLoading(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      let label = '';
      try {
        const addrs = await Location.reverseGeocodeAsync({
          latitude: coords.lat,
          longitude: coords.lon,
        });
        const first = addrs[0];
        if (first) {
          const locality = first.city || first.subregion || first.district || first.region;
          const parts = locality ? [locality, first.country] : [first.region, first.country];
          label = parts.filter(Boolean).join(', ') || '';
          const hasCityLevel = !!(first.city || first.subregion || first.district);
          const isRegionOnly = !hasCityLevel && !!(first.region || first.country);
          if (isRegionOnly) {
            try {
              const nm = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lon}&format=json`,
                { headers: { 'User-Agent': 'RamiPrayerApp/1.0' } }
              ).then((r) => r.json());
              const a = nm?.address;
              if (a) {
                const p = [a.city, a.town, a.village, a.municipality, a.county, a.state, a.country].filter(Boolean);
                label = p.length > 0 ? p.join(', ') : label;
              }
            } catch {
              /* keep label as region */
            }
          }
        }
        if (!label) {
          try {
            const nm = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lon}&format=json`,
              { headers: { 'User-Agent': 'RamiPrayerApp/1.0' } }
            ).then((r) => r.json());
            const a = nm?.address;
            if (a) {
              const p = [a.city, a.town, a.village, a.municipality, a.county, a.state, a.country].filter(Boolean);
              label = p.length > 0 ? p.join(', ') : '';
            }
          } catch {
            /* ignore */
          }
        }
      } catch {
        label = `${coords.lat.toFixed(2)}, ${coords.lon.toFixed(2)}`;
      }
      const loc: CachedLocation = { ...coords, label: label || undefined, manual: false };
      await saveLocation(loc);
      if (label) await saveMunicipalityLabel(label);
      clearLocationCache();
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not get location');
    } finally {
      setGpsLoading(false);
    }
  }, [language, router]);

  const handleSelectResult = useCallback(
    async (item: GeocodeResult) => {
      Keyboard.dismiss();
      const loc: CachedLocation = { lat: item.lat, lon: item.lon, label: item.label, manual: true };
      await saveLocation(loc);
      if (item.label) await saveMunicipalityLabel(item.label);
      clearLocationCache();
      router.back();
    },
    [router]
  );

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <View style={styles.header}>
          <BackBar />
          <GlassCard padding="md" rounded="lg" style={styles.titleCard} fillColor={cardBg} strokeColor={cardBorder}>
            <Text style={[styles.title, { color: textPrimary }]}>{getString(language, 'setLocationManually')}</Text>
          </GlassCard>
        </View>

        <Text style={[styles.hint, { color: textMuted }]}>{searchHint}</Text>
        <View style={styles.quickRow}>
          {quickCountries.map((country) => (
            <TouchableOpacity
              key={country}
              style={[styles.quickChip, { backgroundColor: chipBg, borderColor: chipBorder }]}
              onPress={() => runSearchCountry(country)}
            >
              <Text style={[styles.quickChipText, { color: textPrimary }]}>{country}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={[styles.searchRow, { backgroundColor: chipBg, borderColor: chipBorder }]}>
          <TextInput
            style={[styles.input, { color: textPrimary }]}
            placeholder={searchPlaceholder}
            placeholderTextColor={textMuted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.searchBtn, { backgroundColor: colors.highlight }]}
            onPress={runSearch}
            disabled={loading || query.trim().length < 2}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.searchBtnText}>{getString(language, 'search')}</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.gpsBtn, { backgroundColor: chipBg, borderColor: chipBorder }]}
          onPress={handleUseGps}
          disabled={gpsLoading}
        >
          {gpsLoading ? (
            <ActivityIndicator size="small" color={colors.highlight} />
          ) : (
            <Text style={[styles.gpsBtnText, { color: colors.highlight }]}>{useCurrentLabel}</Text>
          )}
        </TouchableOpacity>

        {error && (
          <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
        )}

        {results.length === 0 && !loading && query.trim().length >= 2 && (
          <Text style={[styles.noResults, { color: textMuted }]}>{noResultsLabel}</Text>
        )}

        <View style={[styles.resultsWrapper, { backgroundColor: cardBg, borderWidth: isRoyal ? 1 : 0, borderColor: cardBorder }]}>
          <FlatList
            data={results}
            keyExtractor={(item) => `${item.lat}-${item.lon}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.resultItem, { borderColor: chipBorder }]}
                onPress={() => handleSelectResult(item)}
                activeOpacity={0.7}
              >
                <Text style={[styles.resultLabel, { color: textPrimary }]} numberOfLines={2}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.lg },
  header: { paddingTop: spacing.lg, paddingBottom: spacing.md },
  titleCard: { marginBottom: spacing.md },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.regular, fontFamily: fontFamily.heading },
  hint: { fontSize: fontSize.xs, marginBottom: spacing.xs },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  quickChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  quickChipText: { fontSize: fontSize.sm },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    paddingVertical: spacing.md,
  },
  searchBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  searchBtnText: { color: '#fff', fontWeight: fontWeight.semibold, fontSize: fontSize.sm },
  gpsBtn: {
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  gpsBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  error: { fontSize: fontSize.sm, marginBottom: spacing.sm },
  noResults: { fontSize: fontSize.sm, marginBottom: spacing.sm },
  listContent: { paddingBottom: spacing.xxl },
  resultsWrapper: {
    flex: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  resultItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultLabel: { fontSize: fontSize.md },
});
