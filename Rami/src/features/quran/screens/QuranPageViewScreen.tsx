/**
 * Quran page view — the printed mushaf, one page at a time (1–604).
 *
 * Each page is rendered with its own QCF font so the lines break where the
 * printed mushaf breaks them, and the verse being recited is highlighted and
 * followed as playback moves through the page. Three page styles are offered
 * (paper / night / royal), all free.
 */
import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import type { Language } from '../../prayer/types';
import { ScreenWrapper } from '../../../components/ScreenWrapper';
import { BackBar } from '../../../components/BackBar';
import { getString } from '../../../constants/i18n';
import { getTotalPages } from '../data/quranPageMapping';
import { SURAH_LIST } from '../data/surahs';
import { getMushafPage, type MushafPageData } from '../api/mushafPage';
import { getSurahPageRanges, type SurahPageRanges } from '../api/surahPages';
import { QuranSelectModal, type SelectItem } from '../components/QuranSelectModal';
import { QuranPlayerBar } from '../components/QuranPlayerBar';
import { QURAN_RECITERS } from '../constants/reciters';
import { ensurePageFont, prefetchPageFont } from '../utils/qcfFont';
import { MushafPage, PageStyleSwatch, getMushafTheme } from '../components/MushafPage';
import {
  loadQuranPageStyle,
  saveQuranPageStyle,
  loadSelectedReciter,
  saveSelectedReciter,
  QURAN_PAGE_STYLES,
  type QuranPageStyle,
} from '../storage/quranStorage';
import { useQuranAudioContext } from '../context/QuranAudioContext';
import { hapticLight } from '../../../utils/haptics';
import { spacing, radius } from '../../../theme/spacing';
import { fontSize } from '../../../theme/typography';

/**
 * Parchment for the whole reading area, painted once behind the pages rather
 * than behind each page card — the verse reader does the same, and a card with
 * its own background is what made the two screens look unrelated.
 */
const PAGE_TEXTURE = require('../../../../assets/quran_page_bg.jpg');

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
  language: Language;
  /** Keeps the last line of the page clear of the system nav bar. */
  bottomInset: number;
  onPressVerse?: (verseKey: string) => void;
};

