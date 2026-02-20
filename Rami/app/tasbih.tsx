/**
 * Tasbih helper — simple counter with dhikr presets.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../src/theme/ThemeContext';
import { useLanguage } from '../src/contexts/LanguageContext';
import { ScreenWrapper } from '../src/components/ScreenWrapper';
import { BackToHomeBar } from '../src/components/BackToHomeBar';
import { GlassCard } from '../src/components/GlassCard';
import { getString, formatNumber } from '../src/constants/i18n';
import { hapticLight, hapticSuccess } from '../src/utils/haptics';
import { spacing, radius } from '../src/theme/spacing';
import { fontSize, fontWeight, fontFamily, lineHeight } from '../src/theme/typography';

const DHIKR_PRESETS = [
  { id: 'subhanallah', i18nKey: 'tasbihPresetSubhanallah' as const, target: 33 },
  { id: 'alhamdulillah', i18nKey: 'tasbihPresetAlhamdulillah' as const, target: 33 },
  { id: 'allahuakbar', i18nKey: 'tasbihPresetAllahuakbar' as const, target: 34 },
  { id: 'astaghfirallah', i18nKey: 'tasbihPresetAstaghfirallah' as const, target: 100 },
  { id: 'lahawla', i18nKey: 'tasbihPresetLahawla' as const, target: 33 },
  { id: 'tahlil', i18nKey: 'tasbihPresetTahlil' as const, target: 100 },
  { id: 'salawat', i18nKey: 'tasbihPresetSalawat' as const, target: 100 },
];

export default function TasbihScreen() {
  const { colors, pageBackground, style: themeStyle } = useTheme();
  const isRoyal = themeStyle === 'royal';
  const { language } = useLanguage();
  const title = getString(language, 'tasbihTitle');
  const subtitle = getString(language, 'tasbihSubtitle');
  const tapToCount = getString(language, 'tasbihTapToCount');
  const countLabel = getString(language, 'tasbihCount');
  const targetLabel = getString(language, 'tasbihTarget');
  const resetLabel = getString(language, 'tasbihReset');
  const presetsLabel = getString(language, 'tasbihPresets');
  const instruction = getString(language, 'tasbihInstruction');
  const reachedLabel = getString(language, 'tasbihReached');

  // Royal theme colors
  const cardText = isRoyal ? 'rgba(255,255,255,0.95)' : colors.text;
  const cardTextSecondary = isRoyal ? 'rgba(255,255,255,0.75)' : colors.textSecondary;
  const cardTextMuted = isRoyal ? 'rgba(255,255,255,0.55)' : colors.textMuted;
  const goldAccent = '#E6C27A';
  const chipBg = isRoyal ? 'rgba(10, 25, 18, 0.5)' : undefined;
  const chipBorder = isRoyal ? 'rgba(255,255,255,0.15)' : 'transparent';
  const chipActiveBg = isRoyal ? 'rgba(230, 194, 122, 0.22)' : colors.highlightGlow;
  const chipActiveBorder = isRoyal ? 'rgba(230, 194, 122, 0.5)' : colors.highlight;
  const chipActiveText = isRoyal ? goldAccent : colors.highlight;

  const [count, setCount] = useState(0);
  const [target, setTarget] = useState(33);
  const [phraseId, setPhraseId] = useState(DHIKR_PRESETS[0].id);

  const phrase = useMemo(() => DHIKR_PRESETS.find((p) => p.id === phraseId) ?? DHIKR_PRESETS[0], [phraseId]);
  const phraseLabel = getString(language, phrase.i18nKey);
  const reached = count >= target;

  const increment = useCallback(() => {
    setCount((prev) => {
      const next = prev + 1;
      if (next === target) hapticSuccess();
      else hapticLight();
      return next;
    });
  }, [target]);

  const reset = useCallback(() => {
    hapticLight();
    setCount(0);
  }, []);

  const selectPreset = useCallback((id: string) => {
    const selected = DHIKR_PRESETS.find((p) => p.id === id);
    if (!selected) return;
    hapticLight();
    setPhraseId(id);
    setTarget(selected.target);
    setCount(0);
  }, []);

  const setQuickTarget = useCallback((value: number) => {
    hapticLight();
    setTarget(value);
    setCount(0);
  }, []);

  return (
    <ScreenWrapper>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <BackToHomeBar />
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
        </View>

        <View style={styles.content}>
          <GlassCard padding="lg" rounded="lg" style={styles.counterCard}>
          <Text style={[styles.phrase, { color: cardText }, language === 'ar' && styles.phraseArabic]}>{phraseLabel}</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={increment}
            style={[styles.counterButton, { borderColor: isRoyal ? 'rgba(255,255,255,0.15)' : colors.border }]}
          >
            <Text style={[styles.count, { color: isRoyal ? goldAccent : colors.highlight }]}>{formatNumber(language, count)}</Text>
            <Text style={[styles.tapHint, { color: cardTextMuted }]}>{tapToCount}</Text>
          </TouchableOpacity>
          <View style={styles.targetRow}>
            {reached ? (
              <Text style={[styles.reachedInline, { color: isRoyal ? goldAccent : colors.accent }]}>{reachedLabel}</Text>
            ) : (
              <Text style={[styles.targetText, { color: cardTextMuted }]}>
                {countLabel}: {formatNumber(language, count)} · {targetLabel}: {formatNumber(language, target)}
              </Text>
            )}
            <TouchableOpacity onPress={reset} activeOpacity={0.7}>
              <Text style={[styles.resetText, { color: isRoyal ? goldAccent : colors.highlight }]}>{resetLabel}</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>

        <GlassCard padding="md" rounded="lg" style={styles.instructionCard}>
          <Text style={[styles.instructionText, { color: cardTextSecondary }]}>{instruction}</Text>
          <View style={styles.quickTargets}>
            {[33, 99].map((value) => (
              <TouchableOpacity
                key={value}
                onPress={() => setQuickTarget(value)}
                style={[
                  styles.quickTarget,
                  { backgroundColor: chipBg, borderColor: chipBorder },
                  value === target && { backgroundColor: chipActiveBg, borderColor: chipActiveBorder },
                ]}
                activeOpacity={0.7}
              >
                <Text style={[styles.quickTargetText, { color: value === target ? chipActiveText : cardText }]}>{formatNumber(language, value)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </GlassCard>

        <Text style={[styles.sectionTitle, { color: cardTextMuted }]}>{presetsLabel}</Text>
        <View style={styles.presetRow}>
          {DHIKR_PRESETS.map((preset) => (
            <TouchableOpacity
              key={preset.id}
              onPress={() => selectPreset(preset.id)}
              style={[
                styles.presetChip,
                { backgroundColor: chipBg, borderColor: chipBorder },
                preset.id === phraseId && { backgroundColor: chipActiveBg, borderColor: chipActiveBorder },
              ]}
              activeOpacity={0.7}
            >
              <Text style={[styles.presetText, { color: preset.id === phraseId ? chipActiveText : cardText }, language === 'ar' && styles.presetTextArabic]}>{getString(language, preset.i18nKey)}</Text>
              <Text style={[styles.presetTarget, { color: preset.id === phraseId ? chipActiveText : cardTextMuted }]}>· {formatNumber(language, preset.target)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xxl + 72 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
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
  content: { paddingHorizontal: spacing.lg },
  counterCard: { marginBottom: spacing.lg },
  phrase: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  phraseArabic: {
    textAlign: 'right',
    fontFamily: fontFamily.arabic,
  },
  counterButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
  },
  count: {
    fontSize: 40,
    fontWeight: fontWeight.bold,
    fontFamily: fontFamily.heading,
  },
  tapHint: {
    marginTop: spacing.xs,
    fontSize: fontSize.xs,
  },
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  targetText: { fontSize: fontSize.sm, flex: 1 },
  resetText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  reachedInline: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, flex: 1 },
  instructionCard: { marginBottom: spacing.lg },
  instructionText: { fontSize: fontSize.sm, lineHeight: fontSize.sm * lineHeight.relaxed },
  quickTargets: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  quickTarget: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  quickTargetText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  sectionTitle: { marginBottom: spacing.sm, fontSize: fontSize.sm },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  presetText: { fontSize: fontSize.xs },
  presetTextArabic: {
    textAlign: 'right',
    fontFamily: fontFamily.arabic,
  },
  presetTarget: { fontSize: fontSize.xs },
});
