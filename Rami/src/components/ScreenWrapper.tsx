/**
 * ScreenWrapper: Wraps screen content with the Royal theme background.
 * Renders ImageBackground with bg.png and a subtle dark overlay.
 */
import React from 'react';
import { View, ImageBackground, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ScreenWrapperProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  disableBackground?: boolean;
};

export function ScreenWrapper({ children, style, edges = ['top'], disableBackground = false }: ScreenWrapperProps) {
  if (disableBackground) {
    return (
      <SafeAreaView style={[styles.safeArea, style]} edges={edges}>
        {children}
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
        {children}
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  safeArea: { flex: 1, backgroundColor: 'transparent' },
});
