/**
 * Quran reader — Soft Mushaf Mode (premium look).
 * Tap verse number/ornament to play; long-press opens BottomSheet.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Modal,
  Share,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { Image as ExpoImage } from 'expo-image';
import { Asset } from 'expo-asset';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFonts, Amiri_400Regular } from '@expo-google-fonts/amiri';
import {
  loadBookmarks,
  addBookmark,
  removeBookmark,
  saveLastRead,
  getTapVerseHintShown,
  setTapVerseHintShown,
  loadSelectedReciter,
  saveSelectedReciter,
} from '../storage/quranStorage';
import { SURAH_LIST } from '../data/surahs';
import { QURAN_RECITERS, type ReciterId } from '../constants/reciters';
import { useQuranAudioContext } from '../context/QuranAudioContext';
import { hapticSuccess, hapticLight } from '../../../utils/haptics';
import { useTheme } from '../../../theme/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getString, getReciterLabel } from '../../../constants/i18n';
import { ScreenWrapper } from '../../../components/ScreenWrapper';
import { BackBar } from '../../../components/BackBar';
import { fontFamily } from '../../../theme/typography';

const ARABIC_FONT = 'Amiri_400Regular';
const GOLD = '#E6C27A';
/** Mörkguld för versornament (siffran) – bra kontrast mot linjerat papper */
const ORNAMENT_COLOR = '#7D5E0A';
const GOLD_DIVIDER = 'rgba(230,194,122,0.35)';
const GOLD_BORDER = 'rgba(230,194,122,0.22)';
const GOLD_BORDER_STRONG = 'rgba(230,194,122,0.8)';
const ARABIC_COLOR = '#1a1a1a';
const PAGE_BG_ROYAL = 'rgba(10, 25, 18, 0.82)';
const PAGE_BG_IMAGE = require('../../../../assets/quran_page_bg.jpg');
const PAGE_LINE_SPACING = 60;
const PAGE_LINE_OFFSET = 39;
const PAGE_LINE_COLOR = 'rgba(60, 45, 25, 0.38)';
const PAGE_LINE_COLOR_ROYAL = 'rgba(200,170,95,0.45)';
const PAGE_LINE_SHADOW = 'rgba(0,0,0,0.1)';
const PAGE_LINE_SHADOW_ROYAL = 'rgba(60,40,15,0.12)';
const HEADER_BG = 'rgba(18,35,28,0.85)';
const HEADER_GOLD = '#D6B36A';
const HEADER_TITLE = 'rgba(245,236,210,0.96)';
const HEADER_SUBTITLE = 'rgba(214,179,106,0.75)';
const DEBUG_BORDERS = false;
const DEBUG_BG_MODE: 'image' | 'solid' = 'image';
const PAGE_BG_BASE = '#f3e7d6';
const PAGE_BG_SCALE = 1.06;
/** Fristående rad under suratitel (rätt enligt kund). Vers 1 från API innehåller ofta Basmala+text – då visar vi bara texten. */
const BASMALA = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
const END_OF_AYAH = '\u06DD';
const ARABIC_INDIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

function toArabicIndic(value: number): string {
  return String(value)
    .split('')
    .map((char) => {
      const idx = Number(char);
      return Number.isNaN(idx) ? char : ARABIC_INDIC_DIGITS[idx];
    })
    .join('');
}

/** Tar bort Basmala-prefix från vers 1 för sura 2–114 (API returnerar ofta "Basmala الم" – kunden vill bara "الم"). */
function stripBasmalaFromVerse1(verseText: string | undefined, surahNum: number): string {
  if (!verseText || surahNum === 1) return verseText ?? '';
  const t = verseText.trim();
  if (!t.startsWith('بِسْمِ')) return t;
  // api.alquran.cloud (quran-uthmani) använder ٱلرَّحِيمِ (U+0671 alif wasla). Hitta slutet av Basmala och klipp bort.
  const endPhrases = [
    '\u0671\u0644\u0631\u0651\u064e\u062d\u0650\u064a\u0645\u0650 ',  // ٱلرَّحِيمِ + space (API exakt)
    'الرَّحِيمِ ',
    'الرَّحِيمِ',
    'الرَّحِيم ',
    'الرَّحِيم',
    'الرحيم ',
    'الرحيم',
  ];
  for (const phrase of endPhrases) {
    const idx = t.indexOf(phrase);
    if (idx !== -1 && idx < 70) {
      const after = t.slice(idx + phrase.length).trim();
      if (after.length > 0) return after;
    }
  }
  return t;
}

