/**
 * Quran page view — the printed mushaf, one page at a time (1–604).
 *
 * Each page is rendered with its own QCF font so the lines break where the
 * printed mushaf breaks them, and the verse being recited is highlighted and
 * followed as playback moves through the page. Three page styles are offered
 * (paper / night / royal), all free.
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
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useFonts, Amiri_400Regular } from '@expo-google-fonts/amiri';
import { useTheme } from '../../../theme/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { ScreenWrapper } from '../../../components/ScreenWrapper';
import { BackBar } from '../../../components/BackBar';
import { getString } from '../../../constants/i18n';
import { getTotalPages } from '../data/quranPageMapping';
import { getMushafPage, type MushafPageData } from '../api/mushafPage';
import { ensurePageFont, prefetchPageFont } from '../utils/qcfFont';
import { MushafPage, PageStyleSwatch, getMushafTheme } from '../components/MushafPage';
import {
  loadQuranPageStyle,
  saveQuranPageStyle,
  QURAN_PAGE_STYLES,
  type QuranPageStyle,
} from '../storage/quranStorage';
import { useQuranAudioContext } from '../context/QuranAudioContext';
import { hapticLight } from '../../../utils/haptics';
import { spacing, radius } from '../../../theme/spacing';
import { fontSize } from '../../../theme/typography';

const TOTAL_PAGES = getTotalPages();
const SLIDE_DURATION_MS = 280;
const PAGE_MARGIN = spacing.md;

/** Loaded pages kept at module level so page turns are instant on return. */
const pageCache: Record<number, MushafPageData> = {};
/** Pages whose QCF font is registered in this session. */
const fontReadyPages = new Set<number>();

type PanelProps = {
  data: MushafPageData;
  panelKey: string;
  windowWidth: number;
  pageStyle: QuranPageStyle;
  fontReady: boolean;
  activeVerseKey: string | null;
  onPressVerse?: (verseKey: string) => void;
};

