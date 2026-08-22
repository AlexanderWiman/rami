/**
 * Theme context: light/dark from system (or future in-app toggle).
 * Wraps app in a View with theme background so Android/Expo Go never shows black.
 */
import React, { createContext, useCallback, useContext } from 'react';
import { View, useColorScheme, StyleSheet } from 'react-native';
import { getThemeColors, type ColorScheme, type ThemeColors, type ThemeStyle } from './index';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
});

type ThemeContextValue = {
  scheme: ColorScheme;
  style: ThemeStyle;
  colors: ThemeColors;
  pageBackground: string;
  setStyle: (style: ThemeStyle) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const scheme: ColorScheme = system === 'dark' ? 'dark' : 'light';
  // Always use royal theme
  const style: ThemeStyle = 'royal';

  const setStyle = useCallback((_next: ThemeStyle) => {
    // No-op: always royal
  }, []);

  const colors = getThemeColors(scheme, style);
  const pageBackground = 'transparent';
  return (
    <ThemeContext.Provider value={{ scheme, style, colors, pageBackground, setStyle }}>
      <View style={styles.root}>
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (ctx) return ctx;

  // Fallback: avoid hard crash if a route renders outside provider
  // (for example when Expo Router layout initialization fails in dev).
  const system = useColorScheme();
  const scheme: ColorScheme = system === 'dark' ? 'dark' : 'light';
  const style: ThemeStyle = 'royal';
  const colors = getThemeColors(scheme, style);
  return {
    scheme,
    style,
    colors,
    pageBackground: 'transparent',
    setStyle: () => {},
  };
}
