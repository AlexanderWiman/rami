/**
 * Typography: sacred, confident, minimal.
 * Headings: serif (Playfair-style). Body: clean sans. Arabic: Amiri/Noto Naskh.
 */
import { Platform } from 'react-native';

export const fontFamily = {
  heading: Platform.select({ ios: 'Georgia', android: 'serif' }),
  body: Platform.select({ ios: 'System', android: 'sans-serif' }),
  arabic: Platform.select({ ios: 'Georgia', android: 'serif' }),
} as const;

export const fontSize = {
  xl: 28,
  lg: 22,
  md: 17,
  sm: 15,
  xs: 13,
} as const;

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const lineHeight = {
  tight: 1.2,
  normal: 1.45,
  relaxed: 1.6,
};
