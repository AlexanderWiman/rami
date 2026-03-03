/**
 * Quick Menu Grid — 2×4 grid in Burhank royal glass card.
 * Full theme: royal fill/stroke, textOnSurface, highlight/accent badges; RTL; 44px+ touch.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  I18nManager,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';
import { hapticLight } from '../utils/haptics';
import { getString } from '../constants/i18n';
import type { Language } from '../features/prayer/types';
import { useTheme } from '../theme/ThemeContext';
import { fontWeight, fontSize } from '../theme/typography';
import { spacing } from '../theme/spacing';

const ROYAL_FILL = 'rgba(10, 25, 18, 0.72)';
const ROYAL_STROKE = 'rgba(230, 194, 122, 0.28)';
const PANEL_RADIUS = 26;

export type QuickMenuIconName =
  | 'prayer'
  | 'quran'
  | 'bukhari'
  | 'qibla'
  | 'qa'
  | 'tasbih'
  | 'names'
  | 'adkhar'
  | 'settings'
  | 'forum'
  | 'calendar';

export type QuickMenuItem = {
  key: string;
  label: string;
  iconName: QuickMenuIconName;
  onPress: () => void;
  locked?: boolean;
};

const ICON_SIZE = 26;
const STROKE = 2;

export function QuickMenuIcon({ name, color }: { name: QuickMenuIconName; color: string }) {
  const strokeProps = {
    stroke: color,
    strokeWidth: STROKE,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none' as const,
  };
  switch (name) {
    case 'prayer':
      return (
        <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24">
          <Path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" {...strokeProps} />
          <Path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z" {...strokeProps} />
        </Svg>
      );
    case 'quran':
      return (
        <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24">
          <Path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" {...strokeProps} />
          <Path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" {...strokeProps} />
        </Svg>
      );
    case 'bukhari':
      return (
        <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24">
          <Path d="M4 4h13a3 3 0 0 1 3 3v13H7a3 3 0 0 0-3 3V4z" {...strokeProps} />
          <Path d="M7 4v19" {...strokeProps} />
          <Path d="M10 9h7M10 13h7" {...strokeProps} />
        </Svg>
      );
    case 'qibla':
      return (
        <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24">
          <Path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" {...strokeProps} />
          <Path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" {...strokeProps} />
        </Svg>
      );
    case 'qa':
      return (
        <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24">
          <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" {...strokeProps} />
          <Path d="M9.5 9a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.8-1.1 1.8" {...strokeProps} />
          <Path d="M12 16h.01" {...strokeProps} />
        </Svg>
      );
    case 'tasbih':
      return (
        <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24">
          <Path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" {...strokeProps} />
          <Path d="M5 21l2-6 6-2-2 6-6 2z" {...strokeProps} />
          <Path d="M19 19l2-6-6-2 2 6 6 2z" {...strokeProps} />
        </Svg>
      );
    case 'names':
      return (
        <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24">
          <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" {...strokeProps} />
        </Svg>
      );
    case 'adkhar':
      return (
        <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24">
          <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" {...strokeProps} />
        </Svg>
      );
    case 'settings':
      return (
        <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24">
          <Path
            d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
            {...strokeProps}
          />
        </Svg>
      );
    case 'forum':
      return (
        <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24">
          <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" {...strokeProps} />
        </Svg>
      );
    case 'calendar':
      return (
        <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24">
          <Path d="M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" {...strokeProps} />
          <Path d="M16 2v4M8 2v4M3 10h18" {...strokeProps} />
          <Path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" {...strokeProps} />
        </Svg>
      );
  }
}

const PANEL_PADDING = 20;
const GUTTER = 14;
const BADGE_SIZE = 60;

type QuickMenuGridProps = {
  items: QuickMenuItem[];
  variant?: 'light' | 'dark';
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function GridItem({
  item,
  badgeBg,
  badgeRing,
  labelColor,
}: {
  item: QuickMenuItem;
  badgeBg: string;
  badgeRing: string;
  labelColor: string;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = () => {
    scale.value = withTiming(0.98, { duration: 80 });
  };
  const onPressOut = () => {
    scale.value = withTiming(1, { duration: 120 });
  };
  const onPress = () => {
    hapticLight();
    item.onPress();
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[styles.item, animatedStyle]}
      accessibilityRole="button"
      accessibilityLabel={item.label}
    >
      <View style={[styles.badge, { backgroundColor: badgeBg, borderColor: badgeRing }]}>
        <QuickMenuIcon name={item.iconName} color={labelColor} />
        {item.locked && (
          <View style={[styles.lockBadge, { borderColor: badgeRing }]}>
            <Text style={[styles.lockText, { color: labelColor }]}>🔒</Text>
          </View>
        )}
      </View>
      <Text
        style={[styles.label, { color: labelColor, fontSize: fontSize.xs }]}
        numberOfLines={2}
      >
        {item.label}
      </Text>
    </AnimatedPressable>
  );
}

export function QuickMenuGrid({ items, variant = 'light' }: QuickMenuGridProps) {
  const { colors, style: themeStyle } = useTheme();
  const isRoyal = themeStyle === 'royal';

  const panelFill = isRoyal ? ROYAL_FILL : colors.surfaceGlass;
  const panelStroke = isRoyal ? ROYAL_STROKE : colors.border;
  const badgeBg = isRoyal ? 'rgba(31,111,84,0.22)' : colors.highlightGlow;
  const badgeRing = isRoyal ? 'rgba(230,194,122,0.55)' : colors.accentMuted;
  const labelColor = isRoyal ? colors.accent : colors.textOnSurface;

  const cardRadius = Platform.OS === 'android' ? PANEL_RADIUS + 4 : PANEL_RADIUS;

  // Support up to 3 rows dynamically
  const row1 = items.slice(0, 4);
  const row2 = items.slice(4, 8);
  const row3 = items.slice(8, 12);

  return (
    <View style={[styles.panel, { borderRadius: PANEL_RADIUS }]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
        <Rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          rx={cardRadius}
          ry={cardRadius}
          fill={panelFill}
          stroke={panelStroke}
          strokeWidth={1}
        />
      </Svg>
      <View style={[styles.grid, { padding: PANEL_PADDING }]}>
        <View style={[styles.row, I18nManager.isRTL && styles.rowRtl]}>
          {row1.map((item) => (
            <GridItem
              key={item.key}
              item={item}
              badgeBg={badgeBg}
              badgeRing={badgeRing}
              labelColor={labelColor}
            />
          ))}
        </View>
        <View style={[styles.row, row3.length === 0 && styles.rowLast, I18nManager.isRTL && styles.rowRtl]}>
          {row2.map((item) => (
            <GridItem
              key={item.key}
              item={item}
              badgeBg={badgeBg}
              badgeRing={badgeRing}
              labelColor={labelColor}
            />
          ))}
        </View>
        {row3.length > 0 && (
          <View style={[styles.row, styles.rowLast, I18nManager.isRTL && styles.rowRtl]}>
            {row3.map((item) => (
              <GridItem
                key={item.key}
                item={item}
                badgeBg={badgeBg}
                badgeRing={badgeRing}
                labelColor={labelColor}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  grid: {
    gap: GUTTER,
  },
  row: {
    flexDirection: 'row',
    gap: GUTTER,
    marginBottom: GUTTER,
  },
  rowRtl: {
    flexDirection: 'row-reverse',
  },
  rowLast: {
    marginBottom: 0,
  },
  item: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
    minHeight: 44,
    paddingVertical: spacing.xs,
  },
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  lockBadge: {
    position: 'absolute',
    right: -4,
    top: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockText: { fontSize: 12 },
  label: {
    fontWeight: fontWeight.semibold,
    maxWidth: '100%',
    textAlign: 'center',
  },
});

/** Returns localized menu items. Caller adds onPress. */
export function getMenuItems(
  language: Language
): Array<Omit<QuickMenuItem, 'onPress'> & { route?: string }> {
  return [
    { key: 'prayer', label: getString(language, 'prayerTimes'), iconName: 'prayer', route: '/prayer-times' },
    { key: 'quran', label: getString(language, 'navQuran'), iconName: 'quran', route: '/quran' },
    { key: 'bukhari', label: getString(language, 'navBukhari'), iconName: 'bukhari', route: '/bukhari' },
    { key: 'qibla', label: getString(language, 'navQibla'), iconName: 'qibla', route: '/qibla' },
    { key: 'calendar', label: getString(language, 'calendarTitle'), iconName: 'calendar', route: '/calendar' },
    { key: 'tasbih', label: getString(language, 'tasbihTitle'), iconName: 'tasbih', route: '/tasbih' },
    { key: 'names', label: getString(language, 'namesOfAllahTitle'), iconName: 'names', route: '/names' },
    { key: 'adkhar', label: getString(language, 'navAdkhar'), iconName: 'adkhar', route: '/adkhar' },
    { key: 'forum', label: getString(language, 'doubts'), iconName: 'forum', route: '/forum' },
    { key: 'settings', label: getString(language, 'navSettings'), iconName: 'settings', route: '/settings' },
  ];
}
