/**
 * Frosted glass panel — soft depth, no hard borders.
 * Uses SVG rounded rect so Android corners stay round.
 * Royal theme: dark gold glass with gold border.
 */
import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { spacing, radius } from '../theme/spacing';

// Royal theme colors
const ROYAL_FILL = 'rgba(10, 25, 18, 0.72)';
const ROYAL_STROKE = 'rgba(230, 194, 122, 0.28)';

type GlassCardProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: keyof typeof spacing;
  rounded?: keyof typeof radius;
  fillColor?: string;
  strokeColor?: string;
  /** If true, use classic theme colors even in Royal mode */
  forceClassic?: boolean;
};

export function GlassCard({
  children,
  style,
  padding = 'md',
  rounded = 'lg',
  fillColor,
  strokeColor,
  forceClassic = false,
}: GlassCardProps) {
  const { colors, style: themeStyle } = useTheme();
  const isRoyal = themeStyle === 'royal' && !forceClassic;
  const borderRadius = radius[rounded];
  const cardRadius = Platform.OS === 'android' ? borderRadius + 4 : borderRadius;
  
  // Use Royal colors if in Royal mode and no explicit colors provided
  const finalFill = fillColor ?? (isRoyal ? ROYAL_FILL : colors.surfaceGlass);
  const finalStroke = strokeColor ?? (isRoyal ? ROYAL_STROKE : colors.border);
  
  return (
    <View style={[styles.card, { borderRadius, overflow: 'hidden' }, style]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
        <Rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          rx={cardRadius}
          ry={cardRadius}
          fill={finalFill}
          stroke={finalStroke}
          strokeWidth={isRoyal ? 1 : StyleSheet.hairlineWidth}
        />
      </Svg>
      <View style={[styles.content, { padding: spacing[padding] }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'transparent',
    alignSelf: 'stretch',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  content: {
    flex: 1,
    flexShrink: 0,
    minHeight: 0,
  },
});
