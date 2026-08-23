/**
 * Narrator dossier — who the narrator is, and what the critics said about them.
 *
 * The critics' statements are the substance of this screen and they are shown
 * as written, one card per statement with the critic named. The app's reading of
 * a statement's leaning is available but subordinate: a small marker beside the
 * quote, never in place of it, and never aggregated into something that looks
 * like a verdict on the hadith.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFonts, Amiri_400Regular } from '@expo-google-fonts/amiri';
import { useTheme } from '../../../theme/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { ScreenWrapper } from '../../../components/ScreenWrapper';
import { BackBar } from '../../../components/BackBar';
import { GlassCard } from '../../../components/GlassCard';
import { getString } from '../../../constants/i18n';
import { getRawi, type RawiDossier } from '../api/hadithKg';
import { classifyGrade, type GradeTone } from '../utils/grade';
import { spacing, radius } from '../../../theme/spacing';
import { fontSize, fontWeight, fontFamily } from '../../../theme/typography';
import { hapticLight } from '../../../utils/haptics';

const ARABIC_FONT = 'Amiri_400Regular';

type State =
  | { kind: 'loading' }
  | { kind: 'ok'; data: RawiDossier }
  | { kind: 'unavailable' }
  | { kind: 'error' };

const FLAG_KEYS: Record<string, 'hadithObsTadlis' | 'hadithObsIkhtilat' | 'hadithFlagStub'> = {
  tadlis: 'hadithObsTadlis',
  ikhtilat: 'hadithObsIkhtilat',
  stub: 'hadithFlagStub',
};

export function RawiScreen() {
  const { colors, style: themeStyle } = useTheme();
  const isRoyal = themeStyle === 'royal';
  const { language } = useLanguage();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const rawiId = Number(params.id);
  const [state, setState] = useState<State>({ kind: 'loading' });
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

  const load = useCallback(async () => {
    if (!Number.isFinite(rawiId)) {
      setState({ kind: 'error' });
      return;
    }
    setState({ kind: 'loading' });
    const outcome = await getRawi(rawiId);
    if (outcome.status === 'ok') setState({ kind: 'ok', data: outcome.data });
    else if (outcome.status === 'unavailable') setState({ kind: 'unavailable' });
    else setState({ kind: 'error' });
  }, [rawiId]);

  useEffect(() => {
    void load();
  }, [load]);

  const openRawi = useCallback(
    async (id: number) => {
      await hapticLight();
      router.push(`/hadith/rawi/${id}`);
    },
    [router]
  );

  const renderRelated = (
    label: string,
    people: Array<{ rawiId: number; name: string | null }>
  ) => {
    if (people.length === 0) return null;
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: textMuted }]}>{label}</Text>
        <View style={styles.chipRow}>
          {people.map((p) => (
            <TouchableOpacity
              key={p.rawiId}
              onPress={() => void openRawi(p.rawiId)}
              style={[styles.chip, { borderColor: colors.border }]}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.chipText,
                  { color: textSecondary },
                  fontsLoaded && { fontFamily: ARABIC_FONT },
                ]}
              >
                {p.name ?? `#${p.rawiId}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <BackBar />

        {state.kind === 'loading' ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={gold} />
          </View>
        ) : state.kind !== 'ok' ? (
          <View style={styles.centered}>
            <Text style={[styles.messageText, { color: textSecondary }]}>
              {state.kind === 'unavailable' ? t('hadithUnavailable') : t('hadithGradingError')}
            </Text>
            <TouchableOpacity
              onPress={() => void load()}
              style={[styles.retryButton, { borderColor: colors.border }]}
            >
              <Text style={[styles.retryText, { color: gold }]}>{t('retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <GlassCard padding="lg" rounded="lg">
              <Text style={[styles.label, { color: textMuted }]}>{t('hadithNarratorTitle')}</Text>
              <Text
                style={[
                  styles.name,
                  { color: textPrimary },
                  fontsLoaded && { fontFamily: ARABIC_FONT },
                ]}
              >
                {state.data.name ?? `#${state.data.rawiId}`}
              </Text>

              <View style={[styles.facts, { borderTopColor: colors.border }]}>
                {state.data.rank?.value ? (
                  <View style={styles.factRow}>
                    <Text style={[styles.factLabel, { color: textMuted }]}>{t('hadithRank')}</Text>
                    <Text style={[styles.factValue, { color: toneColors[classifyGrade(state.data.rank.value)] }]}>
                      {state.data.rank.value}
                    </Text>
                  </View>
                ) : null}
                {state.data.tabaqa ? (
                  <View style={styles.factRow}>
                    <Text style={[styles.factLabel, { color: textMuted }]}>{t('hadithTabaqa')}</Text>
                    <Text style={[styles.factValue, { color: textSecondary }]}>{state.data.tabaqa}</Text>
                  </View>
                ) : null}
                {state.data.deathYear || state.data.deathYearRaw ? (
                  <View style={styles.factRow}>
                    <Text style={[styles.factLabel, { color: textMuted }]}>{t('hadithDeathYear')}</Text>
                    <Text style={[styles.factValue, { color: textSecondary }]}>
                      {state.data.deathYearRaw ?? state.data.deathYear}
                    </Text>
                  </View>
                ) : null}
                {state.data.flags.length > 0 ? (
                  <View style={styles.chipRow}>
                    {state.data.flags.map((flag) =>
                      FLAG_KEYS[flag] ? (
                        <Text key={flag} style={[styles.flagText, { color: toneColors.daif }]}>
                          {t(FLAG_KEYS[flag])}
                        </Text>
                      ) : null
                    )}
                  </View>
                ) : null}
              </View>
            </GlassCard>

            <View style={styles.statementsHeader}>
              <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                {t('hadithCriticStatements')}
              </Text>
            </View>

            {state.data.statements.length === 0 ? (
              <Text style={[styles.messageText, { color: textMuted }]}>{t('hadithNoStatements')}</Text>
            ) : (
              state.data.statements.map((statement, index) => (
                <View key={`${statement.criticId ?? 'x'}-${index}`} style={styles.statementWrap}>
                  <GlassCard padding="md" rounded="md">
                    {statement.critic ? (
                      <Text
                        style={[
                          styles.critic,
                          { color: gold },
                          fontsLoaded && { fontFamily: ARABIC_FONT },
                        ]}
                      >
                        {statement.critic}
                      </Text>
                    ) : null}
                    <Text
                      style={[
                        styles.qawl,
                        { color: textPrimary },
                        fontsLoaded && { fontFamily: ARABIC_FONT },
                      ]}
                    >
                      {statement.text.value}
                    </Text>
                    {statement.classification?.value ? (
                      <View style={styles.computedRow}>
                        <Ionicons name="calculator-outline" size={12} color={textMuted} />
                        <Text style={[styles.computedText, { color: textMuted }]}>
                          {statement.classification.value}
                        </Text>
                      </View>
                    ) : null}
                  </GlassCard>
                </View>
              ))
            )}

            {renderRelated(t('hadithTeachers'), state.data.teachers)}
            {renderRelated(t('hadithStudents'), state.data.students)}

            <Text style={[styles.credit, { color: textMuted }]}>
              {t('hadithSources')}: {state.data.attribution.title} — {state.data.attribution.author} (
              {state.data.attribution.license})
            </Text>
          </>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl },
  centered: { alignItems: 'center', paddingTop: spacing.xl },
  messageText: { fontSize: fontSize.sm, textAlign: 'center', lineHeight: 22, marginTop: spacing.xs },
  label: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  name: {
    fontSize: 24,
    lineHeight: 40,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: spacing.xxs,
  },
  facts: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.xxs,
  },
  factRow: { flexDirection: 'row', gap: spacing.xs },
  factLabel: { fontSize: fontSize.xs, minWidth: 110 },
  factValue: { flex: 1, fontSize: fontSize.xs, lineHeight: 18 },
  flagText: { fontSize: fontSize.xs },
  statementsHeader: { marginTop: spacing.lg, marginBottom: spacing.xs },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, fontFamily: fontFamily.heading },
  sectionLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  section: { marginTop: spacing.lg },
  statementWrap: { marginBottom: spacing.xs },
  critic: { fontSize: fontSize.sm, textAlign: 'right', writingDirection: 'rtl' },
  qawl: {
    fontSize: 18,
    lineHeight: 32,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: spacing.xxs,
  },
  computedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, marginTop: spacing.xxs },
  computedText: { fontSize: fontSize.xs, fontStyle: 'italic' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xxs },
  chip: {
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: { fontSize: fontSize.xs },
  retryButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  retryText: { fontSize: fontSize.sm },
  credit: { fontSize: fontSize.xs, textAlign: 'center', marginTop: spacing.lg, lineHeight: 18 },
});
