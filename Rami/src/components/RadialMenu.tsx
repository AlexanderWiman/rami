/**
 * UX 2.0: Radial menu on orb tap — Play Azan, Open Qibla, Mute Next Prayer.
 * Animated circle expansion; blur background; light haptic on each action.
 */
import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TouchableWithoutFeedback, Platform } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useTheme } from '../theme/ThemeContext';
import { useRouter } from 'expo-router';
import { hapticLight } from '../utils/haptics';
import { spacing, radius } from '../theme/spacing';
import { fontSize, fontWeight } from '../theme/typography';
import { getString } from '../constants/i18n';
import type { Language } from '../features/prayer/types';

type RadialAction = 'playAzan' | 'openQibla' | 'muteNextPrayer';

type RadialMenuProps = {
  visible: boolean;
  onClose: () => void;
  onPlayAzan: () => void;
  onMuteNextPrayer: () => void;
  muteLabel: string;
  language: Language;
};

const SPRING_CONFIG = { damping: 18, stiffness: 180 };

export function RadialMenu({
  visible,
  onClose,
  onPlayAzan,
  onMuteNextPrayer,
  muteLabel,
  language,
}: RadialMenuProps) {
  const { colors, scheme } = useTheme();
  const router = useRouter();
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, SPRING_CONFIG);
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      scale.value = withTiming(0, { duration: 150 });
      opacity.value = withTiming(0, { duration: 150 });
    }
  }, [visible, scale, opacity]);

  const openQibla = () => {
    hapticLight();
    onClose();
    router.push('/qibla');
  };

  const handlePlayAzan = () => {
    hapticLight();
    onClose();
    onPlayAzan();
  };

  const handleMute = () => {
    hapticLight();
    onClose();
    onMuteNextPrayer();
  };

  const overlayStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const menuStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (!visible) return null;

  const playLabel = getString(language, 'playAzan');
  const qiblaLabel = getString(language, 'openQibla');

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
      <Animated.View style={[StyleSheet.absoluteFill, overlayStyle]} pointerEvents="box-none">
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFill}>
            {Platform.OS === 'ios' ? (
              <BlurView intensity={40} tint={scheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
            )}
          </View>
        </TouchableWithoutFeedback>
      </Animated.View>
      <View style={styles.centre} pointerEvents="box-none">
        <Animated.View style={[styles.menu, menuStyle, { backgroundColor: colors.surfaceGlass, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.option} onPress={handlePlayAzan} activeOpacity={0.8}>
            <Text style={[styles.optionText, { color: colors.text }]}>{playLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.option} onPress={openQibla} activeOpacity={0.8}>
            <Text style={[styles.optionText, { color: colors.text }]}>{qiblaLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.option} onPress={handleMute} activeOpacity={0.8}>
            <Text style={[styles.optionText, { color: colors.textMuted }]}>{muteLabel}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centre: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menu: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minWidth: 200,
  },
  option: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  optionText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
});
