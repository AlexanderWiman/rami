/**
 * Shown while a pending over-the-air update is being downloaded at launch.
 *
 * It appears only once an update is known to exist — not during the check —
 * because most launches have nothing to fetch and a notice that flashes up
 * every time would be noise rather than information.
 */
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getString } from '../constants/i18n';
import { spacing, radius } from '../theme/spacing';
import { fontSize, fontWeight } from '../theme/typography';

export function UpdateOverlay() {
  const { colors, style: themeStyle } = useTheme();
  const { language } = useLanguage();
  const isRoyal = themeStyle === 'royal';
  const gold = isRoyal ? '#E6C27A' : colors.highlight;

  return (
    <View style={styles.backdrop} pointerEvents="auto">
      <View
        style={[
          styles.card,
          {
            backgroundColor: isRoyal ? 'rgba(8,22,15,0.98)' : colors.surface,
            borderColor: isRoyal ? 'rgba(230,194,122,0.35)' : colors.border,
          },
        ]}
      >
        <ActivityIndicator size="large" color={gold} />
        <Text
          style={[styles.text, { color: isRoyal ? 'rgba(255,255,255,0.95)' : colors.text }]}
        >
          {getString(language, 'updateDownloading')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  card: {
    minWidth: 220,
    maxWidth: '80%',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, textAlign: 'center' },
});
