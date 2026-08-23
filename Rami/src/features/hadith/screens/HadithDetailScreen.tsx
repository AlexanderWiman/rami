/**
 * One hadith, with the whole basis for its assessment laid out.
 *
 * The screen is built around one rule: what a source asserts and what software
 * derived never share a block. The ruling comes first, verbatim, as the source
 * printed it. Then each isnad as an ordered chain from the Companion down to the
 * collector, every narrator carrying the grading the source gives them and
 * tappable through to the critics' own words. Only then, visually separated and
 * labelled as such, the structural observations the app derived from the chain.
 *
 * There is no generated grading anywhere. If the source has no ruling, the
 * screen says so rather than filling the gap.
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
import {
  getHadith,
  type ChainNarrator,
  type ChainObservation,
  type HadithChain,
  type HadithDetail,
} from '../api/hadithKg';
import { classifyGrade, type GradeTone } from '../utils/grade';
import { spacing, radius } from '../../../theme/spacing';
import { fontSize, fontWeight, fontFamily } from '../../../theme/typography';
import { hapticLight } from '../../../utils/haptics';

const ARABIC_FONT = 'Amiri_400Regular';

type State =
  | { kind: 'loading' }
  | { kind: 'ok'; data: HadithDetail }
  | { kind: 'unavailable' }
  | { kind: 'error' };

/** i18n key for a flag the source records about a narrator. */
const FLAG_KEYS: Record<string, 'hadithObsTadlis' | 'hadithObsIkhtilat' | 'hadithFlagStub'> = {
  tadlis: 'hadithObsTadlis',
  ikhtilat: 'hadithObsIkhtilat',
  stub: 'hadithFlagStub',
};

/** i18n key for a derived observation about a chain. */
const OBSERVATION_KEYS: Record<string, 'hadithObsInqita' | 'hadithObsTadlis' | 'hadithObsIkhtilat' | 'hadithObsWeak'> = {
  inqita: 'hadithObsInqita',
  tadlis: 'hadithObsTadlis',
  ikhtilat: 'hadithObsIkhtilat',
  weak: 'hadithObsWeak',
};

