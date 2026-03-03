import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ScreenWrapper } from '../../../components/ScreenWrapper';
import { BackToHomeBar } from '../../../components/BackToHomeBar';
import { GlassCard } from '../../../components/GlassCard';
import { useTheme } from '../../../theme/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { fontFamily, fontSize, fontWeight } from '../../../theme/typography';
import { spacing } from '../../../theme/spacing';
import { getString } from '../../../constants/i18n';
import { getBukhariContentLanguage, type BukhariChapter } from '../types';
import { getBukhariChapters } from '../utils/bukhariCache';
import { loadBukhariLastRead } from '../storage/bukhariStorage';

export function BukhariChapterScreen() {
  const { colors, style: themeStyle } = useTheme();
  const isRoyal = themeStyle === 'royal';
  const { language } = useLanguage();
  const router = useRouter();
  const params = useLocalSearchParams<{ book: string }>();
  const bookId = Number.parseInt(params.book ?? '1', 10);

  const [chapters, setChapters] = useState<BukhariChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resumeChapter, setResumeChapter] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const contentLanguage = getBukhariContentLanguage(language);

  useEffect(() => {
    let active = true;
    Promise.all([loadBukhariLastRead()]).then(([lastRead]) => {
      if (!active) return;
      if (lastRead?.bookId === bookId) setResumeChapter(lastRead.chapterId);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [bookId]);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    setLoading(true);
    getBukhariChapters(contentLanguage, bookId)
      .then((next) => {
        if (!active) return;
        setChapters(next);
        setError(null);
      })
      .catch(() => {
        if (active) setError(getString(language, 'bukhariLoadError'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [ready, contentLanguage, bookId, language]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return chapters;
    return chapters.filter((chapter) => chapter.title.toLowerCase().includes(needle));
  }, [chapters, search]);

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: spacing.xxl + 48 }]}>
        <View style={styles.backWrap}>
          <BackToHomeBar />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>
          {`${getString(language, 'bukhariBook')} ${bookId}`}
        </Text>

        <TextInput
          style={[
            styles.search,
            {
              backgroundColor: isRoyal ? 'rgba(10, 25, 18, 0.72)' : colors.surfaceGlass,
              color: isRoyal ? 'rgba(255,255,255,0.95)' : colors.text,
              borderColor: isRoyal ? 'rgba(230, 194, 122, 0.28)' : colors.border,
            },
          ]}
          placeholder={getString(language, 'search')}
          placeholderTextColor={isRoyal ? 'rgba(255,255,255,0.5)' : colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />

        {resumeChapter ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push(`/bukhari/${bookId}/${resumeChapter}` as const)}
            style={styles.resumeWrap}
          >
            <GlassCard padding="md" rounded="lg" fillColor={colors.highlightGlow} strokeColor={colors.highlight}>
              <Text style={[styles.resumeText, { color: isRoyal ? 'rgba(255,255,255,0.95)' : colors.text }]}>
                {`${getString(language, 'continueReading')} • ${getString(language, 'bukhariChapter')} ${resumeChapter}`}
              </Text>
            </GlassCard>
          </TouchableOpacity>
        ) : null}

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={isRoyal ? '#E6C27A' : colors.highlight} />
          </View>
        ) : error ? (
          <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
        ) : filtered.length === 0 ? (
          <Text style={[styles.empty, { color: isRoyal ? 'rgba(255,255,255,0.6)' : colors.textMuted }]}>
            {getString(language, 'bukhariNoChapters')}
          </Text>
        ) : (
          filtered.map((chapter, index) => (
            <Animated.View key={chapter.id} entering={FadeIn.delay(index * 25).duration(220)}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.chapterTouch}
                onPress={() => router.push(`/bukhari/${bookId}/${chapter.id}` as const)}
              >
                <GlassCard padding="lg" rounded="lg">
                  <Text style={[styles.chapterTitle, { color: isRoyal ? 'rgba(255,255,255,0.95)' : colors.text }]}>
                    {chapter.title}
                  </Text>
                  <Text style={[styles.chapterMeta, { color: isRoyal ? 'rgba(255,255,255,0.6)' : colors.textMuted }]}>
                    {`${chapter.hadithCount} ${getString(language, 'bukhariHadiths')}`}
                  </Text>
                </GlassCard>
              </TouchableOpacity>
            </Animated.View>
          ))
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  backWrap: { paddingTop: spacing.sm, paddingBottom: spacing.xs },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.regular,
    fontFamily: fontFamily.heading,
    marginBottom: spacing.md,
  },
  search: {
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    fontSize: fontSize.md,
  },
  centered: { paddingVertical: spacing.xxl, alignItems: 'center' },
  resumeWrap: { marginBottom: spacing.md },
  resumeText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  chapterTouch: { marginBottom: spacing.sm },
  chapterTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, marginBottom: spacing.xxs },
  chapterMeta: { fontSize: fontSize.xs },
  error: { fontSize: fontSize.sm },
  empty: { fontSize: fontSize.sm },
});
