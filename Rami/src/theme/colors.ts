/**
 * Sacred design color system.
 * Light & Dark equally considered.
 */
export const palette = {
  primary: '#0E2A1F',       // Deep Mosque Green
  accent: '#C8B27D',        // Soft Gold
  bgLight: '#F6F5F2',       // Warm Off-White
  bgDark: '#0D0F0E',        // Charcoal Black
  highlight: '#1F6F54',     // Muted Emerald Glow
  // Derived
  accentMuted: 'rgba(200, 178, 125, 0.4)',
  highlightMuted: 'rgba(31, 111, 84, 0.35)',
  primaryLight: 'rgba(14, 42, 31, 0.08)',
} as const;

const royalPalette = {
  primary: '#0B2419',       // Deep olive green
  accent: '#F2D27E',        // Warm gold
  bgLight: '#FBF4E3',       // Ivory gold
  bgDark: '#0A1612',        // Night green
  highlight: '#D7A54B',     // Lantern gold
  // Derived
  accentMuted: 'rgba(242, 210, 126, 0.35)',
  highlightMuted: 'rgba(215, 165, 75, 0.35)',
  primaryLight: 'rgba(11, 36, 25, 0.1)',
} as const;

export const lightColors = {
  background: palette.bgLight,
  surface: '#FFFFFF',
  surfaceGlass: 'rgba(255, 255, 255, 0.72)',
  text: palette.primary,
  textSecondary: 'rgba(14, 42, 31, 0.82)',
  textMuted: 'rgba(14, 42, 31, 0.68)',
  // In classic mode, surface text is same as regular text
  textOnSurface: palette.primary,
  textOnSurfaceSecondary: 'rgba(14, 42, 31, 0.82)',
  textOnSurfaceMuted: 'rgba(14, 42, 31, 0.68)',
  accent: palette.accent,
  accentMuted: palette.accentMuted,
  primary: palette.primary,
  highlight: palette.highlight,
  highlightGlow: palette.highlightMuted,
  border: 'rgba(14, 42, 31, 0.15)',
  error: '#B91C1C',
} as const;

export const darkColors = {
  background: palette.bgDark,
  surface: '#151817',
  surfaceGlass: 'rgba(13, 15, 14, 0.82)',
  text: '#F6F5F2',
  textSecondary: 'rgba(246, 245, 242, 0.75)',
  textMuted: 'rgba(246, 245, 242, 0.5)',
  textOnSurface: '#F6F5F2',
  textOnSurfaceSecondary: 'rgba(246, 245, 242, 0.75)',
  textOnSurfaceMuted: 'rgba(246, 245, 242, 0.5)',
  accent: palette.accent,
  accentMuted: 'rgba(200, 178, 125, 0.35)',
  primary: palette.primary,
  highlight: palette.highlight,
  highlightGlow: 'rgba(31, 111, 84, 0.4)',
  border: 'rgba(246, 245, 242, 0.1)',
  error: '#EF4444',
} as const;

export const royalLightColors = {
  background: royalPalette.bgLight,
  surface: '#FFF9ED',
  // High opacity warm white for readable cards
  surfaceGlass: 'rgba(246, 245, 242, 0.92)',
  // Text on background (greeting, headers on bg image) - pure white with shadow
  text: 'rgba(255, 255, 255, 0.95)',
  textSecondary: 'rgba(255, 255, 255, 0.85)',
  textMuted: 'rgba(255, 255, 255, 0.70)',
  // Text on cards/surfaces - deep mosque green for contrast
  textOnSurface: 'rgba(14, 42, 31, 0.95)',
  textOnSurfaceSecondary: 'rgba(14, 42, 31, 0.78)',
  textOnSurfaceMuted: 'rgba(14, 42, 31, 0.55)',
  accent: royalPalette.accent,
  accentMuted: royalPalette.accentMuted,
  primary: royalPalette.primary,
  highlight: royalPalette.highlight,
  highlightGlow: royalPalette.highlightMuted,
  // Card border - subtle white
  border: 'rgba(255, 255, 255, 0.35)',
  error: '#EF4444',
} as const;

export const royalDarkColors = {
  background: royalPalette.bgDark,
  surface: '#0F1C17',
  surfaceGlass: 'rgba(10, 22, 18, 0.82)',
  text: '#F9F1DD',
  textSecondary: 'rgba(249, 241, 221, 0.76)',
  textMuted: 'rgba(249, 241, 221, 0.54)',
  textOnSurface: '#F9F1DD',
  textOnSurfaceSecondary: 'rgba(249, 241, 221, 0.76)',
  textOnSurfaceMuted: 'rgba(249, 241, 221, 0.54)',
  accent: royalPalette.accent,
  accentMuted: 'rgba(242, 210, 126, 0.28)',
  primary: royalPalette.primary,
  highlight: royalPalette.highlight,
  highlightGlow: 'rgba(215, 165, 75, 0.35)',
  border: 'rgba(249, 241, 221, 0.12)',
  error: '#EF4444',
} as const;

export const themeColorsByStyle = {
  classic: { light: lightColors, dark: darkColors },
  royal: { light: royalLightColors, dark: royalDarkColors },
} as const;

export type ColorScheme = 'light' | 'dark';
export type ThemeStyle = keyof typeof themeColorsByStyle;
export type ThemeColors = typeof lightColors;
