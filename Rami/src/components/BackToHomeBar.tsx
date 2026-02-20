/**
 * "Tillbaka till startsidan" — tydlig hemknapp nu när ingen flytande meny följer med.
 * Royal: guld-pill med mörk bakgrund; Classic: accent-färg, större touch target.
 */
import React from 'react';
import { Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getString } from '../constants/i18n';
import { spacing, radius } from '../theme/spacing';
import { fontSize, fontWeight } from '../theme/typography';

const MIN_TOUCH_HEIGHT = 44;

export function BackToHomeBar() {
  const { colors, style: themeStyle } = useTheme();
  const isRoyal = themeStyle === 'royal';
  const { language } = useLanguage();
  const router = useRouter();
  const label = getString(language, 'backToHome');

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => router.replace('/')}
      style={[
        styles.touchable,
        isRoyal ? styles.touchableRoyal : { backgroundColor: colors.surfaceGlass, borderColor: colors.border },
      ]}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Text style={[
        styles.label,
        { color: isRoyal ? colors.accent : colors.highlight },
        isRoyal && styles.royalShadow,
      ]}>
        ← {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: MIN_TOUCH_HEIGHT,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    marginBottom: spacing.xs,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  touchableRoyal: {
    backgroundColor: 'rgba(10, 25, 18, 0.75)',
    borderColor: 'rgba(230, 194, 122, 0.4)',
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  royalShadow: {
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
      },
      android: {
        textShadowColor: 'rgba(0,0,0,0.6)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
      },
    }),
  },
});
