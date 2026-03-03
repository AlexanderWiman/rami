import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ScreenWrapper } from '../../../components/ScreenWrapper';
import { BackToHomeBar } from '../../../components/BackToHomeBar';
import { GlassCard } from '../../../components/GlassCard';
import { useDockVisibility } from '../../../components/SacredDock';
import { useTheme } from '../../../theme/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { fontFamily, fontSize, fontWeight } from '../../../theme/typography';
import { spacing } from '../../../theme/spacing';
import { getString } from '../../../constants/i18n';
import { getBukhariContentLanguage, type BukhariBook } from '../types';
import { getBukhariBooks, prefetchPopularBooks } from '../utils/bukhariCache';
import { loadBukhariLastRead } from '../storage/bukhariStorage';

const SCROLL_UP_THRESHOLD = 30;
const lastScrollY = { current: 0 };

export function BukhariListScreen() {
  const { colors, style: themeStyle } = useTheme();
  const isRoyal = themeStyle === 'royal';
  const { language } = useLanguage();
  const router = useRouter();
  const { showDock } = useDockVisibility();

  const [books, setBooks] = useState<BukhariBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastRead, setLastRead] = useState<{ bookId: number; chapterId: number; hadithNumber: number } | null>(
    null
  );
  const [ready, setReady] = useState(false);
  const contentLanguage = getBukhariContentLanguage(language);

  const loadBooks = useCallback(
    async (forceRefresh = false) => {
      try {
        setError(null);
        const next = await getBukhariBooks(contentLanguage, { forceRefresh });
        setBooks(next);
        void prefetchPopularBooks(
          contentLanguage,
          next
            .slice(0, 3)
            .map((book) => book.id)
        );
      } catch {
        setError(getString(language, 'bukhariLoadError'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [contentLanguage, language]
  );

  useEffect(() => {
    let mounted = true;
    Promise.all([loadBukhariLastRead()])
      .then(([storedLastRead]) => {
        if (!mounted) return;
        if (storedLastRead) {
          setLastRead({
            bookId: storedLastRead.bookId,
            chapterId: storedLastRead.chapterId,
            hadithNumber: storedLastRead.hadithNumber,
          });
        }
      })
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    void loadBooks();
  }, [contentLanguage, loadBooks, ready]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadBooks(true);
  }, [loadBooks]);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      if (y < lastScrollY.current - SCROLL_UP_THRESHOLD && y > 50) showDock();
      lastScrollY.current = y;
    },
    [showDock]
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return books;
    return books.filter((book) => book.title.toLowerCase().includes(needle));
  }, [books, search]);

  return (
    <ScreenWrapper>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: spacing.xxl + 72 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={80}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isRoyal ? '#E6C27A' : colors.highlight}
          />
        }
      >
        <View style={styles.header}>
          <BackToHomeBar />
          <Text style={[styles.title, { color: colors.text }]}>{getString(language, 'bukhariTitle')}</Text>
        </View>

        <Text style={[styles.subtitle, { color: isRoyal ? 'rgba(255,255,255,0.65)' : colors.textMuted }]}>
          {getString(language, 'bukhariSubtitle')}
        </Text>

        {lastRead && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() =>
              router.push(`/bukhari/${lastRead.bookId}/${lastRead.chapterId}?hadith=${lastRead.hadithNumber}` as const)
            }
            style={styles.continueWrap}
          >
            <GlassCard padding="lg" rounded="lg" fillColor={colors.highlightGlow} strokeColor={colors.highlight}>
              <Text style={[styles.continueLabel, { color: isRoyal ? 'rgba(255,255,255,0.7)' : colors.textMuted }]}>
                {getString(language, 'continueReading')}
              </Text>
              <Text style={[styles.continueText, { color: isRoyal ? 'rgba(255,255,255,0.95)' : colors.text }]}>
                {`${getString(language, 'bukhariBook')} ${lastRead.bookId} • ${getString(language, 'bukhariChapter')} ${lastRead.chapterId} • #${lastRead.hadithNumber}`}
              </Text>
            </GlassCard>
          </TouchableOpacity>
        )}

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

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={isRoyal ? '#E6C27A' : colors.highlight} />
          </View>
        ) : error ? (
          <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
        ) : filtered.length === 0 ? (
          <Text style={[styles.empty, { color: isRoyal ? 'rgba(255,255,255,0.6)' : colors.textMuted }]}>
            {getString(language, 'bukhariNoBooks')}
          </Text>
        ) : (
          filtered.map((book, index) => (
            <Animated.View key={book.id} entering={FadeIn.delay(index * 30).duration(250)}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.bookTouch}
                onPress={() => router.push(`/bukhari/${book.id}` as const)}
              >
                <GlassCard padding="lg" rounded="lg">
                  <Text style={[styles.bookTitle, { color: isRoyal ? 'rgba(255,255,255,0.95)' : colors.text }]}>
                    {book.title}
                  </Text>
                  <Text style={[styles.bookMeta, { color: isRoyal ? 'rgba(255,255,255,0.6)' : colors.textMuted }]}>
                    {`${book.chapterCount} ${getString(language, 'bukhariChapters')} • ${book.hadithCount} ${getString(language, 'bukhariHadiths')}`}
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
  header: { paddingTop: spacing.lg, paddingBottom: spacing.xs },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.regular, fontFamily: fontFamily.heading },
  subtitle: { fontSize: fontSize.sm, marginBottom: spacing.md },
  continueWrap: { marginBottom: spacing.md },
  continueLabel: { fontSize: fontSize.xs, marginBottom: spacing.xxs },
  continueText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  search: {
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    fontSize: fontSize.md,
  },
  centered: { paddingVertical: spacing.xxl, alignItems: 'center' },
  error: { fontSize: fontSize.sm, marginTop: spacing.sm },
  empty: { fontSize: fontSize.sm, marginTop: spacing.sm },
  bookTouch: { marginBottom: spacing.sm },
  bookTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, marginBottom: spacing.xxs },
  bookMeta: { fontSize: fontSize.xs },
});
