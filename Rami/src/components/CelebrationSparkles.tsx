/**
 * Burst of golden sparkles radiating outward – used when completing 3 taps on adhkar.
 */
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';

const PARTICLE_COUNT = 14;
const RADIUS = 85;
const GOLD = '#E6C27A';

// Precompute particle directions (radiating outward)
const PARTICLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
  const angle = (i / PARTICLE_COUNT) * 2 * Math.PI;
  return {
    x: Math.cos(angle) * RADIUS,
    y: Math.sin(angle) * RADIUS,
  };
});

interface CelebrationSparklesProps {
  visible: boolean;
  onComplete?: () => void;
}

export function CelebrationSparkles({ visible, onComplete }: CelebrationSparklesProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      progress.value = 0;
      progress.value = withTiming(
        1,
        { duration: 600, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (finished && onComplete) {
            runOnJS(onComplete)();
          }
        }
      );
    }
  }, [visible, onComplete]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={styles.center}>
        {PARTICLES.map((p, i) => (
          <Particle key={i} x={p.x} y={p.y} progress={progress} />
        ))}
      </View>
    </View>
  );
}

function Particle({
  x,
  y,
  progress,
}: {
  x: number;
  y: number;
  progress: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    'worklet';
    const p = progress.value;
    return {
      transform: [
        { translateX: p * x },
        { translateY: p * y },
        { scale: 0.5 + p * 0.5 },
      ],
      opacity: 1 - p,
    };
  });

  return (
    <Animated.View style={[styles.particle, style]}>
      <View style={styles.dot} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -0.5,
    marginTop: -0.5,
    width: 1,
    height: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GOLD,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 6,
  },
});