const PagePanel = memo(function PagePanel({
  data,
  panelKey,
  windowWidth,
  pageStyle,
  fontReady,
  activeVerseKey,
  onPressVerse,
}: PanelProps) {
  const contentWidth = windowWidth - PAGE_MARGIN * 2 - spacing.sm * 2;
  return (
    <ScrollView
      key={panelKey}
      style={[styles.panelScroll, { width: windowWidth }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <MushafPage
        data={data}
        activeVerseKey={activeVerseKey}
        pageStyle={pageStyle}
        contentWidth={contentWidth}
        fontReady={fontReady}
        onPressVerse={onPressVerse}
      />
    </ScrollView>
  );
});

/** Page data plus its font, so a page is only shown once both are ready. */
async function loadPage(page: number): Promise<MushafPageData | null> {
  const data = pageCache[page] ?? (await getMushafPage(page));
  if (!data) return null;
  pageCache[page] = data;
  if (await ensurePageFont(page)) fontReadyPages.add(page);
  return data;
}

export function QuranPageViewScreen() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const { width: windowWidth } = useWindowDimensions();
  const params = useLocalSearchParams<{ page?: string }>();
  const initialPage = Math.max(1, Math.min(TOTAL_PAGES, parseInt(params.page ?? '1', 10) || 1));
  const [fontsLoaded] = useFonts({ Amiri_400Regular });

  const { state: audioState, playFromAyah, pause } = useQuranAudioContext();

  type PageState = {
    displayPage: number;
    data: MushafPageData | null;
    incomingPage: number | null;
    incomingData: MushafPageData | null;
  };
  const [pageState, setPageState] = useState<PageState>({
    displayPage: initialPage,
    data: null,
    incomingPage: null,
    incomingData: null,
  });
  const { displayPage, data, incomingPage, incomingData } = pageState;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageStyle, setPageStyle] = useState<QuranPageStyle>('paper');
  const [showStyles, setShowStyles] = useState(false);
  /** Bumped when a font finishes registering, to re-render with real glyphs. */
  const [fontTick, setFontTick] = useState(0);
  const turningRef = useRef(false);

  const incomingX = useSharedValue(windowWidth);

  useEffect(() => {
    loadQuranPageStyle().then(setPageStyle);
  }, []);

  const fetchPage = useCallback(async (page: number) => {
    setLoading(true);
    setError(null);
    const result = await loadPage(page);
    if (result) {
      setPageState((prev) => ({ ...prev, data: result }));
      setFontTick((n) => n + 1);
    } else {
      setError(getString(language, 'quranLoadError'));
      setPageState((prev) => ({ ...prev, data: null }));
    }
    setLoading(false);
  }, [language]);

  useEffect(() => {
    setPageState({ displayPage: initialPage, data: null, incomingPage: null, incomingData: null });
    void fetchPage(initialPage);
  }, [initialPage, fetchPage]);

  // Warm the neighbours so a page turn does not wait on the network.
  useEffect(() => {
    if (!data || loading) return;
    for (const page of [displayPage + 1, displayPage - 1]) {
      if (page < 1 || page > TOTAL_PAGES || pageCache[page]) continue;
      void getMushafPage(page).then((d) => {
        if (d) pageCache[page] = d;
      });
      prefetchPageFont(page);
    }
  }, [displayPage, data, loading]);

  const finishTransition = useCallback((nextPage: number, nextData: MushafPageData) => {
    setPageState({
      displayPage: nextPage,
      data: nextData,
      incomingPage: null,
      incomingData: null,
    });
    turningRef.current = false;
  }, []);

  const turnTo = useCallback(
    async (nextPage: number, direction: 1 | -1) => {
      if (nextPage < 1 || nextPage > TOTAL_PAGES) return;
      if (incomingPage != null || turningRef.current) return;
      turningRef.current = true;
      const nextData = await loadPage(nextPage);
      if (!nextData) {
        turningRef.current = false;
        setError(getString(language, 'quranLoadError'));
        return;
      }
      setPageState((prev) => ({ ...prev, incomingPage: nextPage, incomingData: nextData }));
      incomingX.value = direction * windowWidth;
      incomingX.value = withTiming(
        0,
        { duration: SLIDE_DURATION_MS, easing: Easing.out(Easing.cubic) },
        () => {
          runOnJS(finishTransition)(nextPage, nextData);
        }
      );
    },
    [incomingPage, incomingX, windowWidth, finishTransition, language]
  );

  const pickStyle = useCallback(async (style: QuranPageStyle) => {
    await hapticLight();
    setPageStyle(style);
    await saveQuranPageStyle(style);
  }, []);

  /** Tapping a verse starts (or pauses) recitation from that verse. */
  const handlePressVerse = useCallback(
    (verseKey: string) => {
      const [surah, ayah] = verseKey.split(':').map(Number);
      if (!surah || !ayah) return;
      const isThisVerse =
        audioState.currentSurah === surah && audioState.currentAyah === ayah;
      if (isThisVerse && audioState.isPlaying) {
        pause();
        return;
      }
      void playFromAyah(surah, ayah);
    },
    [audioState.currentSurah, audioState.currentAyah, audioState.isPlaying, playFromAyah, pause]
  );

  const activeVerseKey =
    audioState.currentSurah != null && audioState.currentAyah != null
      ? `${audioState.currentSurah}:${audioState.currentAyah}`
      : null;

  // Follow the recitation across page boundaries: when the verse being recited
  // is not on this page but is on the next one, turn the page.
  useEffect(() => {
    if (!activeVerseKey || !data || incomingPage != null) return;
    if (data.verseKeys.includes(activeVerseKey)) return;
    const next = pageCache[displayPage + 1];
    if (next?.verseKeys.includes(activeVerseKey)) {
      void turnTo(displayPage + 1, 1);
    }
  }, [activeVerseKey, data, displayPage, incomingPage, turnTo]);

  const theme = getMushafTheme(pageStyle);
  const pageLabel = getString(language, 'quranPageLabel');
  const fontReady = fontReadyPages.has(displayPage) && fontsLoaded;

  const incomingPanelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: incomingX.value }],
  }));

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <BackBar />
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => void turnTo(displayPage - 1, -1)}
            disabled={displayPage <= 1 || loading || incomingPage != null}
            style={styles.navBtn}
            accessibilityRole="button"
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={displayPage <= 1 ? colors.textMuted : colors.text}
            />
          </TouchableOpacity>
          <Text style={[styles.pageTitle, { color: colors.text }]}>
            {pageLabel} {displayPage} / {TOTAL_PAGES}
          </Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => setShowStyles((v) => !v)}
              style={styles.navBtn}
              accessibilityRole="button"
              accessibilityLabel={getString(language, 'quranPageStyle')}
            >
              <Ionicons
                name="color-palette-outline"
                size={22}
                color={showStyles ? colors.highlight : colors.text}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => void turnTo(displayPage + 1, 1)}
              disabled={displayPage >= TOTAL_PAGES || loading || incomingPage != null}
              style={styles.navBtn}
              accessibilityRole="button"
            >
              <Ionicons
                name="chevron-forward"
                size={24}
                color={displayPage >= TOTAL_PAGES ? colors.textMuted : colors.text}
              />
            </TouchableOpacity>
          </View>
        </View>

        {showStyles && (
          <View style={[styles.styleRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.styleLabel, { color: colors.textMuted }]}>
              {getString(language, 'quranPageStyle')}
            </Text>
            {QURAN_PAGE_STYLES.map((style) => (
              <PageStyleSwatch
                key={style}
                pageStyle={style}
                selected={pageStyle === style}
                onPress={() => void pickStyle(style)}
              />
            ))}
          </View>
        )}

        {loading && !data ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.highlight} />
          </View>
        ) : error && !data ? (
          <View style={styles.centered}>
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            <TouchableOpacity
              onPress={() => void fetchPage(displayPage)}
              style={[styles.retryBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.retryText, { color: colors.text }]}>
                {getString(language, 'retry')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : data ? (
          <View style={[styles.slider, { width: windowWidth, backgroundColor: theme.pageBg }]}>
            <View key="current" style={[styles.panel, { width: windowWidth }]} collapsable={false}>
              <PagePanel
                data={data}
                panelKey={`current-${displayPage}-${fontTick}`}
                windowWidth={windowWidth}
                pageStyle={pageStyle}
                fontReady={fontReady}
                activeVerseKey={activeVerseKey}
                onPressVerse={handlePressVerse}
              />
            </View>
            {incomingPage != null && incomingData != null && (
              <Animated.View
                key="incoming"
                style={[styles.panel, styles.panelAbsolute, { width: windowWidth }, incomingPanelStyle]}
                pointerEvents="none"
                collapsable={false}
              >
                <PagePanel
                  data={incomingData}
                  panelKey={`incoming-${incomingPage}`}
                  windowWidth={windowWidth}
                  pageStyle={pageStyle}
                  fontReady={fontReadyPages.has(incomingPage) && fontsLoaded}
                  activeVerseKey={activeVerseKey}
                />
              </Animated.View>
            )}
          </View>
        ) : null}
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
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  navBtn: { padding: spacing.xs, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: fontSize.sm, fontWeight: '600' },
  styleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  styleLabel: { flex: 1, fontSize: fontSize.xs },
  slider: { flex: 1, overflow: 'hidden' },
  panel: { flex: 1 },
  panelAbsolute: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  panelScroll: { flex: 1 },
  scrollContent: { padding: PAGE_MARGIN, paddingBottom: spacing.xxl },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: fontSize.sm, textAlign: 'center', paddingHorizontal: spacing.lg },
  retryBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  retryText: { fontSize: fontSize.sm },
});
