/**
 * Frågespel — en fråga i taget med direkt, uppmuntrande återkoppling.
 * Frågorna och svaren är arabiska; ramen runt dem följer appens språk.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../../../theme/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { ScreenWrapper } from '../../../components/ScreenWrapper';
import { BackToHomeBar } from '../../../components/BackToHomeBar';
import { GlassCard } from '../../../components/GlassCard';
import { CelebrationSparkles } from '../../../components/CelebrationSparkles';
import { getString, formatNumber } from '../../../constants/i18n';
import { spacing, radius } from '../../../theme/spacing';
import { fontSize, fontWeight, fontFamily, lineHeight } from '../../../theme/typography';
import { hapticLight, hapticSuccess, hapticSelection } from '../../../utils/haptics';
import { QUIZ_QUESTIONS, type QuizQuestion } from '../data/quizQuestions';
import { loadQuizStats, recordQuizRound, EMPTY_STATS, type QuizStats } from '../storage/quizStats';

/** Valbara omgångslängder — korta omgångar gör spelet lätt att plocka upp. */
const ROUND_LENGTHS = [5, 10, 20] as const;
const DEFAULT_LENGTH = 10;

const GOLD = '#E6C27A';
const CORRECT_GREEN = '#2F8F62';
const WRONG_RED = '#B44B4B';

const PRAISE_KEYS = ['quizPraise1', 'quizPraise2', 'quizPraise3'] as const;
const ENCOURAGE_KEYS = ['quizEncourage1', 'quizEncourage2'] as const;

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

type Phase = 'intro' | 'playing' | 'result';

/** Fråga med alternativen blandade så rätt svar inte hamnar på samma plats. */
type RoundQuestion = QuizQuestion & { shuffledOptions: string[] };

function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildRound(length: number): RoundQuestion[] {
  return shuffle(QUIZ_QUESTIONS)
    .slice(0, Math.min(length, QUIZ_QUESTIONS.length))
    .map((q) => ({ ...q, shuffledOptions: shuffle(q.options) }));
}