const PagePanel = memo(function PagePanel({
  data,
  panelKey,
  windowWidth,
  pageStyle,
  fontReady,
  activeVerseKey,
  language,
  bottomInset,
  onPressVerse,
}: PanelProps) {
  const contentWidth = windowWidth - spacing.sm * 2;
  return (
    <ScrollView
      key={panelKey}
      style={[styles.panelScroll, { width: windowWidth }]}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: spacing.xxl + bottomInset },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <MushafPage
        data={data}
        activeVerseKey={activeVerseKey}
        pageStyle={pageStyle}
        contentWidth={contentWidth}
        fontReady={fontReady}
        language={language}
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
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ page?: string }>();
  const initialPage = Math.max(1, Math.min(TOTAL_PAGES, parseInt(params.page ?? '1', 10) || 1));
  const [fontsLoaded] = useFonts({ Amiri_400Regular });

  const {
    state: audioState,
    playVerseByVerse,
    pause,
    resume,
    stop,
    seekTo,
    cycleRate,
    toggleRepeat,
  } = useQuranAudioContext();

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
  const [showSurahs, setShowSurahs] = useState(false);
  const [showReciters, setShowReciters] = useState(false);
  const [surahPages, setSurahPages] = useState<SurahPageRanges | null>(null);
  const [reciterId, setReciterId] = useState<string | null>(null);
  /** Bumped when a font finishes registering, to re-render with real glyphs. */
  const [fontTick, setFontTick] = useState(0);
  const turningRef = useRef(false);

  const incomingX = useSharedValue(windowWidth);

  useEffect(() => {
    loadQuranPageStyle().then(setPageStyle);
    loadSelectedReciter().then(setReciterId);
    // Page ranges are needed the moment the surah list opens, so warm them now.
    void getSurahPageRanges().then(setSurahPages);
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

  /**
   * Move straight to `page` without remounting the screen, so playback that is
   * already running survives the jump.
   */
  const jumpToPage = useCallback(async (page: number) => {
    if (page < 1 || page > TOTAL_PAGES) return;
    setLoading(true);
    setError(null);
    const result = await loadPage(page);
    if (result) {
      setPageState({ displayPage: page, data: result, incomingPage: null, incomingData: null });
      setFontTick((n) => n + 1);
    } else {
      setError(getString(language, 'quranLoadError'));
    }
    setLoading(false);
  }, [language]);

  /** Picking a surah goes to its first printed page and recites it from verse 1. */
  const pickSurah = useCallback(
    async (surahKey: string) => {
      const surah = Number(surahKey);
      setShowSurahs(false);
      await hapticLight();
      const range = surahPages?.[surah];
      if (range) await jumpToPage(range[0]);
      void playVerseByVerse(surah, 1);
    },
    [surahPages, jumpToPage, playVerseByVerse]
  );

  /** Switching reciter restarts the current verse with the new voice. */
  const pickReciter = useCallback(
    async (id: string) => {
      setShowReciters(false);
      await hapticLight();
      setReciterId(id);
      await saveSelectedReciter(id);
      const { currentSurah, currentAyah } = audioState;
      if (currentSurah != null && currentAyah != null) {
        void playVerseByVerse(currentSurah, currentAyah);
      }
    },
    [audioState, playVerseByVerse]
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
      if (isThisVerse && audioState.isPaused) {
        resume();
        return;
      }
      void playVerseByVerse(surah, ayah);
    },
    [
      audioState.currentSurah,
      audioState.currentAyah,
      audioState.isPlaying,
      audioState.isPaused,
      playVerseByVerse,
      pause,
      resume,
    ]
  );

  const activeVerseKey =
    audioState.currentSurah != null && audioState.currentAyah != null
      ? `${audioState.currentSurah}:${audioState.currentAyah}`
      : null;

  const isAudioActive = audioState.isPlaying || audioState.isPaused || audioState.isPreparing;
  const reciter = QURAN_RECITERS.find((r) => r.id === reciterId);
  const reciterName = reciter ? (language === 'ar' ? reciter.nameAr : reciter.nameEn) : '';

  const surahItems = useMemo<SelectItem[]>(
    () =>
      SURAH_LIST.map((surah) => ({
        key: String(surah.number),
        badge: String(surah.number),
        label: language === 'ar' ? surah.nameAr : surah.nameEn,
        sublabel: `${surah.ayahCount} ${getString(language, 'verses')}`,
      })),
    [language]
  );

  const reciterItems = useMemo<SelectItem[]>(
    () =>
      QURAN_RECITERS.map((r) => ({
        key: r.id,
        label: language === 'ar' ? r.nameAr : r.nameEn,
        sublabel: language === 'ar' ? r.nameEn : r.nameAr,
      })),
    [language]
  );
  const playingSurah = SURAH_LIST.find((s) => s.number === audioState.currentSurah);
  const playingLabel = playingSurah
    ? `${language === 'ar' ? playingSurah.nameAr : playingSurah.nameEn} ${audioState.currentAyah ?? ''}`.trim()
    : getString(language, 'playRecitation');

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
        {/* One solid band for back-bar and page controls, so the mushaf reads as
            the same screen family as the verse reader rather than floating on
            the app's ornate background. */}
        <View style={styles.headerBand}>
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
              onPress={() => setShowSurahs(true)}
              style={styles.navBtn}
              accessibilityRole="button"
              accessibilityLabel={getString(language, 'selectSurah')}
            >
              <Ionicons name="list-outline" size={22} color={colors.text} />
            </TouchableOpacity>
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
            <ImageBackground
              source={PAGE_TEXTURE}
              resizeMode="cover"
              style={StyleSheet.absoluteFill}
            >
              {theme.pageOverlay !== 'transparent' ? (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.pageOverlay }]} />
              ) : null}
            </ImageBackground>
            <View key="current" style={[styles.panel, { width: windowWidth }]} collapsable={false}>
              <PagePanel
                data={data}
                panelKey={`current-${displayPage}-${fontTick}`}
                windowWidth={windowWidth}
                pageStyle={pageStyle}
                fontReady={fontReady}
                activeVerseKey={activeVerseKey}
                language={language}
                bottomInset={insets.bottom}
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
                  language={language}
                  bottomInset={insets.bottom}
                />
              </Animated.View>
            )}
          </View>
        ) : null}

        {isAudioActive && (
          <QuranPlayerBar
            bottomInset={insets.bottom}
            title={playingLabel}
            reciterName={reciterName}
            isPlaying={audioState.isPlaying}
            isPreparing={audioState.isPreparing}
            position={audioState.position}
            duration={audioState.duration}
            rate={audioState.rate}
            repeatVerse={audioState.repeatVerse}
            onTogglePlay={() => (audioState.isPlaying ? pause() : resume())}
            onStop={() => stop()}
            onSeek={seekTo}
            onPressReciter={() => setShowReciters(true)}
            onCycleRate={cycleRate}
            onToggleRepeat={toggleRepeat}
          />
        )}

        <QuranSelectModal
          visible={showSurahs}
          title={getString(language, 'selectSurah')}
          items={surahItems}
          onSelect={(key) => void pickSurah(key)}
          onClose={() => setShowSurahs(false)}
        />
        <QuranSelectModal
          visible={showReciters}
          title={getString(language, 'selectReciter')}
          items={reciterItems}
          selectedKey={reciterId ?? undefined}
          onSelect={(key) => void pickReciter(key)}
          onClose={() => setShowReciters(false)}
        />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBand: { backgroundColor: 'rgba(18,35,28,0.85)' },
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
  // Full-bleed, and flush to the header: the parchment behind covers the whole
  // reading area, so any padding here would show as a strip of app background.
  scrollContent: { paddingTop: spacing.sm },
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
