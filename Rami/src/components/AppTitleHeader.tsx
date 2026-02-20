/**
 * App title / logo header — premium sacred emblem.
 * Brand text, fade+slide on focus.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';
import { useReduceMotion } from '../utils/reduceMotion';
import { spacing } from '../theme/spacing';
import { HeaderBrand } from './HeaderBrand';

const ARABIC = 'برهانك';
const ENGLISH = 'Burhank';

export type AppTitleHeaderProps = {
  /** Location subtitle below medallion (e.g. "Gustafs, Dalarnas län, Sverige"). */
  location?: string | null;
  /** "No location" fallback when location is empty. */
  noLocationLabel: string;
  /** Called when user taps on location — show manual/automatic picker. */
  onLocationPress?: () => void;
};

export function AppTitleHeader({ location, noLocationLabel, onLocationPress }: AppTitleHeaderProps) {
  const reduceMotion = useReduceMotion();

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-6);

  useFocusEffect(
    React.useCallback(() => {
      if (reduceMotion) {
        opacity.value = 1;
        translateY.value = 0;
        return;
      }
      opacity.value = 0;
      translateY.value = -6;
      opacity.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.ease) });
      translateY.value = withTiming(0, { duration: 350, easing: Easing.out(Easing.ease) });
    }, [reduceMotion, opacity, translateY])
  );

  const medallionStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={styles.top} pointerEvents="box-none">
      <Animated.View style={[styles.brandWrap, medallionStyle]}>
        <HeaderBrand arabic={ARABIC} latin={ENGLISH} location={location || noLocationLabel} onLocationPress={onLocationPress} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    position: 'relative',
    marginBottom: spacing.md,
    alignItems: 'center',
    overflow: 'visible',
  },
  brandWrap: {
    alignItems: 'center',
    width: '100%',
  },
});