export function QuranReaderScreen() {
  const { colors, style: themeStyle } = useTheme();
  const isRoyal = themeStyle === 'royal';
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ surah: string; ayah?: string }>();
  const surahNum = parseInt(params.surah ?? '1', 10);
  const startAyah = params.ayah ? parseInt(params.ayah, 10) : 1;
  const surah = SURAH_LIST.find((s) => s.number === surahNum) ?? SURAH_LIST[0];
  const { playAyah, playFromAyah, pause, resume, stop, clearError, state: audioState } = useQuranAudioContext();
  const [selectedReciter, setSelectedReciter] = useState<ReciterId | null>(null);
  const [showReciterModal, setShowReciterModal] = useState(false);
  const [bookmarks, setBookmarks] = useState<{ surah: number; ayah: number }[]>([]);
  const [ayahText, setAyahText] = useState<Record<number, { ar?: string; en?: string }>>({});
  const [textLoading, setTextLoading] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);
  const [sheetAyah, setSheetAyah] = useState<number | null>(null);
  const [showTapHint, setShowTapHint] = useState(false);
  const [verseBlockLayout, setVerseBlockLayout] = useState({ top: 0, height: 0 });
  const [pageHeight, setPageHeight] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const verseYRef = useRef<Record<number, number>>({});
  const bookmarkedAyahs = bookmarks.filter((b) => b.surah === surahNum).map((b) => b.ayah);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [bgUri, setBgUri] = useState<string | null>(null);

  const [fontsLoaded] = useFonts({ Amiri_400Regular });
  const arabicFontFamily = fontsLoaded ? ARABIC_FONT : fontFamily.arabic;

  useEffect(() => {
    loadBookmarks().then(setBookmarks);
  }, []);

  useEffect(() => {
    loadSelectedReciter().then((id) => setSelectedReciter(id as ReciterId));
  }, []);

  useEffect(() => {
    getTapVerseHintShown().then((shown) => {
      if (!shown) setShowTapHint(true);
    });
  }, []);

  useEffect(() => {
    if (audioState.error === 'fullSurahNotAvailable') {
      Alert.alert(
        getString(language, 'playRecitation'),
        getString(language, 'fullSurahNotAvailable'),
        [{ text: 'OK', onPress: clearError }]
      );
    }
  }, [audioState.error, language, clearError]);

  useEffect(() => {
    if (
      audioState.currentSurah === surahNum &&
      audioState.currentAyah != null &&
      (audioState.isPlaying || audioState.isPaused)
    ) {
      const relY = verseYRef.current[audioState.currentAyah];
      if (relY != null && scrollRef.current) {
        const absY = verseBlockLayout.top + relY;
        scrollRef.current.scrollTo({ y: Math.max(0, absY - 80), animated: true });
      }
    }
  }, [audioState.currentSurah, audioState.currentAyah, audioState.isPlaying, audioState.isPaused, surahNum, verseBlockLayout.top]);

  /** Direct API fetch as fallback when cache fails. Uses same format as quranTextCache. */
  async function fetchSurahFromApi(num: number): Promise<Record<number, { ar?: string; en?: string }> | null> {
    try {
      const res = await fetch(
        `https://api.alquran.cloud/v1/surah/${num}/editions/quran-uthmani,en.sahih`
      );
      const json = await res.json();
      const data = Array.isArray(json?.data) ? json.data : [];
      const arabic = data.find(
        (e: { edition?: { language?: string; identifier?: string } }) =>
          e.edition?.language === 'ar' || e.edition?.identifier === 'quran-uthmani'
      );
      const english = data.find(
        (e: { edition?: { language?: string } }) => e.edition?.language === 'en'
      );
      const merged: Record<number, { ar?: string; en?: string }> = {};
      arabic?.ayahs?.forEach((a: { numberInSurah: number; text: string }) => {
        merged[a.numberInSurah] = { ...merged[a.numberInSurah], ar: a.text };
      });
      english?.ayahs?.forEach((a: { numberInSurah: number; text: string }) => {
        merged[a.numberInSurah] = { ...merged[a.numberInSurah], en: a.text };
      });
      return Object.keys(merged).length > 0 ? merged : null;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    let active = true;
    setTextLoading(true);
    setTextError(null);
    setAyahText({});

    async function load() {
      let merged: Record<number, { ar?: string; en?: string }> | null = null;
      try {
        const { getSurahText, saveSurahToCache } = await import('../utils/quranTextCache');
        merged = await getSurahText(surahNum);
        if (!merged || Object.keys(merged).length === 0) {
          merged = await fetchSurahFromApi(surahNum);
          if (merged) await saveSurahToCache(surahNum, merged);
        }
      } catch {
        /* cache failed – try direct API */
        merged = await fetchSurahFromApi(surahNum);
        if (merged) {
          try {
            const { saveSurahToCache } = await import('../utils/quranTextCache');
            await saveSurahToCache(surahNum, merged);
          } catch {
            /* ignore */
          }
        }
      }
      if (!active) return;
      if (merged && Object.keys(merged).length > 0) {
        setAyahText(merged);
      } else {
        setTextError('Kunde inte hämta text just nu.');
      }
      if (active) setTextLoading(false);
    }
    load();

    return () => {
      active = false;
    };
  }, [surahNum]);

  const toggleBookmark = useCallback((ayah: number) => {
    const isBookmarked = bookmarkedAyahs.includes(ayah);
    if (isBookmarked) {
      removeBookmark({ surah: surahNum, ayah }).then(() => loadBookmarks().then(setBookmarks));
    } else {
      hapticSuccess();
      addBookmark({ surah: surahNum, ayah }).then(() => loadBookmarks().then(setBookmarks));
    }
  }, [bookmarkedAyahs, surahNum]);

  const openAyahSheet = useCallback((ayah: number) => {
    hapticLight();
    setSheetAyah(ayah);
    saveLastRead({ surah: surahNum, ayah, timestamp: Date.now() });
  }, [surahNum]);

  const handleOrnamentPress = useCallback(
    (ayah: number) => {
      const isThisVerse = audioState.currentSurah === surahNum && audioState.currentAyah === ayah;
      if (isThisVerse && audioState.isPlaying) {
        pause();
      } else if (isThisVerse && audioState.isPaused) {
        resume();
      } else {
        playAyah(surahNum, ayah);
      }
    },
    [audioState.currentSurah, audioState.currentAyah, audioState.isPlaying, audioState.isPaused, surahNum, playAyah, pause, resume]
  );

  const dismissTapHint = useCallback(() => {
    setShowTapHint(false);
    setTapVerseHintShown();
  }, []);

  const shareAyah = useCallback(async (ayah: number) => {
    const ar = ayahText[ayah]?.ar ?? '';
    const en = ayahText[ayah]?.en ?? '';
    const message = [ar, en].filter(Boolean).join('\n\n') || `Quran ${surah.number}:${ayah}`;
    try {
      await Share.share({
        message: Platform.OS === 'ios' ? message : message,
        title: language === 'ar' ? `${surah.nameAr} ${surah.number}:${ayah}` : `${surah.nameEn} ${surah.number}:${ayah}`,
      });
    } catch {
      /* user dismissed */
    }
  }, [ayahText, surah, language]);

  const ayahs = Array.from({ length: surah.ayahCount }, (_, i) => i + 1);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (audioState.isPlaying) {
      pulse.value = withRepeat(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else if (audioState.isPaused) {
      pulse.value = withTiming(0.5, { duration: 200 });
    } else {
      pulse.value = withTiming(0, { duration: 240 });
    }
  }, [audioState.isPlaying, audioState.isPaused, pulse]);

  useEffect(() => {
    let active = true;
    if (DEBUG_BG_MODE !== 'image') {
      setBgUri(null);
      return () => {
        active = false;
      };
    }
    const targetWidth = Math.max(1, Math.round(windowWidth));
    const targetHeight = Math.max(1, Math.round(windowHeight));
    (async () => {
      try {
        const asset = Asset.fromModule(PAGE_BG_IMAGE);
        if (!asset.localUri) {
          await asset.downloadAsync();
        }
        const sourceUri = asset.localUri ?? asset.uri;
        const result = await manipulateAsync(
          sourceUri,
          [{ resize: { width: targetWidth, height: targetHeight } }],
          { compress: 1, format: SaveFormat.JPEG }
        );
        if (active) setBgUri(result.uri);
      } catch {
        if (active) setBgUri(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [windowWidth, windowHeight]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.18 }],
    opacity: 0.45 - pulse.value * 0.25,
  }));

  return (
    <ScreenWrapper edges={[]} disableBackground>
      {DEBUG_BG_MODE === 'image' ? (
        <ExpoImage
          source={bgUri ? { uri: bgUri } : PAGE_BG_IMAGE}
          contentFit="fill"
          cachePolicy="none"
          transition={0}
          style={[
            styles.pageBackground,
            {
              width: windowWidth * PAGE_BG_SCALE,
              height: windowHeight * PAGE_BG_SCALE,
              transform: [
                { translateX: -((windowWidth * PAGE_BG_SCALE - windowWidth) / 2) },
                { translateY: -((windowHeight * PAGE_BG_SCALE - windowHeight) / 2) },
              ],
            },
            DEBUG_BORDERS && styles.debugPageBackground,
          ]}
        />
      ) : (
        <View
          style={[
            styles.pageBackground,
            { width: windowWidth, height: windowHeight, backgroundColor: PAGE_BG_BASE, zIndex: 999 },
            DEBUG_BORDERS && styles.debugPageBackground,
          ]}
        />
      )}
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        style={[
          styles.headerWrap,
          {
            paddingTop: insets.top + 10,
          },
          DEBUG_BORDERS && styles.debugHeaderWrap,
        ]}
        pointerEvents="box-none"
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />
        )}
        <View style={styles.headerTint} />
        <TouchableOpacity
          style={[styles.reciterChip, { borderColor: GOLD_BORDER, backgroundColor: 'rgba(214,179,106,0.15)' }]}
          onPress={() => setShowReciterModal(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.reciterChipText} numberOfLines={1}>
            {selectedReciter
              ? getReciterLabel(language, selectedReciter)
              : getString(language, 'selectReciter')}
          </Text>
          <Text style={styles.reciterChipChevron}>▾</Text>
        </TouchableOpacity>
        <View style={[styles.header, DEBUG_BORDERS && styles.debugHeaderInner]}>
          <View style={styles.backBtn}>
            <BackBar />
          </View>
          <View style={[styles.headerCenter, DEBUG_BORDERS && styles.debugHeaderCenter]}>
            <View style={styles.headerOrnament}>
              <Svg width={16} height={16} viewBox="0 0 24 24">
                <Path
                  d="M14.5 2.5a8.5 8.5 0 1 0 0 19 7 7 0 1 1 0-19z"
                  fill={HEADER_GOLD}
                />
              </Svg>
            </View>
            <Text style={[styles.headerTitleArabic, { fontFamily: arabicFontFamily }]}>{surah.nameAr}</Text>
            <Text style={styles.headerTitleLatin}>{surah.nameEn}</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>
        <View style={[styles.playerBarRow, DEBUG_BORDERS && styles.debugHeaderRight]}>
          <View style={styles.playerBar}>
            <TouchableOpacity
              onPress={() => {
                if (audioState.isPaused && audioState.currentSurah === surahNum) {
                  resume();
                } else {
                  playFromAyah(surahNum, 1);
                }
              }}
              activeOpacity={0.85}
              style={[
                styles.playerBtn,
                { borderColor: isRoyal ? 'rgba(214,179,106,0.35)' : colors.border, backgroundColor: isRoyal ? 'rgba(214,179,106,0.15)' : colors.surfaceGlass },
                !audioState.isPlaying && (audioState.isPaused && audioState.currentSurah !== surahNum || !audioState.isPaused) && {
                  backgroundColor: isRoyal ? 'rgba(214,179,106,0.35)' : colors.highlightGlow,
                  borderColor: isRoyal ? 'rgba(214,179,106,0.6)' : colors.highlight,
                },
              ]}
              disabled={audioState.isPlaying}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24" fill={audioState.isPlaying ? (isRoyal ? 'rgba(60,42,18,0.4)' : colors.textMuted) : (isRoyal ? '#3C2A12' : colors.text)}>
                <Path d="M8 5v14l11-7z" />
              </Svg>
              <Text style={[styles.playerBtnText, { color: audioState.isPlaying ? (isRoyal ? 'rgba(60,42,18,0.4)' : colors.textMuted) : (isRoyal ? '#3C2A12' : colors.text) }]}>
                {audioState.isPlaying ? getString(language, 'playRecitation') : (audioState.isPaused && audioState.currentSurah === surahNum ? getString(language, 'resumeRecitation') : getString(language, 'playRecitation'))}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => pause()}
              activeOpacity={0.85}
              style={[
                styles.playerBtn,
                { borderColor: isRoyal ? 'rgba(214,179,106,0.35)' : colors.border, backgroundColor: isRoyal ? 'rgba(214,179,106,0.15)' : colors.surfaceGlass },
                (audioState.isPlaying || audioState.isPaused) && {
                  backgroundColor: isRoyal ? 'rgba(214,179,106,0.35)' : colors.highlightGlow,
                  borderColor: isRoyal ? 'rgba(214,179,106,0.6)' : colors.highlight,
                },
              ]}
              disabled={!audioState.isPlaying && !audioState.isPaused}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24" fill={audioState.isPlaying || audioState.isPaused ? (isRoyal ? '#3C2A12' : colors.text) : (isRoyal ? 'rgba(60,42,18,0.4)' : colors.textMuted)}>
                <Path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </Svg>
              <Text style={[styles.playerBtnText, { color: audioState.isPlaying || audioState.isPaused ? (isRoyal ? '#3C2A12' : colors.text) : (isRoyal ? 'rgba(60,42,18,0.4)' : colors.textMuted) }]}>
                {getString(language, 'pauseRecitation')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => stop()}
              activeOpacity={0.85}
              style={[
                styles.playerBtn,
                { borderColor: isRoyal ? 'rgba(214,179,106,0.35)' : colors.border, backgroundColor: isRoyal ? 'rgba(214,179,106,0.15)' : colors.surfaceGlass },
                (audioState.isPlaying || audioState.isPaused) && {
                  backgroundColor: isRoyal ? 'rgba(214,179,106,0.35)' : colors.highlightGlow,
                  borderColor: isRoyal ? 'rgba(214,179,106,0.6)' : colors.highlight,
                },
              ]}
              disabled={!audioState.isPlaying && !audioState.isPaused}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24" fill={audioState.isPlaying || audioState.isPaused ? (isRoyal ? '#3C2A12' : colors.text) : (isRoyal ? 'rgba(60,42,18,0.4)' : colors.textMuted)}>
                <Path d="M6 6h12v12H6z" />
              </Svg>
              <Text style={[styles.playerBtnText, { color: audioState.isPlaying || audioState.isPaused ? (isRoyal ? '#3C2A12' : colors.text) : (isRoyal ? 'rgba(60,42,18,0.4)' : colors.textMuted) }]}>
                {getString(language, 'stopRecitation')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <LinearGradient
          colors={['transparent', HEADER_GOLD, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerDivider}
        />
        {showTapHint && (
          <Pressable
            style={[styles.headerHint, isRoyal && styles.headerHintRoyal]}
            onPress={dismissTapHint}
          >
            <Text style={[styles.headerHintText, { color: isRoyal ? 'rgba(245,241,230,0.8)' : colors.textMuted }]}>
              {getString(language, 'tapVerseHint')}
            </Text>
          </Pressable>
        )}
      </Animated.View>
      <ScrollView
        ref={scrollRef}
        style={[styles.scroll, DEBUG_BORDERS && styles.debugScroll]}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: 0,
            paddingBottom: 60,
          },
          DEBUG_BORDERS && styles.debugScrollContent,
        ]}
      >
        {textLoading && (
          <View style={styles.textStatus}>
            <ActivityIndicator size="small" color={isRoyal ? GOLD : colors.highlight} />
            <Text style={[styles.textStatusText, { color: isRoyal ? 'rgba(255,255,255,0.8)' : colors.textMuted }]}>
              {getString(language, 'loadingQuranText')}
            </Text>
          </View>
        )}
        {!!textError && !textLoading && (
          <Text style={[styles.textError, { color: isRoyal ? 'rgba(255,255,255,0.8)' : colors.textMuted }]}>
            {textError}
          </Text>
        )}
        {!!audioState.error && (
          <Text style={[styles.textError, { color: isRoyal ? 'rgba(255,255,255,0.8)' : colors.textMuted }]}>
            {audioState.error}
          </Text>
        )}

        {/* One continuous mushaf page: surah header + verses (Basmala är vers 1 i API) */}
        {!textLoading && !textError && ayahs.length > 0 && (
          <View
            style={[
              styles.pagePanel,
              {
                borderColor: isRoyal ? GOLD_BORDER : colors.border,
              },
              DEBUG_BORDERS && styles.debugPagePanel,
            ]}
            onLayout={(event) => setPageHeight(event.nativeEvent.layout.height)}
          >
            {verseBlockLayout.height > 0 && (
              <View pointerEvents="none" style={[styles.pageLines, DEBUG_BORDERS && styles.debugPageLines]}>
                {Array.from({
                  length: Math.max(
                    0,
                    Math.ceil(
                      (Math.max(pageHeight, verseBlockLayout.top + verseBlockLayout.height) -
                        (verseBlockLayout.top + PAGE_LINE_OFFSET)) /
                        PAGE_LINE_SPACING
                    ) + 1
                  ),
                }).map((_, index) => (
                  <React.Fragment key={`line-${index}`}>
                    <View
                      style={[
                        styles.pageLine,
                        {
                          top: verseBlockLayout.top + PAGE_LINE_OFFSET + index * PAGE_LINE_SPACING,
                          backgroundColor: isRoyal ? PAGE_LINE_COLOR_ROYAL : PAGE_LINE_COLOR,
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.pageLineShadow,
                        {
                          top: verseBlockLayout.top + PAGE_LINE_OFFSET + index * PAGE_LINE_SPACING + 1,
                          backgroundColor: isRoyal ? PAGE_LINE_SHADOW_ROYAL : PAGE_LINE_SHADOW,
                        },
                      ]}
                    />
                  </React.Fragment>
                ))}
              </View>
            )}
              <View style={[styles.pagePanelContent, DEBUG_BORDERS && styles.debugPageContent]}>
            {/* Surah header inside page: Arabic title; transliteration only when not Arabic UI */}
            <View style={[styles.surahHeader, isRoyal && styles.surahHeaderGlow]}>
              <Text
                style={[
                  styles.surahHeaderArabic,
                  { color: isRoyal ? ARABIC_COLOR : colors.text, fontFamily: arabicFontFamily },
                ]}
              >
                {surah.nameAr}
              </Text>
              {language !== 'ar' && (
                <Text style={[styles.surahHeaderTranslit, { color: isRoyal ? 'rgba(245,241,230,0.7)' : colors.textMuted }]}>
                  {surah.nameEn}
                </Text>
              )}
              <View style={[styles.surahHeaderDivider, { backgroundColor: GOLD_DIVIDER }]} />
            </View>

            {/* Fristående Basmala (rätt enligt kund). Sura 1: vers 1 är bara Basmala – visa inte separat. Sura 9: ingen Basmala. */}
            {surahNum !== 9 && surahNum !== 1 && (
              <Text
                style={[
                  styles.basmala,
                  { color: isRoyal ? ARABIC_COLOR : colors.text, fontFamily: arabicFontFamily },
                ]}
              >
                {BASMALA}
              </Text>
            )}

            <View
              onLayout={(event) => {
                const { y, height } = event.nativeEvent.layout;
                setVerseBlockLayout({ top: y, height });
              }}
              style={DEBUG_BORDERS && styles.debugVerseBlock}
            >
              {ayahs.map((ayah) => {
                const isThisAyahPlaying =
                  !audioState.isFullSurahPlaying &&
                  audioState.currentSurah === surahNum &&
                  audioState.currentAyah === ayah &&
                  (audioState.isPlaying || audioState.isPaused || audioState.isPreparing);
                return (
                  <View
                    key={ayah}
                    onLayout={(e) => {
                      const { y } = e.nativeEvent.layout;
                      verseYRef.current[ayah] = y;
                    }}
                    style={[
                      styles.verseRow,
                      isThisAyahPlaying && (isRoyal ? styles.verseRowPlayingRoyal : styles.verseRowPlaying),
                    ]}
                  >
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => openAyahSheet(ayah)}
                    >
                      <Text
                        style={[
                          styles.verseArabic,
                          {
                            color: isThisAyahPlaying ? '#1D4ED8' : (isRoyal ? ARABIC_COLOR : colors.text),
                            fontFamily: arabicFontFamily,
                          },
                        ]}
                        allowFontScaling
                      >
                        {ayah === 1 && surahNum >= 2
                          ? stripBasmalaFromVerse1(ayahText[ayah]?.ar, surahNum) || `Verse ${surah.number}:${ayah}`
                          : (ayahText[ayah]?.ar ?? `Verse ${surah.number}:${ayah}`)}
                        {' '}
                        <Text
                          style={[
                            styles.inlineOrnament,
                            isThisAyahPlaying && styles.inlineOrnamentPlaying,
                          ]}
                          onPress={() => {
                            hapticLight();
                            handleOrnamentPress(ayah);
                          }}
                          onLongPress={() => openAyahSheet(ayah)}
                          accessibilityLabel={`Play verse ${ayah}`}
                          accessibilityRole="button"
                        >
                          {`﴿${toArabicIndic(ayah)}﴾`}
                        </Text>
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Ayah BottomSheet */}
      <Modal
        visible={sheetAyah !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSheetAyah(null)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setSheetAyah(null)}>
          <Pressable
            style={[
              styles.sheetPanel,
              {
                paddingBottom: insets.bottom + 16,
                backgroundColor: isRoyal ? 'rgba(15,28,23,0.98)' : colors.surface,
                borderColor: isRoyal ? GOLD_BORDER : colors.border,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {sheetAyah !== null && (
              <>
                <View style={styles.sheetHandle} />
                <Text
                  style={[
                    styles.sheetArabic,
                    {
                      color: isRoyal ? ARABIC_COLOR : colors.text,
                      fontFamily: arabicFontFamily,
                    },
                  ]}
                >
                  {sheetAyah === 1 && surahNum >= 2
                    ? stripBasmalaFromVerse1(ayahText[sheetAyah]?.ar, surahNum)
                    : (ayahText[sheetAyah]?.ar ?? '')}
                </Text>
                {ayahText[sheetAyah]?.en && (
                  <Text
                    style={[
                      styles.sheetTranslation,
                      { color: isRoyal ? 'rgba(245,241,230,0.85)' : colors.textMuted },
                    ]}
                  >
                    {ayahText[sheetAyah].en}
                  </Text>
                )}
                <View style={styles.sheetActions}>
                  <TouchableOpacity
                    style={[styles.sheetBtn, { borderColor: isRoyal ? GOLD_BORDER_STRONG : colors.border }]}
                    onPress={() => {
                      const isThisVerse = audioState.currentSurah === surahNum && audioState.currentAyah === sheetAyah;
                      if (isThisVerse && audioState.isPlaying) {
                        pause();
                      } else if (isThisVerse && audioState.isPaused) {
                        resume();
                      } else {
                        playAyah(surahNum, sheetAyah);
                      }
                    }}
                  >
                    <Text style={[styles.sheetBtnText, { color: isRoyal ? GOLD : colors.highlight }]}>
                      {audioState.currentSurah === surahNum && audioState.currentAyah === sheetAyah && audioState.isPlaying
                        ? getString(language, 'pauseRecitation')
                        : audioState.currentSurah === surahNum && audioState.currentAyah === sheetAyah && audioState.isPaused
                          ? getString(language, 'resumeRecitation')
                          : getString(language, 'playRecitation')}
                    </Text>
                  </TouchableOpacity>
                  {(audioState.isPlaying || audioState.isPaused) && (
                    <TouchableOpacity
                      style={[styles.sheetBtn, { borderColor: isRoyal ? GOLD_BORDER_STRONG : colors.border }]}
                      onPress={() => stop()}
                    >
                      <Text style={[styles.sheetBtnText, { color: isRoyal ? GOLD : colors.highlight }]}>
                        {getString(language, 'stopRecitation')}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.sheetBtn, { borderColor: isRoyal ? GOLD_BORDER_STRONG : colors.border }]}
                    onPress={() => toggleBookmark(sheetAyah)}
                  >
                    <Text style={[styles.sheetBtnText, { color: isRoyal ? GOLD : colors.highlight }]}>
                      {bookmarkedAyahs.includes(sheetAyah) ? '★ Bookmark' : '☆ Bookmark'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.sheetBtn, { borderColor: isRoyal ? GOLD_BORDER_STRONG : colors.border }]}
                    onPress={() => shareAyah(sheetAyah)}
                  >
                    <Text style={[styles.sheetBtnText, { color: isRoyal ? GOLD : colors.highlight }]}>
                      Share
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Reciter selector modal */}
      <Modal
        visible={showReciterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReciterModal(false)}
      >
        <Pressable
          style={styles.reciterModalBackdrop}
          onPress={() => setShowReciterModal(false)}
        >
          <Pressable
            style={[
              styles.reciterModalPanel,
              {
                backgroundColor: isRoyal ? 'rgba(15,28,23,0.98)' : colors.surface,
                borderColor: isRoyal ? GOLD_BORDER : colors.border,
                top: insets.top + 60,
                left: 16,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.reciterModalTitle, { color: isRoyal ? HEADER_TITLE : colors.text }]}>
              {getString(language, 'selectReciter')}
            </Text>
            {QURAN_RECITERS.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={[
                  styles.reciterModalItem,
                  selectedReciter === r.id && { backgroundColor: 'rgba(214,179,106,0.2)' },
                ]}
                onPress={() => {
                  setSelectedReciter(r.id);
                  saveSelectedReciter(r.id);
                  setShowReciterModal(false);
                  if (audioState.isPlaying || audioState.isPaused) {
                    const wasFullSurah = audioState.isFullSurahPlaying;
                    const { currentSurah, currentAyah } = audioState;
                    stop();
                    if (currentSurah === surahNum && currentAyah) {
                      if (wasFullSurah) {
                        playFromAyah(surahNum, 1);
                      } else {
                        playAyah(surahNum, currentAyah);
                      }
                    }
                  }
                }}
              >
                <Text
                  style={[
                    styles.reciterModalItemText,
                    { color: selectedReciter === r.id ? GOLD : (isRoyal ? 'rgba(245,241,230,0.9)' : colors.text) },
                  ]}
                >
                  {getReciterLabel(language, r.id)}
                </Text>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    overflow: 'hidden',
  },
  reciterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 4,
    maxWidth: '70%',
  },
  reciterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: HEADER_SUBTITLE,
  },
  reciterChipChevron: {
    fontSize: 10,
    color: HEADER_SUBTITLE,
  },
  reciterModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  reciterModalPanel: {
    position: 'absolute',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 200,
    maxWidth: 280,
  },
  reciterModalTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  reciterModalItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  reciterModalItemText: {
    fontSize: 15,
  },
  headerTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: HEADER_BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    gap: 10,
  },
  headerHint: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'center',
    marginBottom: 4,
  },
  headerHintRoyal: {},
  headerHintText: {
    fontSize: 13,
  },
  headerCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerSpacer: { width: 44, minWidth: 44 },
  headerOrnament: { marginBottom: 4 },
  headerTitleArabic: {
    fontSize: 24,
    color: HEADER_TITLE,
    textAlign: 'center',
    writingDirection: 'rtl',
    textShadowColor: 'rgba(214,179,106,0.45)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  headerTitleLatin: {
    fontSize: 11,
    marginTop: 1,
    color: HEADER_SUBTITLE,
    fontWeight: '500',
  },
  headerRight: { alignItems: 'flex-end', gap: 6 },
  playerBarRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 8,
  },
  playerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  playerBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  backBtn: { paddingVertical: 6, paddingRight: 4 },
  listenBtn: { alignSelf: 'flex-end' },
  listenHalo: {
    position: 'absolute',
    left: -10,
    right: -10,
    top: -8,
    bottom: -8,
    borderRadius: 24,
    backgroundColor: 'rgba(214,179,106,0.45)',
  },
  listenBtnBg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(120,80,20,0.35)',
  },
  listenBtnText: { fontSize: 11, fontWeight: '700', color: '#3C2A12' },
  headerDivider: { height: 1, marginTop: 8, opacity: 0.9 },
  scroll: { flex: 1 },
  scrollContent: { paddingVertical: 16, paddingHorizontal: 0 },
  textStatus: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  textStatusText: { marginLeft: 8, fontSize: 13 },
  textError: { marginBottom: 12, fontSize: 13 },

  debugPageBackground: { borderWidth: 2, borderColor: '#ff00ff' },
  debugHeaderWrap: { borderWidth: 2, borderColor: '#00e5ff' },
  debugHeaderInner: { borderWidth: 2, borderColor: '#00ff6a' },
  debugHeaderCenter: { borderWidth: 2, borderColor: '#ffd500' },
  debugHeaderRight: { borderWidth: 2, borderColor: '#ff6a00' },
  debugScroll: { borderWidth: 2, borderColor: '#00b0ff' },
  debugScrollContent: { borderWidth: 2, borderColor: '#8e24aa' },
  debugPagePanel: { borderWidth: 2, borderColor: '#ff1744' },
  debugPageLines: { borderWidth: 2, borderColor: '#00c853' },
  debugPageContent: { borderWidth: 2, borderColor: '#ff9100' },
  debugVerseBlock: { borderWidth: 2, borderColor: '#2962ff' },

  pageBackground: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    backgroundColor: PAGE_BG_BASE,
  },
  pagePanel: {
    borderRadius: 0,
    borderWidth: 0,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  pagePanelContent: {
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 44,
  },
  pageLines: {
    ...StyleSheet.absoluteFillObject,
  },
  pageLine: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 1,
  },
  pageLineShadow: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 1,
  },
  pagePanelShadow: {
    shadowColor: 'rgba(0,0,0,0.6)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 8,
  },
  verseRow: {
    marginBottom: 0,
  },
  verseRowPlaying: {
    backgroundColor: 'rgba(59,130,246,0.18)',
    borderRadius: 8,
    marginHorizontal: -4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  verseRowPlayingRoyal: {
    backgroundColor: 'rgba(59,130,246,0.2)',
    borderRadius: 8,
    marginHorizontal: -4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  inlineOrnament: {
    color: ORNAMENT_COLOR,
    fontWeight: '700',
    fontSize: 20,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  inlineOrnamentPlaying: {
    color: '#2563EB',
    textShadowColor: 'rgba(37,99,235,0.45)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  surahHeader: { marginBottom: 20, alignItems: 'center' },
  surahHeaderGlow: {
    shadowColor: 'rgba(230,194,122,0.4)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  surahHeaderArabic: {
    fontSize: 36,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  surahHeaderTranslit: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: '400',
  },
  surahHeaderDivider: {
    height: 1,
    width: '60%',
    marginTop: 12,
  },
  basmala: {
    fontSize: 28,
    lineHeight: 48,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: 18,
  },

  verseArabic: {
    fontSize: 30,
    lineHeight: PAGE_LINE_SPACING,
    textAlign: 'right',
    writingDirection: 'rtl',
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },

  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetPanel: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    minHeight: 200,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(230,194,122,0.5)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetArabic: {
    fontSize: 28,
    lineHeight: 44,
    letterSpacing: 0.3,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 12,
  },
  sheetTranslation: {
    fontSize: 15,
    opacity: 0.85,
    fontStyle: 'italic',
    marginBottom: 20,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  sheetBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  sheetBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
