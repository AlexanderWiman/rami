/**
 * UX 2.0: Interactive heart of Prayer Space.
 * - Breathing animation (scale 1 → 1.03 → 1, 6s loop).
 * - Glow by time of day: morning gold, day emerald, evening teal, night moonlight blue.
 * - When isPrayerTimeNow: one long glow pulse + medium haptic (ceremonial activation).
 * - Orb drawn with react-native-svg Circle so Android renders a true circle (no octagon).
 */
import React, { useEffect, useMemo, useRef, memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';
import { useReduceMotion, shouldSkipContinuousAnimations } from '../utils/reduceMotion';
import { getOrbGlowPeriod, getOrbGlowColor } from '../utils/orbGlowByTime';
import { hapticMedium } from '../utils/haptics';
import type { NextPrayerResult, Language } from '../features/prayer/types';
import { formatCountdownShort, formatTime } from '../features/prayer/utils/nextPrayer';
import { getString, getPrayerName } from '../constants/i18n';
import { spacing } from '../theme/spacing';
import { fontSize, fontWeight, fontFamily } from '../theme/typography';

const ORB_SIZE = 150;
const BREATH_DURATION = 3000; // 3s in + 3s out = 6s loop
const GLOW_PADDING = 16;
const ORB_R = ORB_SIZE / 2;
const GLOW_SIZE = ORB_SIZE + GLOW_PADDING * 2;
const GLOW_R = GLOW_SIZE / 2;
const CENTER = GLOW_SIZE / 2;

export type TomorrowFirstPrayer = { name: import('../features/prayer/types').PrayerName; time: Date };

export type NextPrayerOrbProps = {
  nextPrayer: NextPrayerResult | null;
  tomorrowFirstPrayer?: TomorrowFirstPrayer | null;
  language: Language;
  prayerNameLabel: string;
  onOpenRadialMenu: () => void;
  /** When true, orb does one long glow pulse and triggers medium haptic (ceremonial prayer time). */
  isPrayerTimeNow?: boolean;
};

function NextPrayerOrbComponent({
  nextPrayer,
  tomorrowFirstPrayer = null,
  language,
  prayerNameLabel,
  onOpenRadialMenu,
  isPrayerTimeNow = false,
}: NextPrayerOrbProps) {
  const { colors, scheme, style: themeStyle } = useTheme();
  const isRoyal = themeStyle === 'royal';
  const reduceMotion = useReduceMotion();
  const skipAnim = useMemo(() => shouldSkipContinuousAnimations(reduceMotion), [reduceMotion]);
  const prevNow = useRef(false);

  const breathe = useSharedValue(1);
  const glowPulse = useSharedValue(1);
  const glowColor = useMemo(() => {
    // Royal theme always uses gold glow
    if (isRoyal) return 'rgba(230, 194, 122, 0.45)';
    const hour = new Date().getHours();
    const period = getOrbGlowPeriod(hour);
    return getOrbGlowColor(period, scheme === 'dark');
  }, [scheme, isRoyal]);

  useEffect(() => {
    if (skipAnim) {
      breathe.value = withTiming(1, { duration: 200 });
      return;
    }
    breathe.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: BREATH_DURATION, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: BREATH_DURATION, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );
    return () => {
      breathe.value = withTiming(1);
    };
  }, [skipAnim, breathe]);

  // Ceremonial: when it becomes prayer time, one long glow pulse + haptic
  useEffect(() => {
    if (isPrayerTimeNow && !prevNow.current) {
      prevNow.current = true;
      if (!skipAnim) {
        glowPulse.value = withSequence(
          withTiming(1.4, { duration: 800, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
        );
      }
      hapticMedium();
    }
    if (!isPrayerTimeNow) prevNow.current = false;
  }, [isPrayerTimeNow, skipAnim, glowPulse]);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathe.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.5 * glowPulse.value,
    transform: [{ scale: glowPulse.value }],
  }));

  if (!nextPrayer) {
    const tomorrowLine = tomorrowFirstPrayer
      ? getString(language, 'firstPrayerTomorrowAt')
          .replace('{name}', getPrayerName(language, tomorrowFirstPrayer.name))
          .replace('{time}', formatTime(tomorrowFirstPrayer.time))
      : null;
    const gold = '#E6C27A';
    const goldMuted = 'rgba(230, 194, 122, 0.85)';
    return (
      <View style={[
        styles.orbPlaceholder,
        {
          backgroundColor: isRoyal ? 'rgba(10, 25, 18, 0.75)' : colors.surfaceGlass,
          borderColor: isRoyal ? 'rgba(230, 194, 122, 0.5)' : colors.border,
        },
      ]}>
        <Text
          style={[
            styles.name,
            styles.placeholderText,
            { color: isRoyal ? gold : colors.textOnSurfaceMuted },
            isRoyal && styles.royalTextShadow,
          ]}
          numberOfLines={2}
          adjustsFontSizeToFit
        >
          {getString(language, 'noUpcomingPrayer')}
        </Text>
        {tomorrowLine ? (
          <Text
            style={[
              styles.atTime,
              styles.placeholderText,
              {
                color: isRoyal ? goldMuted : colors.textOnSurfaceMuted,
                marginTop: spacing.xs,
              },
              isRoyal && styles.royalTextShadow,
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {tomorrowLine}
          </Text>
        ) : null}
      </View>
    );
  }

  const atTime = getString(language, 'nextPrayerAt').replace('{time}', formatTime(nextPrayer.prayer.time));

  return (
    <TouchableOpacity activeOpacity={1} onPress={onOpenRadialMenu} style={styles.touchable}>
      <Animated.View style={[styles.orbWrapper, orbStyle]}>
        <Animated.View style={[StyleSheet.absoluteFill, glowStyle]} pointerEvents="none">
          <Svg width={GLOW_SIZE} height={GLOW_SIZE} style={styles.svgGlow}>
            <Circle cx={CENTER} cy={CENTER} r={GLOW_R} fill={glowColor} />
          </Svg>
        </Animated.View>
        <Svg width={GLOW_SIZE} height={GLOW_SIZE} style={styles.svgOrb} pointerEvents="none">
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={ORB_R}
            fill={isRoyal ? 'rgba(10, 25, 18, 0.75)' : colors.surfaceGlass}
            stroke={isRoyal ? 'rgba(230, 194, 122, 0.5)' : colors.border}
            strokeWidth={isRoyal ? 1.5 : 1}
          />
        </Svg>
        <View style={[styles.orbContent, { padding: spacing.md }]}>
          <Text
            style={[
              styles.name,
              { color: isRoyal ? 'rgba(255,255,255,0.95)' : colors.textOnSurface, fontFamily: fontFamily.heading },
              isRoyal && styles.royalTextShadow,
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {prayerNameLabel}
          </Text>
          <Text
            style={[
              styles.countdown,
              { color: isRoyal ? '#E6C27A' : colors.highlight },
              isRoyal && styles.royalTextShadow,
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatCountdownShort(nextPrayer.secondsUntil)}
          </Text>
          <Text
            style={[
              styles.atTime,
              { color: isRoyal ? 'rgba(255,255,255,0.7)' : colors.textOnSurfaceMuted },
              isRoyal && styles.royalTextShadow,
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {atTime}
          </Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const NextPrayerOrb = memo(NextPrayerOrbComponent);
export { NextPrayerOrb };

const styles = StyleSheet.create({
  touchable: { alignItems: 'center', justifyContent: 'center' },
  orbWrapper: {
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
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
  svgGlow: { position: 'absolute', left: 0, top: 0 },
  svgOrb: { position: 'absolute', left: 0, top: 0 },
  orbContent: {
    position: 'absolute',
    width: ORB_SIZE,
    height: ORB_SIZE,
    left: (GLOW_SIZE - ORB_SIZE) / 2,
    top: (GLOW_SIZE - ORB_SIZE) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbPlaceholder: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_R,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  placeholderText: {
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  countdown: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginTop: spacing.xs,
    letterSpacing: 0.5,
  },
  atTime: {
    fontSize: 11,
    marginTop: spacing.xxs,
  },
  royalTextShadow: {
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
