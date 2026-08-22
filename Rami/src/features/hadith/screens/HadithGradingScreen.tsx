/**
 * Hadith Grading & Authentication — search the Dorar al-Saniyya encyclopaedia
 * and show text, grading, the scholar who graded it, source and reference.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useFonts, Amiri_400Regular } from '@expo-google-fonts/amiri';
import { useTheme } from '../../../theme/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { ScreenWrapper } from '../../../components/ScreenWrapper';
import { BackToHomeBar } from '../../../components/BackToHomeBar';
import { GlassCard } from '../../../components/GlassCard';
import { getString } from '../../../constants/i18n';
import { searchHadith, type HadithResult } from '../api/dorar';
import { classifyGrade, type GradeTone } from '../utils/grade';
import { spacing, radius } from '../../../theme/spacing';
import { fontSize, fontWeight, fontFamily } from '../../../theme/typography';
import { hapticLight } from '../../../utils/haptics';

const ARABIC_FONT = 'Amiri_400Regular';

type ScreenState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'results'; results: HadithResult[]; page: number; loadingMore: boolean; exhausted: boolean }
  | { kind: 'empty' }
  | { kind: 'error' };

export function HadithGradingScreen() {
  const { colors, style: themeStyle } = useTheme();
  const isRoyal = themeStyle === 'royal';
  const { language } = useLanguage();
  const [query, setQuery] = useState('');
  const [state, setState] = useState<ScreenState>({ kind: 'idle' });
  const [fontsLoaded] = useFonts({ Amiri_400Regular });
  /** Query the current results belong to, so "load more" pages the same search. */
  const activeQuery = useRef('');

  const t = (key: Parameters<typeof getString>[1]) => getString(language, key);
  const gold = isRoyal ? '#E6C27A' : colors.highlight;
  const textPrimary = isRoyal ? 'rgba(255,255,255,0.95)' : colors.text;
  const textSecondary = isRoyal ? 'rgba(255,255,255,0.72)' : colors.textSecondary;
  const textMuted = isRoyal ? 'rgba(255,255,255,0.55)' : colors.textMuted;

  const toneColors = useMemo(
    (): Record<GradeTone, string> => ({
      sahih: isRoyal ? '#7BD2A4' : '#1F6F54',
      hasan: isRoyal ? '#E6C27A' : '#8A6A1F',
      daif: isRoyal ? '#E8A9A9' : '#A33A3A',
      unknown: textMuted,
    }),
    [isRoyal, textMuted]
  );

  const runSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (trimmed.length === 0) return;
    Keyboard.dismiss();
    await hapticLight();
    activeQuery.current = trimmed;
    setState({ kind: 'loading' });
    const outcome = await searchHadith(trimmed, 1);
    if (activeQuery.current !== trimmed) return;
    if (outcome.status === 'ok') {
      setState({
        kind: 'results',
        results: outcome.results,
        page: 1,
        loadingMore: false,
        exhausted: false,
      });
    } else if (outcome.status === 'empty') {
      setState({ kind: 'empty' });
    } else {
      setState({ kind: 'error' });
    }
  }, [query]);

  const loadMore = useCallback(async () => {
    if (state.kind !== 'results' || state.loadingMore || state.exhausted) return;
    const nextPage = state.page + 1;
    const searchedFor = activeQuery.current;
    setState({ ...state, loadingMore: true });
    const outcome = await searchHadith(searchedFor, nextPage);
    if (activeQuery.current !== searchedFor) return;
    setState((prev) => {
      if (prev.kind !== 'results') return prev;
      if (outcome.status !== 'ok') {
        return { ...prev, loadingMore: false, exhausted: true };
      }
      // Dorar repeats the last page when asked past the end — drop duplicates.
      const known = new Set(prev.results.map((r) => `${r.hadith}|${r.numberOrPage}`));
      const fresh = outcome.results.filter((r) => !known.has(`${r.hadith}|${r.numberOrPage}`));
      return {
        kind: 'results',
        results: [...prev.results, ...fresh],
        page: nextPage,
        loadingMore: false,
        exhausted: fresh.length === 0,
      };
    });
  }, [state]);

  const renderField = (label: string, value: string) =>
    value.length > 0 ? (
      <View style={styles.fieldRow}>
        <Text style={[styles.fieldLabel, { color: textMuted }]}>{label}</Text>
        <Text style={[styles.fieldValue, { color: textSecondary }]}>{value}</Text>
      </View>
    ) : null;

  const renderResult = (result: HadithResult, index: number) => {
    const tone = classifyGrade(result.grade);
    const gradeColor = toneColors[tone];
    return (
      <Animated.View
        key={`${index}-${result.numberOrPage}`}
        entering={FadeIn.delay(Math.min(index, 8) * 40).duration(300)}
        style={styles.resultWrap}
      >
        <GlassCard padding="lg" rounded="lg">
          <Text
            style={[
              styles.hadithText,
              { color: textPrimary },
              fontsLoaded && { fontFamily: ARABIC_FONT },
            ]}
          >
            {result.hadith}
          </Text>

          {result.grade.length > 0 ? (
            <View
              style={[
                styles.gradeBadge,
                { borderColor: gradeColor, backgroundColor: isRoyal ? 'rgba(255,255,255,0.05)' : colors.surfaceGlass },
              ]}
            >
              <Ionicons
                name={tone === 'daif' ? 'alert-circle-outline' : 'checkmark-circle-outline'}
                size={16}
                color={gradeColor}
              />
              <Text style={[styles.gradeText, { color: gradeColor }]}>{result.grade}</Text>
            </View>
          ) : null}

          <View style={[styles.fields, { borderTopColor: colors.border }]}>
            {renderField(t('hadithNarrator'), result.rawi)}
            {renderField(t('hadithScholar'), result.mohdith)}
            {renderField(t('hadithSource'), result.book)}
            {renderField(t('hadithReference'), result.numberOrPage)}
          </View>
        </GlassCard>
      </Animated.View>
    );
  };

  return (
    <ScreenWrapper>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <BackToHomeBar />
          <Text style={[styles.title, { color: colors.text }]}>{t('hadithGrading')}</Text>
          <Text style={[styles.intro, { color: textMuted }]}>{t('hadithGradingIntro')}</Text>
        </View>

        <View
          style={[
            styles.searchRow,
            { borderColor: colors.border, backgroundColor: isRoyal ? 'rgba(10,25,18,0.5)' : colors.surfaceGlass },
          ]}
        >
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('hadithGradingSearchHint')}
            placeholderTextColor={textMuted}
            style={[styles.searchInput, { color: textPrimary }]}
            textAlign="right"
            returnKeyType="search"
            onSubmitEditing={() => void runSearch()}
            autoCorrect={false}
          />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('hadithGrading')}
            onPress={() => void runSearch()}
            style={styles.searchButton}
            disabled={query.trim().length === 0}
          >
            <Ionicons
              name="search"
              size={22}
              color={query.trim().length === 0 ? textMuted : gold}
            />
          </TouchableOpacity>
        </View>

        {state.kind === 'loading' ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={gold} />
          </View>
        ) : null}

        {state.kind === 'empty' ? (
          <View style={styles.centered}>
            <Text style={[styles.messageText, { color: textMuted }]}>
              {t('hadithGradingNoResults')}
            </Text>
          </View>
        ) : null}

        {state.kind === 'error' ? (
          <View style={styles.centered}>
            <Text style={[styles.messageText, { color: colors.error }]}>
              {t('hadithGradingError')}
            </Text>
            <TouchableOpacity
              onPress={() => void runSearch()}
              style={[styles.retryButton, { borderColor: colors.border }]}
            >
              <Text style={[styles.retryText, { color: textPrimary }]}>{t('retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {state.kind === 'results' ? (
          <>
            {state.results.map(renderResult)}
            {!state.exhausted ? (
              <TouchableOpacity
                onPress={() => void loadMore()}
                disabled={state.loadingMore}
                style={[styles.moreButton, { borderColor: colors.border }]}
              >
                {state.loadingMore ? (
                  <ActivityIndicator size="small" color={gold} />
                ) : (
                  <Text style={[styles.moreText, { color: gold }]}>{t('loadMore')}</Text>
                )}
              </TouchableOpacity>
            ) : null}
            <Text style={[styles.credit, { color: textMuted }]}>{t('hadithSourceCredit')}</Text>
          </>
        ) : null}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl },
  header: { paddingTop: spacing.lg, paddingBottom: spacing.md },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.regular,
    fontFamily: fontFamily.heading,
  },
  intro: { fontSize: fontSize.xs, lineHeight: 18, marginTop: spacing.xs },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
  },
  searchInput: { flex: 1, minHeight: 48, fontSize: fontSize.md },
  searchButton: { padding: spacing.xs, minWidth: 44, alignItems: 'center' },
  centered: { alignItems: 'center', paddingTop: spacing.xl },
  messageText: { fontSize: fontSize.md, textAlign: 'center', lineHeight: 22 },
  resultWrap: { marginBottom: spacing.sm },
  hadithText: {
    fontSize: 21,
    lineHeight: 38,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  gradeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    alignSelf: 'flex-start',
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    marginTop: spacing.sm,
  },
  gradeText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  fields: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  fieldRow: { flexDirection: 'row', gap: spacing.xs },
  fieldLabel: { fontSize: fontSize.xs, minWidth: 92 },
  fieldValue: { flex: 1, fontSize: fontSize.xs, lineHeight: 18 },
  retryButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  retryText: { fontSize: fontSize.sm },
  moreButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.xs,
  },
  moreText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  credit: {
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 18,
  },
});
