/**
 * Quran page view (mushaf layout) — one page at a time (1–604).
 * Slide animation when changing page; preloads adjacent pages for instant turn.
 */
import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../theme/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { ScreenWrapper } from '../../../components/ScreenWrapper';
import { BackBar } from '../../../components/BackBar';
import { getString } from '../../../constants/i18n';
import { getVersesForPage, getTotalPages } from '../data/quranPageMapping';
import { getSurahText } from '../utils/quranTextCache';
import { spacing, radius } from '../../../theme/spacing';
import { fontSize, fontFamily } from '../../../theme/typography';

const TOTAL_PAGES = getTotalPages();
const PAGE_BG_LIGHT = '#f3e7d6';
const PAGE_BG_ROYAL = 'rgba(10, 25, 18, 0.92)';
const TEXT_ON_LIGHT = '#1a1a1a';
const TEXT_MUTED_ON_LIGHT = 'rgba(30, 25, 20, 0.75)';
const SLIDE_DURATION_MS = 280;

/** Page cache at module level so it survives remount. */
const pageCache: Record<number, VerseRow[]> = {};

type VerseRow = { surah: number; ayah: number; ar?: string; en?: string };

type PagePanelContentProps = {
  list: VerseRow[];
  panelKey: string;
  windowWidth: number;
  pageBg: string;
  textMuted: string;
  textPrimary: string;
  language: string;
};

