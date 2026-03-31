/**
 * Qibla Compass — elegant full-screen compass with smooth animations.
 * Uses Reanimated shared values for 60fps rotation on UI thread.
 * When aligned within ±5°: glow effect, haptic feedback.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  useDerivedValue,
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Path, Defs, LinearGradient, Stop, G, Circle } from 'react-native-svg';
import * as Location from 'expo-location';
import { useTheme } from '../../../theme/ThemeContext';
import { ScreenWrapper } from '../../../components/ScreenWrapper';
import { BackToHomeBar } from '../../../components/BackToHomeBar';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getString, formatNumber } from '../../../constants/i18n';
import { hapticMedium } from '../../../utils/haptics';
import { getBearing } from '../utils/bearing';
import { KAABA_LAT, KAABA_LON } from '../constants';
import { spacing, radius } from '../../../theme/spacing';
import { fontSize, fontWeight, fontFamily } from '../../../theme/typography';

const { width } = Dimensions.get('window');
const COMPASS_SIZE = Math.min(width * 0.85, 340);
const COMPASS_RADIUS = COMPASS_SIZE / 2;
const RING_STROKE = 2;
const ALIGN_THRESHOLD_DEG = 5;

// Normalize angle to 0-360
function normalizeAngle(angle: number): number {
  'worklet';
  return ((angle % 360) + 360) % 360;
}

// Calculate shortest rotation delta between two angles
function shortestDelta(from: number, to: number): number {
  'worklet';
  const delta = normalizeAngle(to) - normalizeAngle(from);
  if (delta > 180) return delta - 360;
  if (delta < -180) return delta + 360;
  return delta;
}

export function QiblaScreen() {
  const { colors, scheme, pageBackground, style: themeStyle } = useTheme();
  const isRoyal = themeStyle === 'royal';
  const { language } = useLanguage();

  const [bearing, setBearing] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasHeading, setHasHeading] = useState(false);
  const [aligned, setAligned] = useState(false);
  

  // Reanimated shared values for smooth rotation
  const headingValue = useSharedValue(0);
  const bearingValue = useSharedValue(0);
  const prevHeading = useSharedValue(0);
  const alignedAnim = useSharedValue(0);
  const wasAlignedRef = useRef(false);
  const centerPulse = useSharedValue(1);

  // Gentle breathing pulse on center dot
  useEffect(() => {
    centerPulse.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 1500 }),
        withTiming(1, { duration: 1500 })
      ),
      -1,
      true
    );
  }, [centerPulse]);

  // Get location and bearing
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError(getString(language, 'locationPermissionNeeded'));
          setLoading(false);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({});
        const b = getBearing(
          pos.coords.latitude,
          pos.coords.longitude,
          KAABA_LAT,
          KAABA_LON
        );
        setBearing(b);
        bearingValue.value = b;
      } catch (e) {
        setError(e instanceof Error ? e.message : getString(language, 'couldNotGetDirection'));
      }
      setLoading(false);
    })();
  }, [language, bearingValue]);

  // Callbacks for JS thread
  const triggerHaptic = useCallback(() => {
    hapticMedium();
  }, []);

  const setAlignedTrue = useCallback(() => setAligned(true), []);
  const setAlignedFalse = useCallback(() => setAligned(false), []);

  // Watch heading with Reanimated for smooth updates
  const headingSubRef = useRef<{ remove: () => void } | null>(null);
  const lastUpdateTime = useRef(0);
  const smoothedHeading = useRef<number | null>(null);
  
  useEffect(() => {
    if (bearing == null) return;
    let cancelled = false;

    Location.watchHeadingAsync((h) => {
      if (cancelled) return;
      
      // Throttle updates to ~10Hz for smooth, stable compass (100ms)
      const now = Date.now();
      if (now - lastUpdateTime.current < 100) return;
      lastUpdateTime.current = now;
      
      const trueH = h.trueHeading;
      const mag = h.magHeading;
      
      
      // Use magHeading - it matches other compass apps better than trueHeading
      // (iOS trueHeading calculation seems to have an offset error)
      const raw = typeof mag === 'number' && mag >= 0 && mag <= 360 && !Number.isNaN(mag)
            ? mag
            : typeof trueH === 'number' && trueH >= 0 && trueH <= 360 && !Number.isNaN(trueH)
              ? trueH
              : null;

      if (raw == null) return;
      
      // Low-pass filter to reduce sensor noise
      if (smoothedHeading.current === null) {
        smoothedHeading.current = raw;
      } else {
        const delta = shortestDelta(smoothedHeading.current, raw);
        
          // If delta is very large (>45°), sensor might have recalibrated - snap to new value
          if (Math.abs(delta) > 45) {
            smoothedHeading.current = raw;
          } else {
            // Smooth filtering (0.25) - strong noise reduction for stable compass
            smoothedHeading.current = normalizeAngle(smoothedHeading.current + delta * 0.25);
          }
      }
      
      const filtered = smoothedHeading.current;
      
      // Calculate rotation using shortest path from current animated position
      const delta = shortestDelta(prevHeading.value, filtered);
      const target = prevHeading.value + delta;
      
      
      // Use timing for smooth animation (200ms)
      headingValue.value = withTiming(target, {
        duration: 200,
      });
      prevHeading.value = target;
      
      if (!hasHeading) setHasHeading(true);
    })
      .then((s) => {
        if (cancelled) {
          s.remove();
          return;
        }
        headingSubRef.current = s;
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      headingSubRef.current?.remove();
      headingSubRef.current = null;
    };
  }, [bearing, headingValue, prevHeading, hasHeading]);

  // Check alignment: when needle points straight up (0° or close to it)
  // Needle rotation = bearing - heading; aligned when this is near 0°
  const isAligned = useDerivedValue(() => {
    const rot = normalizeAngle(bearingValue.value - headingValue.value);
    // Distance from 0° (pointing up)
    const diff = rot > 180 ? 360 - rot : rot;
    return diff <= ALIGN_THRESHOLD_DEG;
  });

  // Update aligned animation
  useDerivedValue(() => {
    const isNowAligned = isAligned.value;
    if (isNowAligned && !wasAlignedRef.current) {
      alignedAnim.value = withTiming(1, { duration: 300 });
      runOnJS(triggerHaptic)();
      runOnJS(setAlignedTrue)();
      wasAlignedRef.current = true;
    } else if (!isNowAligned && wasAlignedRef.current) {
      alignedAnim.value = withTiming(0, { duration: 200 });
      runOnJS(setAlignedFalse)();
      wasAlignedRef.current = false;
    }
    return isNowAligned;
  });

  // Animated style for compass ring - rotates opposite to heading so N stays at true north
  const compassStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-headingValue.value}deg` }],
  }));

  // Animated style for needle - points toward Qibla relative to screen
  // bearing - heading gives the direction to Qibla from phone's current facing
  const needleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${bearingValue.value - headingValue.value}deg` }],
  }));

  // Glow intensity based on alignment
  const glowStyle = useAnimatedStyle(() => ({
    opacity: alignedAnim.value * 0.75,
  }));

  // Layered halo rings for "burning circle" when aligned
  const haloStyle1 = useAnimatedStyle(() => ({ opacity: alignedAnim.value * 0.15 }));
  const haloStyle2 = useAnimatedStyle(() => ({ opacity: alignedAnim.value * 0.3 }));
  const haloStyle3 = useAnimatedStyle(() => ({ opacity: alignedAnim.value * 0.5 }));

  // Status text style
  const statusStyle = useAnimatedStyle(() => {
    const alignedVal = alignedAnim.value;
    return {
      opacity: withTiming(alignedVal > 0.5 ? 1 : 0.7, { duration: 200 }),
      transform: [{ scale: withSpring(alignedVal > 0.5 ? 1.05 : 1) }],
    };
  });

  const centerDotPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: centerPulse.value }],
  }));

  const accentColor = colors.accent;
  const highlightColor = colors.highlight;
  const mutedColor = colors.textMuted;
  const ringColor = scheme === 'dark' ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.32)';
  const tickColor = scheme === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)';

  if (loading) {
    return (
      <ScreenWrapper>
        <View style={styles.header}>
          <BackToHomeBar />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={isRoyal ? '#E6C27A' : highlightColor} />
          <Text style={[styles.hint, { color: isRoyal ? 'rgba(255,255,255,0.7)' : mutedColor }]}>
            {getString(language, 'findingDirection')}
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (error) {
    return (
      <ScreenWrapper>
        <View style={styles.header}>
          <BackToHomeBar />
        </View>
        <View style={styles.centered}>
          <Text style={[styles.hint, { color: isRoyal ? 'rgba(255,255,255,0.7)' : mutedColor }]}>{error}</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <BackToHomeBar />
      </View>

      <View style={styles.compassContainer} pointerEvents="box-none">
        {/* Fixed Kaaba + Mecka label at top (target direction) */}
        <View style={styles.kaabaFixedTarget} pointerEvents="none">
          <View style={styles.kaabaImageWrapper}>
            <Image
              source={require('../../../../assets/kaaba_icon.png')}
              style={styles.kaabaFixedImage}
              resizeMode="contain"
            />
          </View>
          <View style={[styles.kaabaLabel, { backgroundColor: isRoyal ? 'rgba(10, 25, 18, 0.85)' : colors.surface, borderColor: isRoyal ? 'rgba(230, 194, 122, 0.35)' : ringColor }]}>
            <Text style={[styles.kaabaLabelText, { color: isRoyal ? accentColor : colors.text }]}>{getString(language, 'mecca')}</Text>
          </View>
        </View>

        {/* Alignment glow — layered halo for "burning circle" when aligned (SVG for smooth edges) */}
        <View style={styles.glowStack} pointerEvents="none">
          <Animated.View style={[styles.glowHaloWrap, haloStyle1]}>
            <Svg width={COMPASS_SIZE + 60} height={COMPASS_SIZE + 60} viewBox={`0 0 ${COMPASS_SIZE + 60} ${COMPASS_SIZE + 60}`}>
              <Circle cx={(COMPASS_SIZE + 60) / 2} cy={(COMPASS_SIZE + 60) / 2} r={(COMPASS_SIZE + 60) / 2 - 8} stroke={accentColor} strokeWidth={16} fill="none" strokeLinecap="round" />
            </Svg>
          </Animated.View>
          <Animated.View style={[styles.glowHaloWrap, haloStyle2]}>
            <Svg width={COMPASS_SIZE + 60} height={COMPASS_SIZE + 60} viewBox={`0 0 ${COMPASS_SIZE + 60} ${COMPASS_SIZE + 60}`}>
              <Circle cx={(COMPASS_SIZE + 60) / 2} cy={(COMPASS_SIZE + 60) / 2} r={(COMPASS_SIZE + 40) / 2 - 9} stroke={accentColor} strokeWidth={18} fill="none" strokeLinecap="round" />
            </Svg>
          </Animated.View>
          <Animated.View style={[styles.glowHaloWrap, haloStyle3]}>
            <Svg width={COMPASS_SIZE + 60} height={COMPASS_SIZE + 60} viewBox={`0 0 ${COMPASS_SIZE + 60} ${COMPASS_SIZE + 60}`}>
              <Circle cx={(COMPASS_SIZE + 60) / 2} cy={(COMPASS_SIZE + 60) / 2} r={(COMPASS_SIZE + 20) / 2 - 7} stroke={accentColor} strokeWidth={14} fill="none" strokeLinecap="round" />
            </Svg>
          </Animated.View>
          <Animated.View style={[styles.glowHaloWrap, glowStyle]}>
            <Svg width={COMPASS_SIZE + 60} height={COMPASS_SIZE + 60} viewBox={`0 0 ${COMPASS_SIZE + 60} ${COMPASS_SIZE + 60}`}>
              <Circle cx={(COMPASS_SIZE + 60) / 2} cy={(COMPASS_SIZE + 60) / 2} r={(COMPASS_SIZE + 40) / 2 - 10} stroke={accentColor} strokeWidth={20} fill="none" strokeLinecap="round" />
            </Svg>
          </Animated.View>
        </View>

        {/* Compass ring rotates with device heading - ring and N/E/S/W in same layer */}
        <Animated.View style={[styles.compassRing, compassStyle]}>
          {/* Outer and inner rings as SVG for smoother edges */}
          <Svg width={COMPASS_SIZE} height={COMPASS_SIZE} viewBox={`0 0 ${COMPASS_SIZE} ${COMPASS_SIZE}`} style={StyleSheet.absoluteFill}>
            <Circle
              cx={COMPASS_RADIUS}
              cy={COMPASS_RADIUS}
              r={COMPASS_RADIUS - RING_STROKE / 2}
              stroke={aligned ? accentColor : ringColor}
              strokeWidth={RING_STROKE}
              fill="none"
              strokeLinecap="round"
            />
            <Circle
              cx={COMPASS_RADIUS}
              cy={COMPASS_RADIUS}
              r={COMPASS_SIZE * 0.28}
              stroke={aligned ? accentColor : ringColor}
              strokeWidth={1}
              fill="none"
              strokeLinecap="round"
              opacity={0.6}
            />
          </Svg>
          <Svg width={COMPASS_SIZE} height={COMPASS_SIZE} viewBox={`0 0 ${COMPASS_SIZE} ${COMPASS_SIZE}`} style={styles.compassTicksSvg}>
            {/* Degree ticks only */}
            <G>
              {Array.from({ length: 72 }).map((_, i) => {
                const angle = i * 5;
                const isMajor = angle % 30 === 0;
                const isCardinal = angle % 90 === 0;
                const tickLength = isCardinal ? 16 : isMajor ? 10 : 5;
                const tickWidth = isCardinal ? 2 : 1;
                const rad = (angle * Math.PI) / 180;
                const outerR = COMPASS_RADIUS - 4;
                const innerR = outerR - tickLength;
                const x1 = COMPASS_RADIUS + outerR * Math.sin(rad);
                const y1 = COMPASS_RADIUS - outerR * Math.cos(rad);
                const x2 = COMPASS_RADIUS + innerR * Math.sin(rad);
                const y2 = COMPASS_RADIUS - innerR * Math.cos(rad);
                return (
                  <Path
                    key={i}
                    d={`M${x1},${y1} L${x2},${y2}`}
                    stroke={isCardinal ? highlightColor : tickColor}
                    strokeWidth={tickWidth}
                    strokeLinecap="round"
                  />
                );
              })}
            </G>
          </Svg>

          {/* Cardinal directions */}
          <View style={styles.cardinalN}>
            <Text style={[styles.cardinalText, { color: highlightColor }]}>N</Text>
          </View>
          <View style={styles.cardinalE}>
            <Text style={[styles.cardinalText, { color: mutedColor }]}>E</Text>
          </View>
          <View style={styles.cardinalS}>
            <Text style={[styles.cardinalText, { color: mutedColor }]}>S</Text>
          </View>
          <View style={styles.cardinalW}>
            <Text style={[styles.cardinalText, { color: mutedColor }]}>W</Text>
          </View>
        </Animated.View>

        {/* Qibla needle (points toward Mecca) */}
        <Animated.View style={[styles.needleContainer, needleStyle]}>
          <Svg width={COMPASS_SIZE} height={COMPASS_SIZE} viewBox={`0 0 ${COMPASS_SIZE} ${COMPASS_SIZE}`}>
            <Defs>
              <LinearGradient id="needleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor={accentColor} stopOpacity="1" />
                <Stop offset="100%" stopColor={accentColor} stopOpacity="0.3" />
              </LinearGradient>
            </Defs>
            {/* Needle pointing toward Qibla (no Kaaba on tip) */}
            <Path
              d={`M${COMPASS_RADIUS - 8},${COMPASS_RADIUS} 
                  L${COMPASS_RADIUS},${COMPASS_RADIUS - COMPASS_RADIUS + 36} 
                  L${COMPASS_RADIUS + 8},${COMPASS_RADIUS} Z`}
              fill="url(#needleGrad)"
            />
          </Svg>
        </Animated.View>

        {/* Center point with gentle pulse */}
        <Animated.View style={[styles.centerDot, { backgroundColor: colors.surface, borderColor: ringColor }, centerDotPulseStyle]}>
          <View style={[styles.centerDotInner, { backgroundColor: highlightColor }]} />
        </Animated.View>
      </View>

      {/* Status footer */}
      <View style={styles.footer}>
        <Animated.View style={statusStyle}>
          <Text style={[styles.statusText, { color: aligned ? accentColor : colors.text }]}>
            {!hasHeading
              ? getString(language, 'holdPhoneFlat')
              : aligned
                ? getString(language, 'facingQibla')
                : getString(language, 'turnTowardQibla')}
          </Text>
        </Animated.View>
        <Text style={[styles.degreesText, { color: mutedColor }]}>
          {bearing != null ? `${formatNumber(language, Math.round(bearing))}° ${getString(language, 'fromNorth')}` : '—'}
        </Text>
        <Text style={[styles.glowHintText, { color: mutedColor }]}>
          {getString(language, 'qiblaGlowHint')}
        </Text>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hint: {
    fontSize: fontSize.md,
    marginTop: spacing.md,
  },
  compassContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kaabaFixedTarget: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  kaabaImageWrapper: {
    width: 68,
    height: 68,
    marginBottom: 2,
    borderRadius: 20,
    overflow: 'hidden',
  },
  kaabaFixedImage: {
    width: 68,
    height: 68,
    opacity: 0.78,
  },
  kaabaLabel: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  kaabaLabelText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  glowStack: {
    position: 'absolute',
    width: COMPASS_SIZE + 60,
    height: COMPASS_SIZE + 60,
    top: '50%',
    left: '50%',
    marginTop: -(COMPASS_SIZE + 60) / 2,
    marginLeft: -(COMPASS_SIZE + 60) / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowHaloWrap: {
    position: 'absolute',
    width: COMPASS_SIZE + 60,
    height: COMPASS_SIZE + 60,
  },
  compassRing: {
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compassTicksSvg: {
    position: 'absolute',
  },
  needleContainer: {
    position: 'absolute',
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
  },
  centerDot: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardinalN: {
    position: 'absolute',
    top: 22,
    alignSelf: 'center',
  },
  cardinalE: {
    position: 'absolute',
    right: 20,
    top: COMPASS_SIZE / 2 - 10,
  },
  cardinalS: {
    position: 'absolute',
    bottom: 22,
    alignSelf: 'center',
  },
  cardinalW: {
    position: 'absolute',
    left: 20,
    top: COMPASS_SIZE / 2 - 10,
  },
  cardinalText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: fontFamily.heading,
  },
  footer: {
    paddingBottom: spacing.xl + 80,
    alignItems: 'center',
  },
  statusText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    fontFamily: fontFamily.heading,
    marginBottom: spacing.xs,
  },
  degreesText: {
    fontSize: fontSize.sm,
  },
  glowHintText: {
    fontSize: fontSize.xs,
    marginTop: spacing.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    opacity: 0.7,
  },
});
