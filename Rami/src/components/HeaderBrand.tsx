/**
 * HeaderBrand — centered Arabic/Latin brand with gold shimmer.
 */
import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts, Amiri_400Regular } from '@expo-google-fonts/amiri';
import { fontFamily } from '../theme/typography';
import { spacing } from '../theme/spacing';

const GOLD_SHADOW = 'rgba(230,194,122,0.55)';
const CREAM = '#F5F1E6';

type HeaderBrandProps = {
  arabic: string;
  latin: string;
  location: string;
  onLocationPress?: () => void;
};

export function HeaderBrand({ arabic, latin, location, onLocationPress }: HeaderBrandProps) {
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({ Amiri_400Regular });
  const arabicFont = fontsLoaded ? 'Amiri_400Regular' : fontFamily.arabic;

  const topPadding = insets.top + 18;

  const androidTextProps =
    Platform.OS === 'android'
      ? ({ includeFontPadding: false, textAlignVertical: 'center' } as const)
      : {};

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <Text style={[styles.arabic, { fontFamily: arabicFont }]} {...androidTextProps}>
        {arabic}
      </Text>
      <Text style={styles.latin} {...androidTextProps}>
        {latin}
      </Text>
      <View style={styles.arabicDivider} />

      {onLocationPress ? (
        <TouchableOpacity onPress={onLocationPress} activeOpacity={0.7} style={styles.locationTouchable}>
          <Text style={styles.location} numberOfLines={2}>
            {location}
          </Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.location} numberOfLines={2}>
          {location}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    alignItems: 'center',
    paddingBottom: spacing.sm,
  },
  arabic: {
    fontSize: Platform.OS === 'android' ? 38 : 36,
    lineHeight: Platform.OS === 'android' ? 48 : 44,
    color: CREAM,
    textAlign: 'center',
    writingDirection: 'rtl',
    textShadowColor: GOLD_SHADOW,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  arabicDivider: {
    width: 120,
    height: 1,
    backgroundColor: 'rgba(230,194,122,0.35)',
    marginTop: 10,
  },
  goldShimmerLine: {
    width: 140,
    height: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(230,194,122,0.22)',
    marginTop: 6,
  },
  latin: {
    marginTop: 0,
    fontSize: 14,
    opacity: 0.85,
    color: 'rgba(245,241,230,0.9)',
    textAlign: 'center',
  },
  locationTouchable: {
    marginTop: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  location: {
    marginTop: 0,
    fontSize: 14,
    color: 'rgba(245,241,230,0.85)',
    opacity: 0.8,
    textAlign: 'center',
    maxWidth: '92%',
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
      },
      android: {
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
      },
    }),
  },
});
