/**
 * Invisible bottom strip: tap to show Sacred Dock.
 */
import React from 'react';
import { View, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDockVisibility } from './DockVisibilityContext';

const STRIP_HEIGHT = 56;

export function TapToShowDock() {
  const insets = useSafeAreaInsets();
  const { showDock } = useDockVisibility();

  return (
    <View
      style={[styles.strip, { height: STRIP_HEIGHT + insets.bottom }]}
      pointerEvents="box-none"
    >
      <TouchableWithoutFeedback onPress={showDock}>
        <View style={StyleSheet.absoluteFill} />
      </TouchableWithoutFeedback>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
