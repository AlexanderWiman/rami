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
  TouchableWithoutFeedback,
  TextInput,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
import {
  loadAdhkarTargets,
  saveAdhkarTarget,
  clampTarget,
  TARGET_PRESETS,
  type AdhkarTargets,
} from '../src/features/adkhar/storage/adhkarTargets';
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
  const [rounds, setRounds] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [targets, setTargets] = useState<AdhkarTargets>({});
  const [targetPickerOpen, setTargetPickerOpen] = useState(false);
  const [customTargetText, setCustomTargetText] = useState('');

  useEffect(() => {
    loadAdhkarTargets().then(setTargets);
  }, []);

  const activeSection = ADHKAR_SECTIONS.find((s) => s.category === selectedCategory);
  const items = activeSection?.items ?? [];
  const currentItem = items[currentIndex];
  // The dhikr's own count (1 = single tap to advance, 3/7/33 etc. = repeat);
  // default 3 taps when the dhikr does not specify one.
  const defaultCount =
    currentItem != null && typeof currentItem.count === 'number' && currentItem.count >= 1
      ? currentItem.count
      : 3;
  // A target the user picked for this dhikr wins over the default.
  const targetCount =
    currentItem != null && targets[currentItem.id] != null ? targets[currentItem.id] : defaultCount;

  const translateX = useSharedValue(0);

  useEffect(() => {
    setTapCount(0);
    setRounds(0);
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
      return;
    }
    const nextCount = tapCount + 1;
    setTapCount(nextCount);
    if (nextCount === targetCount) {
      hapticSuccess();
      setTapCount(0);
      setRounds((r) => r + 1);
      setShowCelebration(true);
      goToNext();
    } else {
      hapticLight();
    }
  }, [tapCount, targetCount, goToNext]);

  /** Picks a repetition target for the current dhikr; null restores its default. */
  const pickTarget = useCallback(
    async (value: number | null) => {
      if (!currentItem) return;
      await hapticLight();
      const next = await saveAdhkarTarget(currentItem.id, value);
      setTargets(next);
      setTapCount(0);
      setTargetPickerOpen(false);
      setCustomTargetText('');
    },
    [currentItem]
  );

  const applyCustomTarget = useCallback(() => {
    const parsed = parseInt(customTargetText, 10);
    if (Number.isNaN(parsed)) return;
    void pickTarget(clampTarget(parsed));
  }, [customTargetText, pickTarget]);

  const resetCounter = useCallback(() => {
    setTapCount(0);
    setRounds(0);
    hapticLight();
  }, []);

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

  const renderCard = (item: AdhkarItem) => (
    <GlassCard padding="xl" rounded="lg" style={styles.card}>
      <ScrollView
        style={styles.cardInnerScroll}
        contentContainerStyle={styles.cardInnerScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.arabic, { color: cardText }]}>{item.arabic}</Text>
        <View style={[styles.cardDivider, { borderTopColor: chipBorder }]} />
        <Text style={[styles.transliteration, { color: cardTextSecondary }]}>{item.transliteration}</Text>
        <View style={[styles.cardDivider, { borderTopColor: chipBorder }]} />
        <Text style={[styles.meaning, { color: cardTextMuted }]}>{item.meaning}</Text>
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
              <View style={styles.counterMeta}>
                <Text style={[styles.counterBig, { color: cardText }]}>
                  {tapCount}
                  <Text style={[styles.counterBigTarget, { color: cardTextMuted }]}>/{targetCount}</Text>
                </Text>
                <Text style={[styles.roundsText, { color: cardTextMuted }]}>
                  {getString(language, 'adhkarRounds')}: {rounds}
                </Text>
                <Text style={[styles.pageCounter, { color: colors.textMuted }]}>
                  {currentIndex + 1} / {items.length}
                </Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setCustomTargetText('');
                  setTargetPickerOpen(true);
                }}
                style={[styles.actionChip, { borderColor: chipBorder, backgroundColor: chipBg }]}
              >
                <Ionicons name="repeat" size={16} color={chipActiveText} />
                <Text style={[styles.actionChipText, { color: cardText }]}>
                  {getString(language, 'adhkarRepetitions')}: {targetCount}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={resetCounter}
                accessibilityLabel={getString(language, 'adhkarResetCounter')}
                style={[styles.actionChip, { borderColor: chipBorder, backgroundColor: chipBg }]}
              >
                <Ionicons name="refresh" size={16} color={cardTextMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.swipeHint, { color: colors.textMuted, paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>{swipeHint}</Text>
          </>
        )}

        {/* Repetition picker */}
        <Modal
          visible={targetPickerOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setTargetPickerOpen(false)}
        >
          <TouchableWithoutFeedback onPress={() => setTargetPickerOpen(false)}>
            <View style={styles.sheetBackdrop} />
          </TouchableWithoutFeedback>
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: isRoyal ? 'rgba(10, 25, 18, 0.97)' : colors.surface,
                borderColor: chipBorder,
                paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm,
              },
            ]}
          >
            <View style={styles.sheetHeader}>
              <TouchableOpacity onPress={() => setTargetPickerOpen(false)} hitSlop={12}>
                <Ionicons name="close" size={22} color={cardTextMuted} />
              </TouchableOpacity>
              <Text style={[styles.sheetTitle, { color: cardText }]}>
                {getString(language, 'adhkarAdjustRepetitions')}
              </Text>
              <View style={styles.sheetHeaderSpacer} />
            </View>

            <View style={styles.sheetGrid}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => void pickTarget(null)}
                style={[
                  styles.sheetOption,
                  { borderColor: chipBorder },
                  currentItem != null && targets[currentItem.id] == null && {
                    borderColor: chipActiveBorder,
                    backgroundColor: chipActiveBg,
                  },
                ]}
              >
                <Text style={[styles.sheetOptionText, { color: cardText }]}>
                  {getString(language, 'adhkarDefaultCount')} ({defaultCount})
                </Text>
              </TouchableOpacity>
              {TARGET_PRESETS.map((preset) => {
                const selected = currentItem != null && targets[currentItem.id] === preset;
                return (
                  <TouchableOpacity
                    key={preset}
                    activeOpacity={0.8}
                    onPress={() => void pickTarget(preset)}
                    style={[
                      styles.sheetOption,
                      { borderColor: chipBorder },
                      selected && { borderColor: chipActiveBorder, backgroundColor: chipActiveBg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.sheetOptionText,
                        { color: selected ? chipActiveText : cardText },
                      ]}
                    >
                      {preset}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.customRow}>
              <TextInput
                value={customTargetText}
                onChangeText={(text) => setCustomTargetText(text.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                placeholder={getString(language, 'adhkarCustomize')}
                placeholderTextColor={cardTextMuted}
                style={[styles.customInput, { color: cardText, borderColor: chipBorder }]}
                onSubmitEditing={applyCustomTarget}
                returnKeyType="done"
                maxLength={5}
              />
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={applyCustomTarget}
                disabled={customTargetText.length === 0}
                style={[
                  styles.customApply,
                  { borderColor: customTargetText.length === 0 ? chipBorder : chipActiveBorder },
                ]}
              >
                <Text
                  style={[
                    styles.sheetOptionText,
                    { color: customTargetText.length === 0 ? cardTextMuted : chipActiveText },
                  ]}
                >
                  {getString(language, 'done')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
  cardDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginVertical: spacing.sm,
  },
  counterMeta: { alignItems: 'flex-start' },
  counterBig: { fontSize: 40, fontWeight: fontWeight.regular, lineHeight: 46 },
  counterBigTarget: { fontSize: fontSize.lg },
  roundsText: { fontSize: fontSize.xs, marginTop: 2 },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    minHeight: 40,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionChipText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  sheetBackdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sheetHeaderSpacer: { width: 22 },
  sheetTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  sheetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  sheetOption: {
    flexGrow: 1,
    minWidth: '30%',
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptionText: { fontSize: fontSize.md, fontWeight: fontWeight.medium },
  customRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm },
  customInput: {
    flex: 1,
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.md,
    textAlign: 'center',
  },
  customApply: {
    minWidth: 96,
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeHint: {
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
});
