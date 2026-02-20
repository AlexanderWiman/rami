/**
 * Adhkar — morning and evening Islamic remembrances.
 * Single-view approach: visar ett kort i taget, swipe eller 3 tryck för nästa.
 * Ingen FlatList/scroll = inga RTL-buggar.
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, runOnJS } from 'react-native-reanimated';
import { useTheme } from '../src/theme/ThemeContext';
import { useLanguage } from '../src/contexts/LanguageContext';
import { ScreenWrapper } from '../src/components/ScreenWrapper';
import { BackToHomeBar } from '../src/components/BackToHomeBar';
import { GlassCard } from '../src/components/GlassCard';
import { getString } from '../src/constants/i18n';
import { ADHKAR_SECTIONS } from '../src/features/adkhar/data/adhkar';
import type { AdhkarSection, AdhkarItem } from '../src/features/adkhar/data/adhkar';
import { spacing, radius } from '../src/theme/spacing';
import { fontSize, fontWeight, fontFamily, lineHeight } from '../src/theme/typography';
import { hapticLight, hapticSuccess } from '../src/utils/haptics';
import { CelebrationSparkles } from '../src/components/CelebrationSparkles';

const COUNTER_SIZE = 72;
const SPARKLE_RADIUS = 85;
const GOLD = '#E6C27A';
const SWIPE_THRESHOLD = 60;

export default function AdkharScreen() {
  const { colors, style: themeStyle } = useTheme();
  const isRoyal = themeStyle === 'royal';
  const { language } = useLanguage();
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const listWidth = screenWidth - spacing.sm * 2;

  const title = getString(language, 'adkharTitle');
  const subtitle = getString(language, 'adkharSubtitle');
  const morningLabel = getString(language, 'adkharMorning');
  const eveningLabel = getString(language, 'adkharEvening');
  const bedtimeLabel = getString(language, 'adkharBedtime');
  const postPrayerLabel = getString(language, 'adkharPostPrayer');
  const doneLabel = getString(language, 'adkharDone');
  const swipeHint = getString(language, 'adkharSwipeHint');

  const [selectedCategory, setSelectedCategory] = useState<AdhkarSection['category']>('morning');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [tapCount, setTapCount] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);

  const activeSection = ADHKAR_SECTIONS.find((s) => s.category === selectedCategory);
  const items = activeSection?.items ?? [];
  const targetCount = 3;

  const translateX = useSharedValue(0);

  useEffect(() => {
    setTapCount(0);
  }, [currentIndex, selectedCategory]);

  const cardText = isRoyal ? 'rgba(255,255,255,0.95)' : colors.text;
  const cardTextSecondary = isRoyal ? 'rgba(255,255,255,0.75)' : colors.textSecondary;
  const cardTextMuted = isRoyal ? 'rgba(255,255,255,0.55)' : colors.textMuted;
  const chipBg = isRoyal ? 'rgba(10, 25, 18, 0.5)' : undefined;
  const chipBorder = isRoyal ? 'rgba(255,255,255,0.15)' : colors.border;
  const chipActiveBg = isRoyal ? 'rgba(230, 194, 122, 0.22)' : colors.highlightGlow;
  const chipActiveBorder = isRoyal ? 'rgba(230, 194, 122, 0.5)' : colors.highlight;
  const chipActiveText = isRoyal ? GOLD : colors.highlight;

  const onCategoryChange = useCallback((cat: AdhkarSection['category']) => {
    setSelectedCategory(cat);
    setCurrentIndex(0);
  }, []);

  const goToNext = useCallback(() => {
    const next = Math.min(currentIndex + 1, items.length - 1);
    if (next !== currentIndex) {
      setCurrentIndex(next);
    }
  }, [currentIndex, items.length]);

  const goToPrev = useCallback(() => {
    const prev = Math.max(currentIndex - 1, 0);
    if (prev !== currentIndex) {
      setCurrentIndex(prev);
    }
  }, [currentIndex]);

  const onCounterTap = useCallback(() => {
    if (tapCount >= targetCount) {
      setTapCount(0);
      hapticLight();
    } else {
      const nextCount = tapCount + 1;
      setTapCount(nextCount);
      if (nextCount === targetCount) {
        hapticSuccess();
        setTapCount(0);
        setShowCelebration(true);
        goToNext();
      } else {
        hapticLight();
      }
    }
  }, [tapCount, targetCount, goToNext]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-25, 25])
    .onEnd((e) => {
      if (e.translationX < -SWIPE_THRESHOLD) {
        runOnJS(goToNext)();
        runOnJS(hapticLight)();
      } else if (e.translationX > SWIPE_THRESHOLD) {
        runOnJS(goToPrev)();
        runOnJS(hapticLight)();
      }
      translateX.value = withTiming(0, { duration: 200 });
    })
    .onUpdate((e) => {
      translateX.value = e.translationX;
    });

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const showReader = items.length > 0;
  const progress = tapCount / targetCount;
  const isComplete = tapCount >= targetCount;
  const counterBgOpacity = 0.35 + progress * 0.65;
  const counterBg = `rgba(230, 194, 122, ${counterBgOpacity})`;

  const currentItem = items[currentIndex];

  const renderCard = (item: AdhkarItem) => (
    <GlassCard padding="xl" rounded="lg" style={styles.card}>
      <ScrollView
        style={styles.cardInnerScroll}
        contentContainerStyle={styles.cardInnerScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.arabic, { color: cardText }]}>{item.arabic}</Text>
        <Text style={[styles.transliteration, { color: cardTextSecondary }]}>{item.transliteration}</Text>
        <Text style={[styles.meaning, { color: cardTextMuted }]}>{item.meaning}</Text>
        {item.count != null && (
          <Text style={[styles.countHint, { color: cardTextMuted }]}>{item.count}x</Text>
        )}
      </ScrollView>
    </GlassCard>
  );

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <View style={styles.header}>
          <BackToHomeBar />
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
        </View>

        <View style={styles.categoryRow}>
          <TouchableOpacity
            onPress={() => onCategoryChange('morning')}
            style={[
              styles.categoryChip,
              { backgroundColor: chipBg, borderColor: chipBorder },
              selectedCategory === 'morning' && { backgroundColor: chipActiveBg, borderColor: chipActiveBorder },
            ]}
          >
            <Text
              style={[
                styles.categoryText,
                { color: selectedCategory === 'morning' ? chipActiveText : cardText },
                selectedCategory === 'morning' && { fontWeight: fontWeight.semibold },
              ]}
            >
              {morningLabel}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onCategoryChange('evening')}
            style={[
              styles.categoryChip,
              { backgroundColor: chipBg, borderColor: chipBorder },
              selectedCategory === 'evening' && { backgroundColor: chipActiveBg, borderColor: chipActiveBorder },
            ]}
          >
            <Text
              style={[
                styles.categoryText,
                { color: selectedCategory === 'evening' ? chipActiveText : cardText },
                selectedCategory === 'evening' && { fontWeight: fontWeight.semibold },
              ]}
            >
              {eveningLabel}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onCategoryChange('bedtime')}
            style={[
              styles.categoryChip,
              { backgroundColor: chipBg, borderColor: chipBorder },
              selectedCategory === 'bedtime' && { backgroundColor: chipActiveBg, borderColor: chipActiveBorder },
            ]}
          >
            <Text
              style={[
                styles.categoryText,
                { color: selectedCategory === 'bedtime' ? chipActiveText : cardText },
                selectedCategory === 'bedtime' && { fontWeight: fontWeight.semibold },
              ]}
            >
              {bedtimeLabel}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onCategoryChange('postPrayer')}
            style={[
              styles.categoryChip,
              { backgroundColor: chipBg, borderColor: chipBorder },
              selectedCategory === 'postPrayer' && { backgroundColor: chipActiveBg, borderColor: chipActiveBorder },
            ]}
          >
            <Text
              style={[
                styles.categoryText,
                { color: selectedCategory === 'postPrayer' ? chipActiveText : cardText },
                selectedCategory === 'postPrayer' && { fontWeight: fontWeight.semibold },
              ]}
            >
              {postPrayerLabel}
            </Text>
          </TouchableOpacity>
        </View>

        {showReader && currentItem && (
          <>
            <View style={styles.cardArea}>
              <GestureHandlerRootView style={styles.gestureRoot}>
                <GestureDetector gesture={panGesture}>
                <Animated.View style={[styles.cardWrapper, { width: listWidth }, cardAnimatedStyle]}>
                  <View style={styles.cardOuter}>
                    {renderCard(currentItem)}
                  </View>
                </Animated.View>
              </GestureDetector>
              </GestureHandlerRootView>
            </View>

            <View style={styles.counterRow}>
              <View style={styles.counterPlaceholder}>
                <View style={[styles.counterWrapper, { width: COUNTER_SIZE + SPARKLE_RADIUS * 2, height: COUNTER_SIZE + SPARKLE_RADIUS * 2 }]}>
                  <CelebrationSparkles
                    visible={showCelebration}
                    onComplete={() => setShowCelebration(false)}
                  />
                  <TouchableOpacity
                    onPress={onCounterTap}
                    activeOpacity={0.8}
                    style={[
                      styles.counterButton,
                      {
                        backgroundColor: counterBg,
                        borderColor: GOLD,
                        borderWidth: 2,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.counterButtonText,
                        targetCount > 99 && styles.counterButtonTextSmall,
                        { color: isComplete ? '#1a2e1f' : (isRoyal ? '#1a2e1f' : colors.text) },
                      ]}
                    >
                      {isComplete ? doneLabel : `${tapCount}/${targetCount}`}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={[styles.pageCounter, { color: colors.textMuted }]}>
                {currentIndex + 1} / {items.length}
              </Text>
            </View>

            <Text style={[styles.swipeHint, { color: colors.textMuted, paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>{swipeHint}</Text>
          </>
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.sm },
  header: { paddingTop: spacing.lg, paddingBottom: spacing.md },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.regular,
    fontFamily: fontFamily.heading,
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * lineHeight.relaxed,
  },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  categoryChip: {
    flex: 1,
    minWidth: '22%',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  categoryText: { fontSize: fontSize.xs },
  cardArea: { flex: 1, overflow: 'visible' },
  gestureRoot: { flex: 1, overflow: 'visible' },
  cardWrapper: { flex: 1 },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    marginVertical: spacing.lg,
    overflow: 'visible',
  },
  counterPlaceholder: {
    position: 'relative',
    width: COUNTER_SIZE,
    height: COUNTER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  counterWrapper: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -(COUNTER_SIZE + SPARKLE_RADIUS * 2) / 2,
    marginTop: -(COUNTER_SIZE + SPARKLE_RADIUS * 2) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterButton: {
    width: COUNTER_SIZE,
    height: COUNTER_SIZE,
    borderRadius: COUNTER_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  counterButtonTextSmall: { fontSize: fontSize.xs },
  pageCounter: { fontSize: fontSize.sm },
  cardOuter: { flex: 1, paddingBottom: radius.lg * 2 },
  card: { flex: 1, minHeight: 180 },
  cardInnerScroll: { flex: 1 },
  cardInnerScrollContent: { paddingBottom: spacing.xl, flexGrow: 1 },
  arabic: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.arabic,
    textAlign: 'right',
    marginBottom: spacing.sm,
  },
  transliteration: {
    fontSize: fontSize.sm,
    fontStyle: 'italic',
    marginBottom: spacing.xs,
  },
  meaning: {
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * lineHeight.normal,
  },
  countHint: { fontSize: fontSize.xs, marginTop: spacing.xs },
  swipeHint: {
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
});
