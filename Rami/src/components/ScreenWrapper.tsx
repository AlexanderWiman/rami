/**
 * ScreenWrapper: Wraps screen content with the Royal theme background.
 * Renders ImageBackground with bg.png and a subtle dark overlay.
 */
import React from 'react';
import { View, ImageBackground, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useArabicFullRtl } from '../hooks/useArabicFullRtl';

type ScreenWrapperProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  disableBackground?: boolean;
};

export function ScreenWrapper({ children, style, edges = ['top'], disableBackground = false }: ScreenWrapperProps) {
  const arabicFullRtl = useArabicFullRtl();
  const body = arabicFullRtl ? <View style={styles.rtlRoot}>{children}</View> : children;

  if (disableBackground) {
    return (
      <SafeAreaView style={[styles.safeArea, style]} edges={edges}>
        {body}
      </SafeAreaView>
    );
  }
  return (
    <ImageBackground
      source={require('../../assets/bg.png')}
      resizeMode="cover"
      style={[styles.container, style]}
    >
      <View style={styles.overlay} />
      <SafeAreaView style={styles.safeArea} edges={edges}>
        {body}
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  rtlRoot: { flex: 1, direction: 'rtl' },
});
