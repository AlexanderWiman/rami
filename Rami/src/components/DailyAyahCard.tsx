/**
 * UX 2.0: Spiritual hook — one ayah per day between orb and prayer list.
 * Premium dark glass card with gold accents. Tap opens Quran reader.
 */
import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { SURAH_LIST } from '../features/quran/data/surahs';
import { spacing } from '../theme/spacing';
import { fontSize, fontFamily } from '../theme/typography';

const GOLD = '#E6C27A';
const GOLD_MUTED = 'rgba(230, 194, 122, 0.55)';

function getDailySurahAyah(date: Date): { surah: number; ayah: number } {
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86400000);
  const surahIndex = dayOfYear % SURAH_LIST.length;
  const meta = SURAH_LIST[surahIndex];
  const ayah = (dayOfYear % Math.max(1, meta.ayahCount)) + 1;
  return { surah: meta.number, ayah };
}

// 8-point star ornament
function StarOrnament() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" style={styles.ornament}>
      <Path
        d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2zm0 8l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z"
        fill={GOLD_MUTED}
        opacity={0.14}
      />
    </Svg>
  );
}

export function DailyAyahCard() {
  const { style: themeStyle, colors } = useTheme();
  const { language } = useLanguage();
  const router = useRouter();
  const { surah, ayah } = getDailySurahAyah(new Date());
  const meta = SURAH_LIST.find((s) => s.number === surah);

  const isRoyal = themeStyle === 'royal';

  const source =
    language === 'ar'
      ? `القرآن ${meta?.nameAr ?? surah}:${ayah}`
      : language === 'tr'
        ? `Kur'an ${meta?.nameEn ?? surah}:${ayah}`
        : `Quran ${meta?.nameEn ?? surah}:${ayah}`;

  // Animation values
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.20);

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.985, { damping: 15, stiffness: 400 });
    glowOpacity.value = withSequence(
      withTiming(0.30, { duration: 100 }),
      withTiming(0.20, { duration: 200 })
    );
  }, [scale, glowOpacity]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  }, [scale]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/quran/${surah}?ayah=${ayah}` as any);
  }, [router, surah, ayah]);

  // Classic theme - use original light glass style
  if (!isRoyal) {
    return (
      <Animated.View entering={FadeIn.duration(400)} style={styles.wrap}>
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handlePress}
        >
          <Animated.View style={[styles.classicCard, { backgroundColor: colors.surfaceGlass, borderColor: colors.border }, animatedCardStyle]}>
            <Text style={[styles.classicQuote, { color: colors.textOnSurfaceSecondary }]} numberOfLines={2}>
              {language === 'ar'
                ? '• إِنَّ مَعَ الْعُسْرِ يُسْرًا'
                : language === 'tr'
                  ? 'Gerçekten zorlukla birlikte kolaylık vardır.'
                  : 'So truly with hardship comes ease.'}
            </Text>
            <Text style={[styles.classicSource, { color: colors.textOnSurfaceMuted }]}>{source}</Text>
          </Animated.View>
        </Pressable>
      </Animated.View>
    );
  }

  // Royal theme - premium dark glass with gold accents
  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.wrap}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
      >
        {/* Gold glow layer */}
        <Animated.View style={[styles.glowLayer, animatedGlowStyle]} />
        
        <Animated.View style={[styles.royalCard, animatedCardStyle]}>
          {/* Ornament */}
          <StarOrnament />
          
          <Text style={styles.royalQuote} numberOfLines={3}>
            {language === 'ar'
              ? '• إِنَّ مَعَ الْعُسْرِ يُسْرًا'
              : language === 'tr'
                ? 'Gerçekten zorlukla birlikte kolaylık vardır.'
                : 'So truly with hardship comes ease.'}
          </Text>
          
          {/* Reference pill */}
          <View style={styles.refPill}>
            <Text style={styles.refText}>{source}</Text>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: Platform.OS === 'android' ? spacing.sm : spacing.md },
  
  // Classic theme styles
  classicCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
  },
  classicQuote: {
    fontSize: fontSize.md,
    fontStyle: 'italic',
    fontFamily: fontFamily.body,
    lineHeight: 24,
    marginBottom: spacing.xs,
  },
  classicSource: {
    fontSize: fontSize.xs,
  },

  // Royal theme styles
  glowLayer: {
    position: 'absolute',
    top: -12,
    left: -12,
    right: -12,
    bottom: -12,
    backgroundColor: 'rgba(230, 194, 122, 0.20)',
    borderRadius: 32,
    ...Platform.select({
      ios: {
        shadowColor: GOLD,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  royalCard: {
    backgroundColor: 'rgba(10, 25, 18, 0.72)',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(230, 194, 122, 0.28)',
    paddingVertical: 18,
    paddingHorizontal: 18,
    position: 'relative',
    overflow: 'hidden',
  },
  ornament: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  royalQuote: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 18,
    lineHeight: 26,
    fontStyle: 'italic',
    fontFamily: fontFamily.body,
    marginBottom: spacing.sm,
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
      },
      android: {},
    }),
  },
  refPill: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(230, 194, 122, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(230, 194, 122, 0.22)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  refText: {
    color: GOLD,
    fontSize: 13,
    letterSpacing: 0.6,
  },
});
