/**
 * UX 2.0: Prayer Mode — fullscreen, distraction-free.
 * Prayer name, Qibla hint, "Begin". On Begin: play Azan, dim screen, haptic.
 * TODO: Lock orientation (e.g. expo-screen-orientation) when entering prayer mode.
 * TODO: Native "focus mode" / keep screen on (e.g. expo-keep-awake) when supported.
 */
import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '../src/theme/ThemeContext';
import { useLanguage } from '../src/contexts/LanguageContext';
import { ScreenWrapper } from '../src/components/ScreenWrapper';
import { getPrayerName } from '../src/constants/i18n';
import { playAzanSound } from '../src/features/prayer/utils/playAzan';
import { loadPrayerSettings } from '../src/features/prayer/storage/prayerSettings';
import { hapticMedium } from '../src/utils/haptics';
import { spacing } from '../src/theme/spacing';
import { fontSize, fontWeight, fontFamily } from '../src/theme/typography';
import type { PrayerName } from '../src/features/prayer/types';

export default function PrayerModeScreen() {
  const { colors, scheme, style: themeStyle } = useTheme();
  const { language } = useLanguage();
  const router = useRouter();
  const params = useLocalSearchParams<{ prayer?: string }>();
  const prayerName = (params.prayer as PrayerName) ?? 'Dhuhr';
  const [begun, setBegun] = useState(false);
  const [playing, setPlaying] = useState(false);
  const dim = useSharedValue(0);

  const label = getPrayerName(language, prayerName);
  const beginLabel = language === 'ar' ? 'ابدأ' : 'Begin';

  const onBegin = useCallback(async () => {
    if (begun) return;
    setBegun(true);
    hapticMedium();
    dim.value = withTiming(1, { duration: 800 });
    setPlaying(true);
    try {
      const s = await loadPrayerSettings();
      await playAzanSound(
        (s?.selectedSound as import('../src/features/prayer/utils/playAzan').SoundKey) ?? 'azan1',
        s?.respectSilentMode ?? true
      );
    } finally {
      setPlaying(false);
    }
  }, [begun, dim]);

  const dimStyle = useAnimatedStyle(() => ({
    opacity: dim.value * 0.4,
  }));

  // For classic theme, use dark green background; for royal, use the bg.png via ScreenWrapper
  const classicBg = scheme === 'dark' ? colors.background : '#0E2A1F';

  return (
    <ScreenWrapper edges={['top', 'bottom']} style={themeStyle !== 'royal' ? { backgroundColor: classicBg } : undefined}>
      <View style={styles.inner}>
        <Text style={[styles.prayerName, { color: colors.text }]}>{label}</Text>
        <TouchableOpacity
          style={[styles.qiblaHint, { borderColor: colors.border }]}
          onPress={() => router.push('/qibla')}
          activeOpacity={0.8}
        >
          <Text style={[styles.qiblaText, { color: colors.textMuted }]}>
            {language === 'ar' ? 'اتجاه القبلة' : 'Qibla direction'}
          </Text>
        </TouchableOpacity>
        <View style={styles.footer}>
          {!begun ? (
            <TouchableOpacity
              style={[styles.beginBtn, { backgroundColor: colors.highlight }]}
              onPress={onBegin}
              activeOpacity={0.8}
            >
              <Text style={[styles.beginText, { color: '#fff' }]}>{beginLabel}</Text>
            </TouchableOpacity>
          ) : playing ? (
            <ActivityIndicator size="large" color={colors.accent} />
          ) : (
            <TouchableOpacity
              style={[styles.beginBtn, { backgroundColor: colors.surfaceGlass, borderColor: colors.border }]}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Text style={[styles.beginText, { color: colors.text }]}>
                {language === 'ar' ? 'إغلاق' : 'Close'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, dimStyle]} pointerEvents="none" />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  prayerName: {
    fontSize: 32,
    fontWeight: fontWeight.regular,
    fontFamily: fontFamily.heading,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
  qiblaHint: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  qiblaText: { fontSize: fontSize.sm },
  footer: { paddingBottom: spacing.xl, minHeight: 56, justifyContent: 'center', alignItems: 'center' },
  beginBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: 999,
    minWidth: 160,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  beginText: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
});
