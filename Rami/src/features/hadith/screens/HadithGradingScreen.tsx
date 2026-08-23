/**
 * Hadith Grading & Authentication — search the corpus, then open a hadith to see
 * its isnad, the ruling recorded for it and the evidence behind that ruling.
 *
 * The list itself stays deliberately thin: the opening words, the source's own
 * ruling if it has one, and how many chains exist. Everything that requires
 * interpretation lives one tap away, on the detail screen.
 */
import React, { useCallback, useMemo, useState } from 'react';
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
import { useRouter } from 'expo-router';
import { useFonts, Amiri_400Regular } from '@expo-google-fonts/amiri';
import { useTheme } from '../../../theme/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { ScreenWrapper } from '../../../components/ScreenWrapper';
import { BackToHomeBar } from '../../../components/BackToHomeBar';
import { GlassCard } from '../../../components/GlassCard';
import { getString } from '../../../constants/i18n';
import { searchHadith, type HadithHit } from '../api/hadithKg';
import { classifyGrade, type GradeTone } from '../utils/grade';
import { spacing, radius } from '../../../theme/spacing';
import { fontSize, fontWeight, fontFamily } from '../../../theme/typography';
import { hapticLight } from '../../../utils/haptics';

const ARABIC_FONT = 'Amiri_400Regular';
const SEARCH_LIMIT = 30;

type ScreenState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'results'; hits: HadithHit[]; relaxed: boolean }
  | { kind: 'empty' }
  | { kind: 'unavailable' }
  | { kind: 'error' };

export function HadithGradingScreen() {
  const { colors, style: themeStyle } = useTheme();
  const isRoyal = themeStyle === 'royal';
  const { language } = useLanguage();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [state, setState] = useState<ScreenState>({ kind: 'idle' });
  const [fontsLoaded] = useFonts({ Amiri_400Regular });

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
    setState({ kind: 'loading' });
    const outcome = await searchHadith(trimmed, SEARCH_LIMIT);
    if (outcome.status === 'ok')
      setState({ kind: 'results', hits: outcome.data.hits, relaxed: outcome.data.relaxed });
    else if (outcome.status === 'empty') setState({ kind: 'empty' });
    else if (outcome.status === 'unavailable') setState({ kind: 'unavailable' });
    else setState({ kind: 'error' });
  }, [query]);

  const openHadith = useCallback(
    async (hadithId: number) => {
      await hapticLight();
      router.push(`/hadith/${hadithId}`);
    },
    [router]
  );

  const renderHit = (hit: HadithHit, index: number) => {
    const ruling = hit.hukm?.value ?? '';
    const tone = classifyGrade(ruling);
    const gradeColor = toneColors[tone];
    return (
      <Animated.View
        key={hit.hadithId}
        entering={FadeIn.delay(Math.min(index, 8) * 40).duration(300)}
        style={styles.resultWrap}
      >
        <TouchableOpacity
          onPress={() => void openHadith(hit.hadithId)}
          activeOpacity={0.75}
          accessibilityRole="button"
        >
          <GlassCard padding="lg" rounded="lg">
            <Text
              style={[
                styles.hadithText,
                { color: textPrimary },
                fontsLoaded && { fontFamily: ARABIC_FONT },
              ]}
            >
              {hit.text ?? ''}
            </Text>

            {ruling.length > 0 ? (
              <View
                style={[
                  styles.gradeBadge,
                  {
                    borderColor: gradeColor,
                    backgroundColor: isRoyal ? 'rgba(255,255,255,0.05)' : colors.surfaceGlass,
                  },
                ]}
              >
                <Ionicons
                  name={tone === 'daif' ? 'alert-circle-outline' : 'checkmark-circle-outline'}
                  size={16}
                  color={gradeColor}
                />
                <Text style={[styles.gradeText, { color: gradeColor }]}>{ruling}</Text>
              </View>
            ) : null}

            <View style={[styles.fields, { borderTopColor: colors.border }]}>
              <View style={styles.hitFooter}>
                <Text style={[styles.fieldValue, { color: textSecondary }]}>
                  {[hit.book.name, hit.noInBook].filter(Boolean).join(' · ')}
                </Text>
                <View style={styles.chainCount}>
                  <Text style={[styles.fieldLabel, { color: textMuted }]}>
                    {t('hadithChainOf')} {hit.chainCount}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={textMuted} />
                </View>
              </View>
            </View>
          </GlassCard>
        </TouchableOpacity>
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
          <Text style={[styles.intro, { color: colors.text }]}>{t('hadithGradingIntro')}</Text>
        </View>

        <View
          style={[
            styles.searchRow,
            {
              borderColor: colors.border,
              backgroundColor: isRoyal ? 'rgba(10,25,18,0.5)' : colors.surfaceGlass,
            },
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
            multiline
            blurOnSubmit
          />
          <TouchableOpacity
            onPress={() => void runSearch()}
            style={styles.searchButton}
            accessibilityRole="button"
            accessibilityLabel={t('hadithGrading')}
          >
            <Ionicons name="search" size={22} color={gold} />
          </TouchableOpacity>
        </View>

        {state.kind === 'loading' ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={gold} />
          </View>
        ) : state.kind === 'empty' ? (
          <View style={styles.centered}>
            <Text style={[styles.messageText, { color: textSecondary }]}>
              {t('hadithGradingNoResults')}
            </Text>
          </View>
        ) : state.kind === 'unavailable' || state.kind === 'error' ? (
          <View style={styles.centered}>
            <Text style={[styles.messageText, { color: textSecondary }]}>
              {state.kind === 'unavailable' ? t('hadithUnavailable') : t('hadithGradingError')}
            </Text>
            <TouchableOpacity
              onPress={() => void runSearch()}
              style={[styles.retryButton, { borderColor: colors.border }]}
            >
              <Text style={[styles.retryText, { color: gold }]}>{t('retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : state.kind === 'results' ? (
          <>
            {state.relaxed ? (
              <Text style={[styles.approxNote, { color: textMuted }]}>
                {t('hadithApproximateMatch')}
              </Text>
            ) : null}
            {state.hits.map(renderHit)}
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
  intro: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    lineHeight: 24,
    marginTop: spacing.sm,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    minHeight: 48,
    // A pasted hadith is long; grow to a few lines rather than scroll one.
    maxHeight: 132,
    paddingVertical: spacing.xs,
    fontSize: fontSize.md,
  },
  searchButton: { padding: spacing.xs, minWidth: 44, alignItems: 'center' },
  centered: { alignItems: 'center', paddingTop: spacing.xl },
  messageText: { fontSize: fontSize.md, textAlign: 'center', lineHeight: 22 },
  approxNote: { fontSize: fontSize.xs, lineHeight: 18, marginBottom: spacing.sm },
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
  hitFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chainCount: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  fieldLabel: { fontSize: fontSize.xs },
  fieldValue: { flex: 1, fontSize: fontSize.xs, lineHeight: 18 },
  retryButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  retryText: { fontSize: fontSize.sm },
});