const PagePanelContent = memo(function PagePanelContent({
  list,
  panelKey,
  windowWidth,
  pageBg,
  textMuted,
  textPrimary,
  language,
}: PagePanelContentProps) {
  return (
    <ScrollView
      key={panelKey}
      style={[styles.panelScroll, { width: windowWidth }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.pageSurface, { backgroundColor: pageBg }]}>
        {list.map((v, i) => (
          <View key={`${v.surah}-${v.ayah}-${i}`} style={styles.verseRow}>
            <Text style={[styles.verseNum, { color: textMuted }]}>{v.ayah}</Text>
            <Text style={[styles.verseAr, { color: textPrimary }, language === 'ar' && styles.verseArRtl]}>
              {v.ar ?? '…'}
            </Text>
            {v.en != null && language !== 'ar' && (
              <Text style={[styles.verseEn, { color: textMuted }]}>{v.en}</Text>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
});

async function loadPageData(page: number): Promise<VerseRow[]> {
  const refs = getVersesForPage(page);
  const surahs = [...new Set(refs.map((r) => r.surah))];
  const texts: Record<number, Record<number, { ar?: string; en?: string }>> = {};
  for (const s of surahs) {
    const t = await getSurahText(s);
    if (t) texts[s] = t;
  }
  return refs.map((r) => {
    const row = texts[r.surah]?.[r.ayah];
    return { surah: r.surah, ayah: r.ayah, ar: row?.ar, en: row?.en };
  });
}

export function QuranPageViewScreen() {
  const { colors, style: themeStyle } = useTheme();
  const isRoyal = themeStyle === 'royal';
  const { language } = useLanguage();
  const { width: windowWidth } = useWindowDimensions();
  const params = useLocalSearchParams<{ page?: string }>();
  const initialPage = Math.max(1, Math.min(TOTAL_PAGES, parseInt(params.page ?? '1', 10) || 1));

  type PageState = {
    displayPage: number;
    verses: VerseRow[];
    incomingPage: number | null;
    incomingVerses: VerseRow[] | null;
  };
  const [pageState, setPageState] = useState<PageState>({
    displayPage: initialPage,
    verses: [],
    incomingPage: null,
    incomingVerses: null,
  });
  const { displayPage, verses, incomingPage, incomingVerses } = pageState;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadingAdjacentRef = useRef(false);

  const incomingX = useSharedValue(windowWidth);

  const loadPage = useCallback(async (page: number) => {
    setLoading(true);
    setError(null);
    try {
      const list = await loadPageData(page);
      pageCache[page] = list;
      setPageState((prev) => ({ ...prev, verses: list }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load page');
      setPageState((prev) => ({ ...prev, verses: [] }));
    } finally {
      setLoading(false);
    }
  }, []);

  const preloadPage = useCallback((page: number) => {
    if (page < 1 || page > TOTAL_PAGES || pageCache[page] != null) return;
    loadPageData(page).then((list) => {
      pageCache[page] = list;
    });
  }, []);

  useEffect(() => {
    setPageState((prev) => ({ ...prev, displayPage: initialPage, incomingPage: null, incomingVerses: null }));
    loadPage(initialPage);
  }, [initialPage, loadPage]);

  useEffect(() => {
    if (verses.length > 0 && !loading) {
      preloadPage(displayPage + 1);
      preloadPage(displayPage - 1);
    }
  }, [displayPage, verses.length, loading, preloadPage]);

  const finishTransition = useCallback(
    (nextPage: number, nextVerses: VerseRow[]) => {
      setPageState({
        displayPage: nextPage,
        verses: nextVerses,
        incomingPage: null,
        incomingVerses: null,
      });
      preloadPage(nextPage + 1);
      preloadPage(nextPage - 1);
    },
    [preloadPage]
  );

  const goNext = useCallback(() => {
    if (displayPage >= TOTAL_PAGES || incomingPage != null || loadingAdjacentRef.current) return;
    const nextPage = displayPage + 1;
    const cached = pageCache[nextPage];
    if (cached) {
      setPageState((prev) => ({ ...prev, incomingPage: nextPage, incomingVerses: cached }));
      incomingX.value = windowWidth;
      incomingX.value = withTiming(
        0,
        { duration: SLIDE_DURATION_MS, easing: Easing.out(Easing.cubic) },
        () => {
          runOnJS(finishTransition)(nextPage, cached);
        }
      );
    } else {
      loadingAdjacentRef.current = true;
      loadPageData(nextPage).then((list) => {
        pageCache[nextPage] = list;
        loadingAdjacentRef.current = false;
        setPageState((prev) => ({ ...prev, incomingPage: nextPage, incomingVerses: list }));
        incomingX.value = windowWidth;
        incomingX.value = withTiming(
          0,
          { duration: SLIDE_DURATION_MS, easing: Easing.out(Easing.cubic) },
          () => {
            runOnJS(finishTransition)(nextPage, list);
          }
        );
      });
    }
  }, [displayPage, incomingPage, finishTransition, incomingX, windowWidth]);

  const goPrev = useCallback(() => {
    if (displayPage <= 1 || incomingPage != null || loadingAdjacentRef.current) return;
    const prevPage = displayPage - 1;
    const cached = pageCache[prevPage];
    if (cached) {
      setPageState((prev) => ({ ...prev, incomingPage: prevPage, incomingVerses: cached }));
      incomingX.value = -windowWidth;
      incomingX.value = withTiming(
        0,
        { duration: SLIDE_DURATION_MS, easing: Easing.out(Easing.cubic) },
        () => {
          runOnJS(finishTransition)(prevPage, cached);
        }
      );
    } else {
      loadingAdjacentRef.current = true;
      loadPageData(prevPage).then((list) => {
        pageCache[prevPage] = list;
        loadingAdjacentRef.current = false;
        setPageState((prev) => ({ ...prev, incomingPage: prevPage, incomingVerses: list }));
        incomingX.value = -windowWidth;
        incomingX.value = withTiming(
          0,
          { duration: SLIDE_DURATION_MS, easing: Easing.out(Easing.cubic) },
          () => {
            runOnJS(finishTransition)(prevPage, list);
          }
        );
      });
    }
  }, [displayPage, incomingPage, finishTransition, incomingX, windowWidth]);

  const pageLabel = getString(language, 'quranPageLabel');
  const pageBg = isRoyal ? PAGE_BG_ROYAL : PAGE_BG_LIGHT;
  const textPrimary = isRoyal ? 'rgba(255,255,255,0.95)' : TEXT_ON_LIGHT;
  const textMuted = isRoyal ? 'rgba(255,255,255,0.6)' : TEXT_MUTED_ON_LIGHT;

  const incomingPanelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: incomingX.value }],
  }));

  const panelContentProps = {
    windowWidth,
    pageBg,
    textMuted,
    textPrimary,
    language,
  };

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <BackBar />
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={goPrev}
            disabled={displayPage <= 1 || loading || incomingPage != null}
            style={styles.navBtn}
          >
            <Text
              style={[
                styles.navBtnText,
                { color: displayPage <= 1 || incomingPage != null ? textMuted : textPrimary },
              ]}
            >
              ←
            </Text>
          </TouchableOpacity>
          <Text style={[styles.pageTitle, { color: textPrimary }]}>
            {pageLabel} {displayPage} / {TOTAL_PAGES}
          </Text>
          <TouchableOpacity
            onPress={goNext}
            disabled={displayPage >= TOTAL_PAGES || loading || incomingPage != null}
            style={styles.navBtn}
          >
            <Text
              style={[
                styles.navBtnText,
                { color: displayPage >= TOTAL_PAGES || incomingPage != null ? textMuted : textPrimary },
              ]}
            >
              →
            </Text>
          </TouchableOpacity>
        </View>
        {loading && verses.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.highlight} />
          </View>
        ) : error && verses.length === 0 ? (
          <View style={styles.centered}>
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        ) : (
          <View style={[styles.slider, { width: windowWidth }]}>
            <View
              key="current"
              style={[styles.panel, { width: windowWidth }]}
              collapsable={false}
            >
              {verses.length > 0 && (
                <PagePanelContent list={verses} panelKey="current" {...panelContentProps} />
              )}
            </View>
            {incomingPage != null && incomingVerses != null && (
              <Animated.View
                key="incoming"
                style={[styles.panel, styles.panelAbsolute, { width: windowWidth }, incomingPanelStyle]}
                pointerEvents="none"
                collapsable={false}
              >
                <PagePanelContent list={incomingVerses} panelKey="incoming" {...panelContentProps} />
              </Animated.View>
            )}
          </View>
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn: { padding: spacing.sm },
  navBtnText: { fontSize: fontSize.lg },
  pageTitle: { fontSize: fontSize.md, fontWeight: '600' },
  slider: {
    flex: 1,
    overflow: 'hidden',
  },
  panel: {
    flex: 1,
  },
  panelAbsolute: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  panelScroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  pageSurface: {
    borderRadius: 12,
    padding: spacing.lg,
    paddingVertical: spacing.xl,
    minHeight: 200,
  },
  verseRow: { marginBottom: spacing.sm },
  verseNum: { fontSize: fontSize.xs, marginBottom: 2 },
  verseAr: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.arabic,
    lineHeight: fontSize.lg * 1.8,
  },
  verseArRtl: { textAlign: 'right' },
  verseEn: { fontSize: fontSize.sm, marginTop: 2, fontStyle: 'italic' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: fontSize.sm },
});