export function HadithDetailScreen() {
  const { colors, style: themeStyle } = useTheme();
  const isRoyal = themeStyle === 'royal';
  const { language } = useLanguage();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const hadithId = Number(params.id);
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
    if (!Number.isFinite(hadithId)) {
      setState({ kind: 'error' });
      return;
    }
    setState({ kind: 'loading' });
    const outcome = await getHadith(hadithId);
    if (outcome.status === 'ok') setState({ kind: 'ok', data: outcome.data });
    else if (outcome.status === 'unavailable') setState({ kind: 'unavailable' });
    else setState({ kind: 'error' });
  }, [hadithId]);

  useEffect(() => {
    void load();
  }, [load]);

  const openRawi = useCallback(
    async (rawiId: number) => {
      await hapticLight();
      router.push(`/hadith/rawi/${rawiId}`);
    },
    [router]
  );

  const renderRuling = (text: string) => {
    const tone = classifyGrade(text);
    const color = toneColors[tone];
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: textMuted }]}>{t('hadithRulingTitle')}</Text>
        <View
          style={[
            styles.rulingBadge,
            {
              borderColor: color,
              backgroundColor: isRoyal ? 'rgba(255,255,255,0.05)' : colors.surfaceGlass,
            },
          ]}
        >
          <Ionicons
            name={tone === 'daif' ? 'alert-circle-outline' : 'checkmark-circle-outline'}
            size={18}
            color={color}
          />
          <Text style={[styles.rulingText, { color }]}>{text}</Text>
        </View>
      </View>
    );
  };

  const renderNarrator = (narrator: ChainNarrator, index: number, total: number) => (
    <TouchableOpacity
      key={`${narrator.rawiId}-${index}`}
      onPress={() => void openRawi(narrator.rawiId)}
      activeOpacity={0.7}
      accessibilityRole="button"
      style={styles.narratorRow}
    >
      <View style={styles.narratorRail}>
        <View style={[styles.narratorDot, { backgroundColor: gold }]} />
        {index < total - 1 ? <View style={[styles.narratorLine, { backgroundColor: colors.border }]} /> : null}
      </View>
      <View style={styles.narratorBody}>
        <Text
          style={[styles.narratorName, { color: textPrimary }, fontsLoaded && { fontFamily: ARABIC_FONT }]}
        >
          {narrator.name ?? `#${narrator.rawiId}`}
        </Text>
        <View style={styles.narratorMeta}>
          {narrator.rank?.value ? (
            <Text style={[styles.metaText, { color: textSecondary }]}>{narrator.rank.value}</Text>
          ) : null}
          {narrator.flags.map((flag) =>
            FLAG_KEYS[flag] ? (
              <Text key={flag} style={[styles.flagText, { color: toneColors.daif }]}>
                {t(FLAG_KEYS[flag])}
              </Text>
            ) : null
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={textMuted} />
    </TouchableOpacity>
  );

  const renderObservations = (observations: ChainObservation[]) => {
    if (observations.length === 0) return null;
    return (
      <View style={[styles.computedBlock, { borderColor: colors.border }]}>
        <View style={styles.computedHeader}>
          <Ionicons name="calculator-outline" size={14} color={textMuted} />
          <Text style={[styles.sectionLabel, { color: textMuted }]}>
            {t('hadithObservationsTitle')}
          </Text>
        </View>
        {observations.map((obs, index) => {
          const key = OBSERVATION_KEYS[obs.type];
          if (!key) return null;
          const name = obs.name ?? '';
          return (
            <Text key={`${obs.type}-${index}`} style={[styles.observationText, { color: textSecondary }]}>
              • {t(key)}
              {name ? `: ${name}` : ''}
              {obs.rank ? ` (${obs.rank})` : ''}
            </Text>
          );
        })}
        <Text style={[styles.computedNote, { color: textMuted }]}>{t('hadithComputedNote')}</Text>
      </View>
    );
  };

  const renderChain = (chain: HadithChain, index: number) => (
    <View key={chain.sanadId} style={styles.chainWrap}>
      <GlassCard padding="lg" rounded="lg">
        <View style={styles.chainHeader}>
          <Text style={[styles.chainTitle, { color: textPrimary }]}>
            {t('hadithChainTitle')} {index + 1}
          </Text>
        </View>

        {chain.hukm?.value ? (
          renderRuling(chain.hukm.value)
        ) : (
          <Text style={[styles.messageText, { color: textMuted }]}>{t('hadithNoRuling')}</Text>
        )}

        <View style={[styles.narrators, { borderTopColor: colors.border }]}>
          {chain.narrators.map((n, i) => renderNarrator(n, i, chain.narrators.length))}
        </View>

        {renderObservations(chain.observations.value)}
      </GlassCard>
    </View>
  );

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
              <Text
                style={[
                  styles.hadithText,
                  { color: textPrimary },
                  fontsLoaded && { fontFamily: ARABIC_FONT },
                ]}
              >
                {state.data.text ?? ''}
              </Text>
              {state.data.hukm?.value ? renderRuling(state.data.hukm.value) : null}
            </GlassCard>

            {state.data.chains.map(renderChain)}

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
  hadithText: {
    fontSize: 21,
    lineHeight: 38,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  section: { marginTop: spacing.sm },
  sectionLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  rulingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    alignSelf: 'flex-start',
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    marginTop: spacing.xxs,
  },
  rulingText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  chainWrap: { marginTop: spacing.sm },
  chainHeader: { marginBottom: spacing.xxs },
  chainTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, fontFamily: fontFamily.heading },
  narrators: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  narratorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  narratorRail: { width: 12, alignItems: 'center', paddingTop: 6 },
  narratorDot: { width: 8, height: 8, borderRadius: 4 },
  narratorLine: { width: StyleSheet.hairlineWidth, flex: 1, minHeight: 26, marginTop: 2 },
  narratorBody: { flex: 1, paddingBottom: spacing.sm },
  narratorName: { fontSize: fontSize.md, lineHeight: 26, textAlign: 'right', writingDirection: 'rtl' },
  narratorMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  metaText: { fontSize: fontSize.xs },
  flagText: { fontSize: fontSize.xs },
  computedBlock: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
  },
  computedHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  observationText: { fontSize: fontSize.xs, lineHeight: 20, marginTop: 2 },
  computedNote: { fontSize: fontSize.xs, fontStyle: 'italic', marginTop: spacing.xs, lineHeight: 16 },
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
