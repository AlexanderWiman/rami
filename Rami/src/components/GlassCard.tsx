/**
 * Frosted glass panel — soft depth, no hard borders.
 * Uses SVG rounded rect so Android corners stay round.
 * Royal theme: dark gold glass with gold border.
 */
import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, Platform, type LayoutChangeEvent } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { spacing, radius } from '../theme/spacing';

// Royal theme colors
const ROYAL_FILL = 'rgba(10, 25, 18, 0.72)';
const ROYAL_STROKE = 'rgba(230, 194, 122, 0.28)';

type GlassCardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: keyof typeof spacing;
  rounded?: keyof typeof radius;
  fillColor?: string;
  strokeColor?: string;
  /** If true, use classic theme colors even in Royal mode */
  forceClassic?: boolean;
  /** If false, content sizes to children (for cards in ScrollView). Default true for flex layouts. */
  fillContent?: boolean;
};

export function GlassCard({
  children,
  style,
  padding = 'md',
  rounded = 'lg',
  fillColor,
  strokeColor,
  forceClassic = false,
  fillContent = true,
}: GlassCardProps) {
  const { colors, style: themeStyle } = useTheme();
  const isRoyal = themeStyle === 'royal' && !forceClassic;
  const borderRadius = radius[rounded];
  const cardRadius = Platform.OS === 'android' ? borderRadius + 4 : borderRadius;
  
  // Use Royal colors if in Royal mode and no explicit colors provided
  const finalFill = fillColor ?? (isRoyal ? ROYAL_FILL : colors.surfaceGlass);
  const finalStroke = strokeColor ?? (isRoyal ? ROYAL_STROKE : colors.border);

  /**
   * react-native-svg sizes its canvas once and does not repaint when the parent
   * grows, so a percentage-sized rect keeps the height the card had at mount —
   * content that expands afterwards then spills outside the painted box. The
   * measured size is fed back in as pixels, which does repaint. Percentages are
   * kept until the first measurement so nothing flickers on the way in.
   */
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((prev) =>
      prev && Math.abs(prev.width - width) < 1 && Math.abs(prev.height - height) < 1
        ? prev
        : { width, height }
    );
  }, []);

  return (
    <View style={[styles.card, { borderRadius, overflow: 'hidden' }, style]} onLayout={handleLayout}>
      <Svg
        style={StyleSheet.absoluteFill}
        width={size?.width ?? '100%'}
        height={size?.height ?? '100%'}
        pointerEvents="none"
      >
        <Rect
          x="0"
          y="0"
          width={size?.width ?? '100%'}
          height={size?.height ?? '100%'}
          rx={cardRadius}
          ry={cardRadius}
          fill={finalFill}
          stroke={finalStroke}
          strokeWidth={isRoyal ? 1 : StyleSheet.hairlineWidth}
        />
      </Svg>
      <View style={[styles.content, fillContent && styles.contentFill, { padding: spacing[padding] }]}>{children}</View>
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
  content: { alignSelf: 'stretch' },
  contentFill: {
    flex: 1,
    flexShrink: 0,
    minHeight: 0,
  },
});
