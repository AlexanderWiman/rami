/**
 * Single prayer as a rounded pill. Active glows gold; past fades.
 * UX 2.0: Long-press opens PrayerQuickSettingsSheet.
 * When isNow (ceremonial prayer time): 8% scale, gold line left→right, "Now" fade-in.
 * Royal theme: dark glass with gold accents for readability.
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  FadeIn,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';
import { useReduceMotion, shouldSkipContinuousAnimations } from '../utils/reduceMotion';
import { spacing, radius } from '../theme/spacing';
import { fontSize, fontWeight } from '../theme/typography';
import type { PrayerTime } from '../features/prayer/types';

const GOLD = '#E6C27A';

type TimePillProps = {
  prayer: PrayerTime;
  label: string;
  time: string;
  isActive: boolean;
  isPast: boolean;
  isNow?: boolean;
  nowLabel: string;
  onLongPress?: (prayer: PrayerTime) => void;
};

export function TimePill({ prayer, label, time, isActive, isPast, isNow, nowLabel, onLongPress }: TimePillProps) {
  const { colors, style: themeStyle } = useTheme();
  const isRoyal = themeStyle === 'royal';
  const reduceMotion = useReduceMotion();
  const skipAnim = shouldSkipContinuousAnimations(reduceMotion);

  const lineWidth = useSharedValue(0);
  const pillScale = useSharedValue(isNow ? 1.08 : 1);

  useEffect(() => {
    if (!isNow || skipAnim) {
      lineWidth.value = 0;
      pillScale.value = withTiming(1, { duration: 200 });
      return;
    }
    pillScale.value = withTiming(1.08, { duration: 300, easing: Easing.out(Easing.ease) });
    lineWidth.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) });
  }, [isNow, skipAnim, lineWidth, pillScale]);

  const animatedPillStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pillScale.value }],
  }));

  const Wrapper = onLongPress ? TouchableOpacity : View;
  const wrapperProps = onLongPress
    ? { activeOpacity: 0.8, onLongPress: () => onLongPress(prayer) }
    : {};

  // Royal theme colors
  if (isRoyal) {
    const isHighlighted = isActive || isNow;
    const rowBg = isHighlighted
      ? 'rgba(10, 25, 18, 0.65)'
      : 'rgba(10, 25, 18, 0.55)';
    const rowBorder = isHighlighted
      ? 'rgba(230, 194, 122, 0.55)'
      : isActive
        ? 'rgba(230, 194, 122, 0.30)'
        : 'rgba(255, 255, 255, 0.10)';
    const labelColor = isHighlighted ? 'rgba(255,255,255,0.98)' : 'rgba(255,255,255,0.92)';
    const timeColor = isNow ? GOLD : 'rgba(255,255,255,0.92)';
    const rowOpacity = isPast && !isNow ? 0.55 : 1;

    return (
      <Wrapper {...wrapperProps}>
        {/* Gold glow behind active row */}
        {isNow && (
          <View style={styles.royalGlow} pointerEvents="none" />
        )}
        <Animated.View
          style={[
            styles.pill,
            styles.royalPill,
            {
              backgroundColor: rowBg,
              borderColor: rowBorder,
              opacity: rowOpacity,
            },
            animatedPillStyle,
          ]}
        >
          <Text style={[styles.label, styles.royalLabel, { color: labelColor, fontWeight: isHighlighted ? fontWeight.semibold : fontWeight.medium }]}>
            {label}
          </Text>
          <View style={styles.timeRow}>
            <Text style={[styles.time, styles.royalTime, { color: timeColor, fontWeight: isHighlighted ? fontWeight.bold : fontWeight.medium }]}>
              {time}
            </Text>
            {isNow && (
              <Animated.View entering={FadeIn.duration(400)} style={styles.nowBadge}>
                <Text style={styles.nowBadgeText}>{nowLabel}</Text>
              </Animated.View>
            )}
          </View>
        </Animated.View>
      </Wrapper>
    );
  }

  // Classic theme (unchanged)
  return (
    <Wrapper {...wrapperProps}>
      <Animated.View
        style={[
          styles.pill,
          {
            backgroundColor: isActive || isNow ? colors.highlightGlow : colors.surfaceGlass,
            borderColor: isActive || isNow ? colors.accent : colors.border,
            opacity: isPast && !isNow ? 0.6 : 1,
          },
          animatedPillStyle,
        ]}
      >
        <Text
          style={[
            styles.label,
            {
              color: isActive || isNow ? colors.textOnSurface : colors.textOnSurfaceSecondary,
              fontWeight: isActive || isNow ? fontWeight.semibold : fontWeight.medium,
            },
          ]}
        >
          {label}
        </Text>
        <View style={styles.timeRow}>
          <Text
            style={[
              styles.time,
              {
                color: isActive || isNow ? colors.textOnSurface : colors.textOnSurfaceMuted,
                fontWeight: isActive || isNow ? fontWeight.bold : fontWeight.medium,
              },
            ]}
          >
            {time}
          </Text>
          {isNow && (
            <Animated.Text
              entering={FadeIn.duration(400)}
              style={[styles.nowLabel, { color: colors.textOnSurface }]}
            >
              {nowLabel}
            </Animated.Text>
          )}
        </View>
      </Animated.View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.xs,
    ...(Platform.OS === 'android' ? {} : { overflow: 'hidden' as const }),
  },
  royalPill: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderWidth: 1,
  },
  royalGlow: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8 + spacing.xs,
    backgroundColor: 'rgba(230, 194, 122, 0.18)',
    borderRadius: radius.pill + 8,
    ...Platform.select({
      ios: {
        shadowColor: GOLD,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 22,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  label: {
    fontSize: fontSize.md,
  },
  royalLabel: {
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(0,0,0,0.55)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 6,
      },
      android: {},
    }),
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  time: {
    fontSize: fontSize.md,
  },
  royalTime: {
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(0,0,0,0.55)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 6,
      },
      android: {},
    }),
  },
  nowLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    fontStyle: 'italic',
  },
  nowBadge: {
    backgroundColor: 'rgba(230, 194, 122, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(230, 194, 122, 0.45)',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  nowBadgeText: {
    color: GOLD,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
});