export function QuizScreen() {
  const { colors, style: themeStyle } = useTheme();
  const isRoyal = themeStyle === 'royal';
  const { language } = useLanguage();
  const t = useCallback(
    (key: Parameters<typeof getString>[1]) => getString(language, key),
    [language]
  );

  const cardText = isRoyal ? 'rgba(255,255,255,0.95)' : colors.textOnSurface;
  const cardTextMuted = isRoyal ? 'rgba(255,255,255,0.62)' : colors.textOnSurfaceMuted;
  const accent = isRoyal ? GOLD : colors.highlight;

  const [phase, setPhase] = useState<Phase>('intro');
  const [roundLength, setRoundLength] = useState<number>(DEFAULT_LENGTH);
  const [round, setRound] = useState<RoundQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [sparkling, setSparkling] = useState(false);
  const [stats, setStats] = useState<QuizStats>(EMPTY_STATS);
  const [isNewBest, setIsNewBest] = useState(false);

  /** Beröm väljs vid svaret, inte vid varje rendering, så texten står still. */
  const [feedbackLine, setFeedbackLine] = useState('');

  // En omgång som är på väg ut ska inte skriva in sitt resultat efter unmount.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    loadQuizStats().then((s) => {
      if (mounted.current) setStats(s);
    });
  }, []);

  const current = round[index];
  const isLast = index === round.length - 1;
  const answered = selected !== null;
  const wasCorrect = answered && selected === current?.answer;

  const startRound = useCallback(
    (length: number) => {
      hapticLight();
      setRound(buildRound(length));
      setIndex(0);
      setSelected(null);
      setScore(0);
      setStreak(0);
      setBestStreak(0);
      setIsNewBest(false);
      setFeedbackLine('');
      setPhase('playing');
    },
    []
  );

  const onSelect = useCallback(
    (option: string) => {
      if (answered || !current) return;
      const correct = option === current.answer;
      setSelected(option);
      if (correct) {
        hapticSuccess();
        setScore((s) => s + 1);
        const nextStreak = streak + 1;
        setStreak(nextStreak);
        setBestStreak((b) => Math.max(b, nextStreak));
        setSparkling(true);
        setFeedbackLine(t(pick(PRAISE_KEYS)));
      } else {
        hapticSelection();
        setStreak(0);
        setFeedbackLine(t(pick(ENCOURAGE_KEYS)));
      }
    },
    [answered, current, streak, t]
  );

  const onAdvance = useCallback(async () => {
    hapticLight();
    if (!isLast) {
      setSelected(null);
      setFeedbackLine('');
      setIndex((i) => i + 1);
      return;
    }
    setPhase('result');
    const outcome = await recordQuizRound(score, round.length);
    if (!mounted.current) return;
    setStats(outcome.stats);
    setIsNewBest(outcome.isNewBest && score > 0);
  }, [isLast, score, round.length]);

  const resultHeadline = useMemo(() => {
    if (round.length === 0) return t('quizResultKeep');
    const share = score / round.length;
    if (share === 1) return t('quizResultPerfect');
    if (share >= 0.7) return t('quizResultGreat');
    if (share >= 0.4) return t('quizResultGood');
    return t('quizResultKeep');
  }, [score, round.length, t]);

  const progressLabel = t('quizQuestionOf')
    .replace('{current}', formatNumber(language, index + 1))
    .replace('{total}', formatNumber(language, round.length));

  const scoreLabel = t('quizYouScored')
    .replace('{score}', formatNumber(language, score))
    .replace('{total}', formatNumber(language, round.length));

  const bestLabel =
    stats.bestOutOf > 0
      ? `${formatNumber(language, stats.bestScore)}/${formatNumber(language, stats.bestOutOf)}`
      : '—';

  /** Liten sifferbricka: rubrik över värde, används för poäng/radda/rekord. */
  const renderStat = (label: string, value: string, highlight?: boolean) => (
    <View style={styles.stat}>
      <Text style={[styles.statLabel, { color: cardTextMuted }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.statValue, { color: highlight ? accent : cardText }]}>{value}</Text>
    </View>
  );

  const renderIntro = () => (
    <Animated.View entering={FadeIn.duration(320)} style={styles.section}>
      <GlassCard padding="lg" rounded="lg" fillContent={false}>
        <Text style={[styles.introTitle, { color: cardText }]}>{t('quizTitle')}</Text>
        <Text style={[styles.introBody, { color: cardTextMuted }]}>{t('quizSubtitle')}</Text>

        <View style={styles.statRow}>
          {renderStat(t('quizBestLabel'), bestLabel, true)}
          {renderStat(t('quizRoundsLabel'), formatNumber(language, stats.roundsPlayed))}
          {renderStat(t('quizTotalCorrect'), formatNumber(language, stats.totalCorrect))}
        </View>

        <Text style={[styles.pickerLabel, { color: cardTextMuted }]}>{t('quizRoundLength')}</Text>
        <View style={styles.pillRow}>
          {ROUND_LENGTHS.map((n) => {
            const active = n === roundLength;
            return (
              <Pressable
                key={n}
                onPress={() => {
                  hapticSelection();
                  setRoundLength(n);
                }}
                style={[
                  styles.pill,
                  {
                    borderColor: active ? accent : isRoyal ? 'rgba(255,255,255,0.2)' : colors.border,
                    backgroundColor: active
                      ? isRoyal
                        ? 'rgba(230,194,122,0.18)'
                        : colors.highlightGlow
                      : 'transparent',
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${t('quizRoundLength')}: ${n}`}
              >
                <Text
                  style={[styles.pillText, { color: active ? accent : cardTextMuted }]}
                >
                  {formatNumber(language, n)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => startRound(roundLength)}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: accent, opacity: pressed ? 0.85 : 1 },
          ]}
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonText}>{t('quizStart')}</Text>
        </Pressable>
      </GlassCard>
    </Animated.View>
  );

  const optionColors = (option: string) => {
    if (!answered) {
      return {
        border: isRoyal ? 'rgba(255,255,255,0.18)' : colors.border,
        background: 'transparent',
        text: cardText,
        mark: '',
      };
    }
    if (option === current?.answer) {
      return {
        border: CORRECT_GREEN,
        background: 'rgba(47,143,98,0.18)',
        text: cardText,
        mark: '✓',
      };
    }
    if (option === selected) {
      return {
        border: WRONG_RED,
        background: 'rgba(180,75,75,0.16)',
        text: cardText,
        mark: '✕',
      };
    }
    return {
      border: isRoyal ? 'rgba(255,255,255,0.1)' : colors.border,
      background: 'transparent',
      text: cardTextMuted,
      mark: '',
    };
  };

  const renderPlaying = () => {
    if (!current) return null;
    const progress = round.length > 0 ? (index + (answered ? 1 : 0)) / round.length : 0;
    return (
      <View style={styles.section}>
        <View style={styles.metaRow}>
          <Text style={[styles.progressText, { color: colors.textMuted }]}>{progressLabel}</Text>
          {streak >= 2 && (
            <Animated.View entering={FadeIn.duration(200)} style={styles.streakChip}>
              <Text style={[styles.streakText, { color: accent }]}>
                🔥 {formatNumber(language, streak)}
              </Text>
            </Animated.View>
          )}
        </View>

        <View style={[styles.track, { backgroundColor: isRoyal ? 'rgba(255,255,255,0.14)' : colors.border }]}>
          <View
            style={[
              styles.trackFill,
              { width: `${Math.round(progress * 100)}%`, backgroundColor: accent },
            ]}
          />
        </View>

        <Animated.View key={current.id} entering={FadeInDown.duration(300)}>
          <GlassCard padding="lg" rounded="lg" fillContent={false} style={styles.questionCard}>
            <Text style={[styles.questionText, { color: cardText }]}>{current.question}</Text>
          </GlassCard>

          <View style={styles.options}>
            {current.shuffledOptions.map((option) => {
              const c = optionColors(option);
              return (
                <Pressable
                  key={option}
                  onPress={() => onSelect(option)}
                  disabled={answered}
                  style={({ pressed }) => [
                    styles.option,
                    {
                      borderColor: c.border,
                      backgroundColor: c.background,
                      opacity: pressed && !answered ? 0.7 : 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={option}
                >
                  <Text style={[styles.optionText, { color: c.text }]}>{option}</Text>
                  {c.mark !== '' && (
                    <Text
                      style={[
                        styles.optionMark,
                        { color: option === current.answer ? CORRECT_GREEN : WRONG_RED },
                      ]}
                    >
                      {c.mark}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {answered && (
          <Animated.View entering={FadeIn.duration(220)} style={styles.feedback}>
            <Text
              style={[styles.feedbackTitle, { color: wasCorrect ? CORRECT_GREEN : accent }]}
            >
              {wasCorrect ? t('quizCorrect') : t('quizAlmost')}
            </Text>
            <Text style={[styles.feedbackLine, { color: colors.textSecondary }]}>
              {feedbackLine}
            </Text>
            {!wasCorrect && (
              <Text style={[styles.feedbackAnswer, { color: colors.text }]}>
                {t('quizCorrectAnswer')}: {current.answer}
              </Text>
            )}
            <Pressable
              onPress={onAdvance}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: accent, opacity: pressed ? 0.85 : 1 },
              ]}
              accessibilityRole="button"
            >
              <Text style={styles.primaryButtonText}>
                {isLast ? t('quizSeeResult') : t('quizNext')}
              </Text>
            </Pressable>
          </Animated.View>
        )}
      </View>
    );
  };

  const renderResult = () => (
    <Animated.View entering={FadeIn.duration(320)} style={styles.section}>
      <GlassCard padding="lg" rounded="lg" fillContent={false}>
        <Text style={[styles.resultHeadline, { color: accent }]}>{resultHeadline}</Text>
        <Text style={[styles.resultScore, { color: cardText }]}>{scoreLabel}</Text>
        {isNewBest && (
          <Animated.Text
            entering={FadeInDown.duration(320)}
            style={[styles.newBest, { color: CORRECT_GREEN }]}
          >
            ★ {t('quizNewBest')}
          </Animated.Text>
        )}

        <View style={styles.statRow}>
          {renderStat(t('quizStreakLabel'), formatNumber(language, bestStreak), true)}
          {renderStat(t('quizBestLabel'), bestLabel)}
          {renderStat(t('quizRoundsLabel'), formatNumber(language, stats.roundsPlayed))}
        </View>

        <Pressable
          onPress={() => startRound(roundLength)}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: accent, opacity: pressed ? 0.85 : 1 },
          ]}
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonText}>{t('quizPlayAgain')}</Text>
        </Pressable>
      </GlassCard>
    </Animated.View>
  );

  return (
    <ScreenWrapper>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <BackToHomeBar />
        <Text style={[styles.title, { color: colors.text }]}>{t('quizTitle')}</Text>
        {phase === 'intro' && renderIntro()}
        {phase === 'playing' && renderPlaying()}
        {phase === 'result' && renderResult()}
      </ScrollView>
      <CelebrationSparkles visible={sparkling} onComplete={() => setSparkling(false)} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl + 72,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.regular,
    fontFamily: fontFamily.heading,
    marginBottom: spacing.md,
  },
  section: { gap: spacing.sm },

  introTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    fontFamily: fontFamily.heading,
  },
  introBody: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * lineHeight.relaxed,
  },

  statRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  stat: { flex: 1, minWidth: 0 },
  statLabel: { fontSize: fontSize.xs },
  statValue: {
    marginTop: 2,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },

  pickerLabel: { marginTop: spacing.md, fontSize: fontSize.xs },
  pillRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  pill: {
    minWidth: 56,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },

  primaryButton: {
    marginTop: spacing.md,
    minHeight: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },
  primaryButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: '#0B2419',
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 24,
  },
  progressText: { fontSize: fontSize.xs },
  streakChip: { paddingHorizontal: spacing.xs },
  streakText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  track: {
    height: 6,
    borderRadius: radius.pill,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  trackFill: { height: '100%', borderRadius: radius.pill },

  questionCard: { marginBottom: spacing.sm },
  questionText: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.arabic,
    lineHeight: fontSize.lg * lineHeight.relaxed,
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  options: { gap: spacing.xs },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 52,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  optionText: {
    flex: 1,
    fontSize: fontSize.md,
    fontFamily: fontFamily.arabic,
    lineHeight: fontSize.md * lineHeight.normal,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  optionMark: { fontSize: fontSize.md, fontWeight: fontWeight.bold },

  feedback: { marginTop: spacing.sm },
  feedbackTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  feedbackLine: {
    marginTop: 2,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * lineHeight.relaxed,
  },
  feedbackAnswer: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.arabic,
    lineHeight: fontSize.sm * lineHeight.relaxed,
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  resultHeadline: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    fontFamily: fontFamily.heading,
  },
  resultScore: {
    marginTop: spacing.xs,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  newBest: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});
