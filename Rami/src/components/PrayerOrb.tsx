/**
 * Next Prayer Orb — floating circular glass with prayer name and countdown.
 * Subtle pulsing glow as prayer time approaches.
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';
import { spacing, radius } from '../theme/spacing';
import { fontSize, fontWeight, fontFamily } from '../theme/typography';
import type { NextPrayerResult, Language } from '../features/prayer/types';
import { formatCountdownShort } from '../features/prayer/utils/nextPrayer';
import { getString } from '../constants/i18n';

type PrayerOrbProps = {
  nextPrayer: NextPrayerResult | null;
  language: Language;
  prayerNameLabel: string;
};

export function PrayerOrb({ nextPrayer, language, prayerNameLabel }: PrayerOrbProps) {
  const { colors } = useTheme();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (!nextPrayer) return;
    const seconds = nextPrayer.secondsUntil;
    // Pulse more as prayer approaches (within 30 min)
    if (seconds < 30 * 60) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.03, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
        ),
        -1
      );
    } else {
      pulse.value = withTiming(1);
    }
    return () => {
      pulse.value = withTiming(1);
    };
  }, [nextPrayer?.secondsUntil, pulse]);

  const orbAnimated = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  if (!nextPrayer) {
    return (
      <View style={[styles.orb, { backgroundColor: colors.surfaceGlass, borderColor: colors.border }]}>
        <Text style={[styles.name, { color: colors.textMuted }]}>
          {getString(language, 'noUpcomingPrayer')}
        </Text>
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.orbWrapper,
        orbAnimated,
      ]}
    >
      <View
        style={[
          styles.glow,
          {
            backgroundColor: colors.highlightGlow,
            opacity: 0.5,
          },
        ]}
      />
      <View
        style={[
          styles.orb,
          {
            backgroundColor: colors.surfaceGlass,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.name, { color: colors.text, fontFamily: fontFamily.heading }]}>
          {prayerNameLabel}
        </Text>
        <Text style={[styles.countdown, { color: colors.accent }]}>
          {formatCountdownShort(nextPrayer.secondsUntil)}
        </Text>
      </View>
    </Animated.View>
  );
}

const ORB_SIZE = 180;

const styles = StyleSheet.create({
  orbWrapper: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: ORB_SIZE + 32,
    height: ORB_SIZE + 32,
    borderRadius: (ORB_SIZE + 32) / 2,
  },
  orb: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  name: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  countdown: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginTop: spacing.xs,
    letterSpacing: 0.5,
  },
});
