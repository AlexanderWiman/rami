import React, { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  I18nManager,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Anchor, ScrollAnchorProvider, useScrollAnchor } from '@sellpy/react-native-scroll-anchor';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenWrapper } from '../../../components/ScreenWrapper';
import { BackToHomeBar } from '../../../components/BackToHomeBar';
import { GlassCard } from '../../../components/GlassCard';
import { useTheme } from '../../../theme/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../theme/typography';
import { spacing, radius } from '../../../theme/spacing';
import { getString } from '../../../constants/i18n';
import { getBukhariContentLanguage, type BukhariBookmark, type BukhariHadith } from '../types';
import { getBukhariHadiths } from '../utils/bukhariCache';
import { normalizeForHadithSearch } from '../utils/searchNormalize';
import {
  loadBukhariBookmarks,
  saveBukhariLastRead,
  toggleBukhariBookmark,
} from '../storage/bukhariStorage';

const PAGE_SIZE = 30;
const ITEM_ESTIMATE_HEIGHT = 340;

type HadithRowProps = {
  item: BukhariHadith;
  index: number;
  isBookmarked: boolean;
  isHighlighted: boolean;
  isMatch: boolean;
  colors: { text: string; textMuted: string; highlight: string; highlightGlow: string; border: string };
  isRoyal: boolean;
  sourceLabel: string;
  onToggleBookmark: (item: BukhariHadith) => void;
  onSaveLastRead: (item: BukhariHadith) => void;
  onMeasure: (index: number, height: number) => void;
};

const HadithRow = memo(function HadithRow({
  item,
  index,
  isBookmarked,
  isHighlighted,
  isMatch,
  colors,
  isRoyal,
  sourceLabel,
  onToggleBookmark,
  onSaveLastRead,
  onMeasure,
}: HadithRowProps) {
  return (
    <View
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        onMeasure(index, h);
      }}
    >
      <Anchor name={item.id}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.cardTouch}
          onPress={() => onSaveLastRead(item)}
        >
          <GlassCard
            padding="lg"
            rounded="lg"
            fillColor={isHighlighted || isMatch ? colors.highlightGlow : undefined}
            strokeColor={isHighlighted ? colors.highlight : isMatch ? colors.border : undefined}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.hadithNumber, { color: isRoyal ? '#E6C27A' : colors.highlight }]}>
                {`#${item.number}`}
              </Text>
              <TouchableOpacity onPress={() => void onToggleBookmark(item)} hitSlop={8}>
                <Text style={[styles.bookmark, { color: isBookmarked ? colors.highlight : colors.textMuted }]}>
                  {isBookmarked ? '★' : '☆'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.hadithText, { color: isRoyal ? 'rgba(255,255,255,0.92)' : colors.text }]}>
              {item.text}
            </Text>
            <Text style={[styles.sourceText, { color: isRoyal ? 'rgba(255,255,255,0.58)' : colors.textMuted }]}>
              {sourceLabel}
            </Text>
          </GlassCard>
        </TouchableOpacity>
      </Anchor>
    </View>
  );
});

export function BukhariReaderScreen() {
  const { colors, style: themeStyle } = useTheme();
  const isRoyal = themeStyle === 'royal';
  const isRtl = I18nManager.isRTL;
  const { language } = useLanguage();
  const router = useRouter();
  const params = useLocalSearchParams<{ book: string; chapter: string; hadith?: string }>();
  const bookId = Number.parseInt(params.book ?? '1', 10);
  const chapterId = Number.parseInt(params.chapter ?? '1', 10);
  const highlightedHadith = params.hadith ? Number.parseInt(params.hadith, 10) : null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hadiths, setHadiths] = useState<BukhariHadith[]>([]);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [fullBookmarks, setFullBookmarks] = useState<BukhariBookmark[]>([]);
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState(1);
  const [jumpValue, setJumpValue] = useState('');
  const [activeJumpHadithId, setActiveJumpHadithId] = useState<string | null>(null);
  const [pendingScrollHadithId, setPendingScrollHadithId] = useState<string | null>(null);
  const [isNavigatingToFavorite, setIsNavigatingToFavorite] = useState(false);
  const [activeMatchIndex, setActiveMatchIndex] = useState<number | null>(null);
  const [controlsExpanded, setControlsExpanded] = useState(false);
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [listHeaderHeight, setListHeaderHeight] = useState(0);
  const [measuredHeights, setMeasuredHeights] = useState<(number | undefined)[]>([]);
  const [scrollOffsetY, setScrollOffsetY] = useState(0);
  const flatListRef = useRef<FlatList<BukhariHadith>>(null);
  const scrollAnchorRef = useRef<ScrollView | { scrollTo: (pos: { y?: number }) => void; measure: (cb: (x: number, y: number, w: number, h: number, pageX: number, pageY: number) => void) => void } | null>(null);
  const scrollAnchorMethods = useScrollAnchor(scrollAnchorRef as React.RefObject<ScrollView>);
  const contentLanguage = getBukhariContentLanguage(language);
  const { width: windowWidth } = useWindowDimensions();
  const listHeaderWidth = Math.max(200, windowWidth - 2 * spacing.lg);

  const setFlatListRef = useCallback((r: FlatList<BukhariHadith> | null) => {
    (flatListRef as React.MutableRefObject<FlatList<BukhariHadith> | null>).current = r;
    if (r) {
      (scrollAnchorRef as React.MutableRefObject<{ scrollTo: (pos: { y?: number }) => void; measure: (cb: (x: number, y: number, w: number, h: number, pageX: number, pageY: number) => void) => void } | null>).current = {
        scrollTo: (pos: { y?: number }) => r.scrollToOffset({ offset: pos.y ?? 0, animated: true }),
        measure: (cb) => (r as unknown as { measure: (cb: (x: number, y: number, w: number, h: number, pageX: number, pageY: number) => void) => void }).measure?.(cb),
      };
    } else {
      (scrollAnchorRef as React.MutableRefObject<null>).current = null;
    }
  }, []);

  useEffect(() => {
    let active = true;
    loadBukhariBookmarks()
      .then((storedBookmarks) => {
        if (!active) return;
        setBookmarks(new Set(storedBookmarks.map((item) => item.hadithId)));
        setFullBookmarks(storedBookmarks.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)));
        setReady(true);
      })
      .catch(() => {
        if (active) setError(getString(language, 'bukhariLoadError'));
      });
    return () => {
      active = false;
    };
  }, [language]);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    setLoading(true);
    getBukhariHadiths(contentLanguage, bookId, chapterId)
      .then((chapterHadiths) => {
        if (!active) return;
        setHadiths(chapterHadiths);
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
  }, [ready, contentLanguage, bookId, chapterId, language]);

  const onToggleBookmark = useCallback(async (item: BukhariHadith) => {
    const payload: BukhariBookmark = {
      bookId,
      chapterId,
      hadithId: item.id,
      hadithNumber: item.number,
      createdAt: Date.now(),
    };
    try {
      const nowBookmarked = await toggleBukhariBookmark(payload);
      setBookmarks((current) => {
        const next = new Set(current);
        if (nowBookmarked) next.add(item.id);
        else next.delete(item.id);
        return next;
      });
      const updated = await loadBukhariBookmarks();
      setFullBookmarks(updated.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)));
    } catch (e) {
      if (e instanceof Error && e.message === 'MAX_FAVORITES_REACHED') {
        Alert.alert(getString(language, 'bukhariMaxFavoritesReached'));
      }
    }
  }, [bookId, chapterId, language]);

  const onFavoritePress = (b: BukhariBookmark) => {
    setIsNavigatingToFavorite(true);
    if (b.bookId === bookId && b.chapterId === chapterId) {
      const hadith = hadiths.find((item) => item.number === b.hadithNumber);
      if (hadith) {
        setJumpValue(String(b.hadithNumber));
        navigateToHadith(hadith, 0);
      } else {
        setIsNavigatingToFavorite(false);
      }
      return;
    }
    setControlsExpanded(false);
    router.push(`/bukhari/${b.bookId}/${b.chapterId}?hadith=${b.hadithNumber}` as const);
  };

  const highlightedId = useMemo(() => {
    if (highlightedHadith == null) return null;
    return hadiths.find((item) => item.number === highlightedHadith)?.id ?? null;
  }, [hadiths, highlightedHadith]);
  const normalizedQuery = normalizeForHadithSearch(jumpValue);
  const hadithNormalizedTexts = useMemo(() => {
    const map = new Map<string, string>();
    hadiths.forEach((item) => {
      map.set(item.id, normalizeForHadithSearch(item.text));
    });
    return map;
  }, [hadiths]);
  const matchedHadiths = useMemo(() => {
    if (!normalizedQuery) return [] as BukhariHadith[];
    const trimmed = normalizedQuery.trim();
    const isPurelyNumeric = /^\d+$/.test(trimmed);
    if (isPurelyNumeric) {
      const asNum = Number.parseInt(trimmed, 10);
      const exact = hadiths.find((item) => item.number === asNum);
      return exact ? [exact] : [];
    }
    return hadiths.filter(
      (item) =>
        String(item.number).includes(trimmed) ||
        (hadithNormalizedTexts.get(item.id) ?? '').includes(trimmed)
    );
  }, [hadiths, normalizedQuery, hadithNormalizedTexts]);
  const matchedHadithIds = useMemo(() => {
    return new Set(matchedHadiths.map((item) => item.id));
  }, [matchedHadiths]);

  const hadithListExtraData = useMemo(
    () => [bookmarks, highlightedId, activeJumpHadithId, normalizedQuery, matchedHadithIds] as const,
    [bookmarks, highlightedId, activeJumpHadithId, normalizedQuery, matchedHadithIds]
  );

  const totalPages = Math.max(1, Math.ceil(hadiths.length / PAGE_SIZE));
  const pagedHadiths = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return hadiths.slice(start, start + PAGE_SIZE);
  }, [hadiths, page]);

  useEffect(() => {
    if (highlightedHadith == null || hadiths.length === 0) return;
    const hadith = hadiths.find((item) => item.number === highlightedHadith);
    if (!hadith) return;
    const index = hadiths.findIndex((item) => item.id === hadith.id);
    const targetPage = Math.floor(index / PAGE_SIZE) + 1;
    setPage(targetPage);
    setPendingScrollHadithId(hadith.id);
  }, [highlightedHadith, hadiths]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setMeasuredHeights([]);
  }, [page]);

  const navigateToHadith = (target: BukhariHadith, matchIndex: number | null = null) => {
    const index = hadiths.findIndex((item) => item.id === target.id);
    if (index < 0) return;
    const targetPage = Math.floor(index / PAGE_SIZE) + 1;
    setPage(targetPage);
    setActiveJumpHadithId(target.id);
    setPendingScrollHadithId(target.id);
    if (matchIndex != null) setActiveMatchIndex(matchIndex);
  };

  const jumpToHadith = (queryOverride?: string) => {
    Keyboard.dismiss();
    const q = String(queryOverride ?? normalizedQuery ?? '').trim();
    if (!q) return;
    const isNumeric = /^\d+$/.test(q);
    if (isNumeric) {
      const asNum = Number.parseInt(q, 10);
      const exact = hadiths.find((item) => item.number === asNum);
      if (exact) {
        navigateToHadith(exact, 0);
        return;
      }
      return;
    }
    if (matchedHadiths.length === 0) return;
    navigateToHadith(matchedHadiths[0], 0);
  };

  const jumpToMatch = (direction: 'prev' | 'next') => {
    if (matchedHadiths.length === 0) return;
    if (activeMatchIndex == null) {
      const firstIndex = direction === 'next' ? 0 : matchedHadiths.length - 1;
      navigateToHadith(matchedHadiths[firstIndex], firstIndex);
      return;
    }
    const nextIndex =
      direction === 'next'
        ? (activeMatchIndex + 1) % matchedHadiths.length
        : (activeMatchIndex - 1 + matchedHadiths.length) % matchedHadiths.length;
    navigateToHadith(matchedHadiths[nextIndex], nextIndex);
  };

  useEffect(() => {
    setActiveMatchIndex(null);
  }, [normalizedQuery]);

  useEffect(() => {
    if (!pendingScrollHadithId) return;
    const hadithId = pendingScrollHadithId;
    const index = pagedHadiths.findIndex((item) => item.id === hadithId);
    if (index < 0) {
      setIsNavigatingToFavorite(false);
      return;
    }
    const scrollToTarget = () => {
      flatListRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0,
      });
    };
    const t1 = setTimeout(scrollToTarget, 400);
    const t2 = setTimeout(() => {
      scrollToTarget();
      setPendingScrollHadithId(null);
      setIsNavigatingToFavorite(false);
    }, 900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [pagedHadiths, pendingScrollHadithId]);

  const navLabels = useMemo(() => {
    switch (language) {
      case 'ar':
        return { prev: 'السابق', next: 'التالي', page: 'الصفحة', jumpPlaceholder: '# / ابحث في النص', hideControls: 'إخفاء', showControls: 'عرض الأدوات' };
      case 'tr':
        return { prev: 'önceki', next: 'sonraki', page: 'sayfa', jumpPlaceholder: '# / metinde ara', hideControls: 'Gizle', showControls: 'Araçları göster' };
      case 'fr':
        return { prev: 'précédent', next: 'suivant', page: 'page', jumpPlaceholder: '# / rechercher le texte', hideControls: 'Masquer', showControls: 'Afficher les outils' };
      case 'es':
        return { prev: 'anterior', next: 'siguiente', page: 'página', jumpPlaceholder: '# / buscar en el texto', hideControls: 'Ocultar', showControls: 'Mostrar controles' };
      case 'de':
        return { prev: 'zurück', next: 'weiter', page: 'seite', jumpPlaceholder: '# / im text suchen', hideControls: 'Ausblenden', showControls: 'Steuerung einblenden' };
      case 'sv':
        return { prev: 'föregående', next: 'nästa', page: 'sidan', jumpPlaceholder: '# / sök i text', hideControls: 'Dölj', showControls: 'Visa verktyg' };
      default:
        return { prev: 'previous', next: 'next', page: 'page', jumpPlaceholder: '# / search text', hideControls: 'Hide', showControls: 'Show controls' };
    }
  }, [language]);

  // RN can swap left/right in RTL on Android. These styles keep physical placement stable.
  const physicalLeftPin = isRtl ? styles.pinRight : styles.pinLeft;
  const physicalRightPin = isRtl ? styles.pinLeft : styles.pinRight;
  const prevArrow = isRtl ? '›' : '‹';
  const nextArrow = isRtl ? '‹' : '›';
  const prevArrowDouble = isRtl ? '››' : '‹‹';
  const nextArrowDouble = isRtl ? '‹‹' : '››';

  const onMeasure = useCallback((index: number, height: number) => {
    setMeasuredHeights((prev) => {
      const next = [...prev];
      if (index >= next.length) next.length = index + 1;
      if (next[index] === height) return prev;
      next[index] = height;
      return next;
    });
  }, []);

  const onSaveLastRead = useCallback(
    (item: BukhariHadith) => {
      void saveBukhariLastRead({
        bookId,
        chapterId,
        hadithId: item.id,
        hadithNumber: item.number,
        timestamp: Date.now(),
      });
    },
    [bookId, chapterId]
  );

  const sourceLabel = getString(language, 'bukhariTitle');
  const rowColors = useMemo(
    () => ({
      text: colors.text,
      textMuted: colors.textMuted,
      highlight: colors.highlight,
      highlightGlow: colors.highlightGlow,
      border: colors.border,
    }),
    [colors.text, colors.textMuted, colors.highlight, colors.highlightGlow, colors.border]
  );

  const renderHadith = useCallback(
    ({ item, index }: { item: BukhariHadith; index: number }) => (
      <HadithRow
        item={item}
        index={index}
        isBookmarked={bookmarks.has(item.id)}
        isHighlighted={highlightedId === item.id || activeJumpHadithId === item.id}
        isMatch={normalizedQuery.length > 0 && matchedHadithIds.has(item.id)}
        colors={rowColors}
        isRoyal={isRoyal}
        sourceLabel={sourceLabel}
        onToggleBookmark={onToggleBookmark}
        onSaveLastRead={onSaveLastRead}
        onMeasure={onMeasure}
      />
    ),
    [
      bookmarks,
      highlightedId,
      activeJumpHadithId,
      normalizedQuery,
      matchedHadithIds,
      rowColors,
      isRoyal,
      sourceLabel,
      onToggleBookmark,
      onSaveLastRead,
      onMeasure,
    ]
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => {
      const length =
        measuredHeights[index] ?? ITEM_ESTIMATE_HEIGHT;
      const offset =
        listHeaderHeight +
        measuredHeights
          .slice(0, index)
          .reduce((sum, h) => sum + (h ?? ITEM_ESTIMATE_HEIGHT), 0);
      return { length, offset, index };
    },
    [listHeaderHeight, measuredHeights]
  );

  const headerWidthStyle = { width: listHeaderWidth, minWidth: listHeaderWidth, maxWidth: listHeaderWidth };
  const controlsInnerWidth = listHeaderWidth - 2 * spacing.lg;
  const listHeader = (
    <View
      style={[styles.listHeaderContainer, headerWidthStyle]}
      onLayout={(e) => setListHeaderHeight(e.nativeEvent.layout.height)}
      {...(Platform.OS === 'android' ? { collapsable: false } : {})}
    >
      <View style={styles.backWrap}>
        <BackToHomeBar />
      </View>

      <Text style={[styles.title, { color: colors.text }]}>{getString(language, 'bukhariTitle')}</Text>

      {controlsExpanded ? (
      <GlassCard padding="lg" rounded="lg" style={[styles.pageControls, headerWidthStyle]} fillContent={false}>
        <View
          style={[
            styles.controlsContentWrap,
            {
              width: controlsInnerWidth,
              maxWidth: controlsInnerWidth,
            },
          ]}
          {...(Platform.OS === 'android' ? { collapsable: false } : {})}
        >
        <View style={styles.controlsHeaderRow}>
          <View style={styles.controlsHeaderSpacer} />
          <TouchableOpacity
            hitSlop={12}
            onPress={() => setControlsExpanded(false)}
            style={styles.controlsToggleBtn}
          >
            <Text style={[styles.controlsToggleText, { color: isRoyal ? 'rgba(255,255,255,0.7)' : colors.textMuted }]}>
              {navLabels.hideControls} ▲
            </Text>
          </TouchableOpacity>
        </View>
        {/* Sidnavigering: ‹‹ ‹ | sidan | › ›› */}
        <View style={styles.pageRow}>
          <View style={[styles.pageLeftGroup, physicalLeftPin]}>
            <TouchableOpacity
              style={[styles.pageButtonDouble, page <= 1 && styles.pageButtonDisabled]}
              onPress={() => setPage((p) => Math.max(1, p - 10))}
              disabled={page <= 1}
            >
              <Text style={[styles.pageButtonDoubleText, styles.arrowGlyph, { color: isRoyal ? '#E6C27A' : colors.highlight }]}>
                {prevArrowDouble}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pageButton, page <= 1 && styles.pageButtonDisabled]}
              onPress={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <Text style={[styles.pageButtonText, styles.arrowGlyph, { color: isRoyal ? '#E6C27A' : colors.highlight }]}>
                {prevArrow}
              </Text>
              <Text style={[styles.pageButtonLabel, { color: isRoyal ? 'rgba(255,255,255,0.72)' : colors.textMuted }]}>
                {navLabels.prev}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.pageCenter}>
            <Text style={[styles.pageText, { color: isRoyal ? 'rgba(255,255,255,0.9)' : colors.text }]}>
              {`${page}/${totalPages}`}
            </Text>
            <Text style={[styles.pageCenterLabel, { color: isRoyal ? 'rgba(255,255,255,0.72)' : colors.textMuted }]}>
              {navLabels.page}
            </Text>
          </View>
          <View style={[styles.pageRightGroup, physicalRightPin]}>
            <TouchableOpacity
              style={[styles.pageButton, page >= totalPages && styles.pageButtonDisabled]}
              onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              <Text style={[styles.pageButtonText, styles.arrowGlyph, { color: isRoyal ? '#E6C27A' : colors.highlight }]}>
                {nextArrow}
              </Text>
              <Text style={[styles.pageButtonLabel, { color: isRoyal ? 'rgba(255,255,255,0.72)' : colors.textMuted }]}>
                {navLabels.next}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pageButtonDouble, page >= totalPages && styles.pageButtonDisabled]}
              onPress={() => setPage((p) => Math.min(totalPages, p + 10))}
              disabled={page >= totalPages}
            >
              <Text style={[styles.pageButtonDoubleText, styles.arrowGlyph, { color: isRoyal ? '#E6C27A' : colors.highlight }]}>
                {nextArrowDouble}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.controlDivider, { backgroundColor: isRoyal ? 'rgba(255,255,255,0.08)' : colors.border }]} />

        <View style={styles.jumpRow}>
          <View style={styles.searchIconWrap}>
            <Ionicons name="search" size={20} color={isRoyal ? '#E6C27A' : colors.highlight} />
          </View>
          <TextInput
            value={jumpValue}
            onChangeText={(text) => {
              setJumpValue(text);
              setActiveJumpHadithId(null);
              setPendingScrollHadithId(null);
            }}
            placeholder={navLabels.jumpPlaceholder}
            returnKeyType="search"
            onSubmitEditing={jumpToHadith}
            blurOnSubmit
            style={[
              styles.jumpInput,
              {
                backgroundColor: isRoyal ? 'rgba(10,25,18,0.72)' : colors.surfaceGlass,
                color: isRoyal ? 'rgba(255,255,255,0.95)' : colors.text,
                borderColor: isRoyal ? 'rgba(230,194,122,0.28)' : colors.border,
              },
            ]}
            placeholderTextColor={colors.textMuted}
          />
          <TouchableOpacity
            style={[styles.jumpButton, { borderColor: isRoyal ? 'rgba(230,194,122,0.4)' : colors.border }]}
            onPress={jumpToHadith}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Text style={[styles.jumpButtonText, { color: isRoyal ? '#E6C27A' : colors.highlight }]}>
              {getString(language, 'search')}
            </Text>
          </TouchableOpacity>
          {normalizedQuery.length > 0 && matchedHadithIds.size > 0 ? (
            <View style={styles.matchNavInline}>
              <TouchableOpacity
                style={styles.matchNavInlineBtn}
                onPress={() => jumpToMatch('prev')}
                hitSlop={6}
              >
                <Text style={[styles.matchNavInlineArrow, { color: isRoyal ? '#E6C27A' : colors.highlight }]}>
                  {prevArrow}
                </Text>
              </TouchableOpacity>
              <Text style={[styles.matchNavInlineCount, { color: isRoyal ? 'rgba(255,255,255,0.8)' : colors.textMuted }]}>
                {`${(activeMatchIndex ?? 0) + 1}/${matchedHadithIds.size}`}
              </Text>
              <TouchableOpacity
                style={styles.matchNavInlineBtn}
                onPress={() => jumpToMatch('next')}
                hitSlop={6}
              >
                <Text style={[styles.matchNavInlineArrow, { color: isRoyal ? '#E6C27A' : colors.highlight }]}>
                  {nextArrow}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <View style={[styles.controlDivider, { backgroundColor: isRoyal ? 'rgba(255,255,255,0.08)' : colors.border }]} />
        <TouchableOpacity
          style={[styles.favoritesButton, { borderColor: isRoyal ? 'rgba(230,194,122,0.4)' : colors.border }]}
          onPress={() => setShowFavoritesModal(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.favoriteStar, { color: isRoyal ? '#E6C27A' : colors.highlight }]}>★</Text>
          <Text style={[styles.favoritesButtonText, { color: isRoyal ? 'rgba(255,255,255,0.9)' : colors.text }]}>
            {getString(language, 'bukhariFavorites')}
            {fullBookmarks.length > 0 ? ` (${fullBookmarks.length})` : ''}
          </Text>
        </TouchableOpacity>

        </View>
      </GlassCard>
      ) : (
      <GlassCard padding="md" rounded="lg" style={styles.pageControlsCollapsed}>
        <View style={styles.collapsedRow}>
          <Text style={[styles.pageText, { color: isRoyal ? 'rgba(255,255,255,0.9)' : colors.text }]}>
            {`${navLabels.page} ${page}/${totalPages}`}
          </Text>
          <View style={styles.collapsedActions}>
            <TouchableOpacity
              hitSlop={12}
              onPress={() => setShowFavoritesModal(true)}
              style={styles.collapsedSearchBtn}
            >
              <Text style={{ fontSize: 18, color: isRoyal ? '#E6C27A' : colors.highlight }}>★</Text>
            </TouchableOpacity>
            <TouchableOpacity
              hitSlop={12}
              onPress={() => setControlsExpanded(true)}
              style={styles.collapsedSearchBtn}
            >
              <Ionicons name="search" size={20} color={isRoyal ? '#E6C27A' : colors.highlight} />
            </TouchableOpacity>
            <TouchableOpacity
              hitSlop={12}
              onPress={() => setControlsExpanded(true)}
              style={styles.controlsToggleBtn}
            >
              <Text style={[styles.controlsToggleText, { color: isRoyal ? '#E6C27A' : colors.highlight }]}>
                {navLabels.showControls} ▼
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </GlassCard>
      )}
    </View>
  );

  const showBackToTop = !loading && !error && hadiths.length > 0 && (scrollOffsetY > 150 || page > 1);
  const showMatchNavFloating =
    !loading &&
    !error &&
    hadiths.length > 0 &&
    normalizedQuery.length > 0 &&
    matchedHadithIds.size > 0;

  return (
    <ScrollAnchorProvider {...scrollAnchorMethods}>
    <ScreenWrapper>
      <View style={styles.screenContent} pointerEvents="box-none">
        {loading ? (
          <View style={[styles.scroll, styles.centered]}>
            {listHeader}
            <ActivityIndicator size="large" color={isRoyal ? '#E6C27A' : colors.highlight} />
          </View>
        ) : error ? (
          <View style={styles.scroll}>
            {listHeader}
            <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
          </View>
        ) : hadiths.length === 0 ? (
          <View style={styles.scroll}>
            {listHeader}
            <Text style={[styles.empty, { color: isRoyal ? 'rgba(255,255,255,0.6)' : colors.textMuted }]}>
              {getString(language, 'bukhariNoHadiths')}
            </Text>
          </View>
        ) : (
          <View style={styles.listWithFab}>
            <FlatList
              ref={setFlatListRef}
              key={`page-${page}-expanded-${controlsExpanded}`}
              keyboardShouldPersistTaps="handled"
              data={pagedHadiths}
              extraData={hadithListExtraData}
              keyExtractor={(item) => item.id}
              renderItem={renderHadith}
              getItemLayout={getItemLayout}
              ListHeaderComponent={listHeader}
              onScroll={(e) => {
                scrollAnchorMethods.onScroll(e);
                const y = e.nativeEvent.contentOffset.y;
                setScrollOffsetY((prev) => {
                  const crossesThreshold = (y > 150) !== (prev > 150);
                  return crossesThreshold || Math.abs(y - prev) > 50 ? y : prev;
                });
              }}
              scrollEventThrottle={100}
              onScrollToIndexFailed={(info) => {
                const { offset } = getItemLayout(null, info.index);
                flatListRef.current?.scrollToOffset({
                  offset: Math.max(0, offset - 80),
                  animated: true,
                });
              }}
              contentContainerStyle={[styles.scroll, { paddingBottom: spacing.xxl + 60 }]}
              initialNumToRender={12}
              maxToRenderPerBatch={10}
              windowSize={7}
              removeClippedSubviews
            />
          </View>
        )}
        {showMatchNavFloating ? (
          <View
            style={[
              styles.matchNavFloating,
              {
                backgroundColor: isRoyal ? 'rgba(10,25,18,0.92)' : colors.surface,
                borderColor: isRoyal ? 'rgba(230,194,122,0.4)' : colors.border,
              },
              isRtl ? styles.matchNavFloatingRight : styles.matchNavFloatingLeft,
            ]}
          >
            <TouchableOpacity
              onPress={() => jumpToMatch('prev')}
              style={styles.matchNavFloatingBtn}
              hitSlop={8}
              accessibilityLabel={navLabels.prev}
            >
              <Text style={[styles.matchNavFloatingArrow, { color: isRoyal ? '#E6C27A' : colors.highlight }]}>
                {prevArrow}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.matchNavFloatingCount, { color: isRoyal ? 'rgba(255,255,255,0.9)' : colors.textMuted }]}>
              {`${(activeMatchIndex ?? 0) + 1}/${matchedHadithIds.size}`}
            </Text>
            <TouchableOpacity
              onPress={() => jumpToMatch('next')}
              style={styles.matchNavFloatingBtn}
              hitSlop={8}
              accessibilityLabel={navLabels.next}
            >
              <Text style={[styles.matchNavFloatingArrow, { color: isRoyal ? '#E6C27A' : colors.highlight }]}>
                {nextArrow}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {showBackToTop ? (
          <TouchableOpacity
            style={[
              styles.backToTopButton,
              {
                backgroundColor: isRoyal ? '#E6C27A' : colors.surface,
                borderColor: isRoyal ? 'rgba(230,194,122,0.6)' : colors.border,
              },
              isRtl ? styles.backToTopLeft : styles.backToTopRight,
            ]}
            onPress={() => {
              setPage(1);
              flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
            }}
            activeOpacity={0.85}
            accessibilityLabel={getString(language, 'backToTop')}
            accessibilityRole="button"
          >
            <Ionicons name="chevron-up" size={28} color={isRoyal ? 'rgba(10,25,18,0.95)' : colors.text} />
          </TouchableOpacity>
        ) : null}
        {isNavigatingToFavorite ? (
          <View style={styles.favoriteLoadingOverlay} pointerEvents="auto">
            <ActivityIndicator size="large" color={isRoyal ? '#E6C27A' : colors.highlight} />
          </View>
        ) : null}
      </View>

      <Modal
        visible={showFavoritesModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFavoritesModal(false)}
      >
        <Pressable style={styles.favoritesModalOverlay} onPress={() => setShowFavoritesModal(false)}>
          <Pressable
            style={[styles.favoritesModalContent, { backgroundColor: isRoyal ? 'rgba(10,25,18,0.98)' : colors.background }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.favoritesModalHeader, { borderBottomColor: isRoyal ? 'rgba(230,194,122,0.2)' : colors.border }]}>
              <Text style={[styles.favoritesModalTitle, { color: isRoyal ? '#E6C27A' : colors.text }]}>
                {getString(language, 'bukhariFavorites')}
              </Text>
              <TouchableOpacity
                style={styles.favoritesModalCloseBtn}
                onPress={() => setShowFavoritesModal(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={[styles.favoritesModalCloseText, { color: colors.highlight }]}>
                  {getString(language, 'cancel')}
                </Text>
              </TouchableOpacity>
            </View>
            {fullBookmarks.length > 0 ? (
              <FlatList
                data={fullBookmarks}
                keyExtractor={(b) => b.hadithId}
                renderItem={({ item: b }) => (
                  <TouchableOpacity
                    style={[styles.favoritesModalItem, { borderBottomColor: isRoyal ? 'rgba(255,255,255,0.06)' : colors.border }]}
                    onPress={() => {
                      setShowFavoritesModal(false);
                      onFavoritePress(b);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.favoriteStar, { color: isRoyal ? '#E6C27A' : colors.highlight }]}>★</Text>
                    <Text style={[styles.favoritesModalItemText, { color: isRoyal ? 'rgba(255,255,255,0.95)' : colors.text }]}>
                      {`${getString(language, 'bukhariHadith')} #${b.hadithNumber}`}
                    </Text>
                  </TouchableOpacity>
                )}
                keyboardShouldPersistTaps="handled"
              />
            ) : (
              <View style={styles.favoritesModalEmpty}>
                <Text style={[styles.favoritesEmpty, { color: isRoyal ? 'rgba(255,255,255,0.5)' : colors.textMuted }]}>
                  {getString(language, 'bukhariNoFavorites')}
                </Text>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenWrapper>
    </ScrollAnchorProvider>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  backWrap: { paddingTop: spacing.sm, paddingBottom: spacing.xs },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.regular,
    fontFamily: fontFamily.heading,
    marginBottom: spacing.xs,
  },
  listHeaderContainer: {
    width: '100%',
    maxWidth: '100%',
  },
  pageControls: { marginTop: spacing.xs, marginBottom: spacing.md, maxWidth: '100%' },
  controlsContentWrap: {
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
  },
  controlsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: spacing.xs,
  },
  controlsHeaderSpacer: { flex: 1 },
  controlsToggleBtn: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  controlsToggleText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  pageControlsCollapsed: { marginTop: spacing.xs, marginBottom: spacing.md },
  collapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageRow: {
    position: 'relative',
    minHeight: 62,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    overflow: 'hidden' as const,
  },
  pageLeftGroup: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pageRightGroup: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pageButton: {
    width: 48,
    height: 62,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageButtonDouble: {
    width: 36,
    height: 62,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageButtonDoubleText: { fontSize: 24, fontWeight: '700', lineHeight: 24 },
  pinLeft: { position: 'absolute', left: 0 },
  pinRight: { position: 'absolute', right: 0 },
  pageButtonDisabled: { opacity: 0.35 },
  pageButtonText: { fontSize: 34, fontWeight: '700', lineHeight: 34 },
  arrowGlyph: {
    writingDirection: 'ltr',
    textAlign: 'center',
  },
  pageButtonLabel: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: fontWeight.medium,
  },
  pageCenter: {
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  pageCenterLabel: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: fontWeight.medium,
  },
  controlDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 2,
    marginHorizontal: -spacing.lg,
  },
  searchIconWrap: { paddingRight: spacing.xs, justifyContent: 'center' },
  collapsedActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  collapsedSearchBtn: { padding: spacing.xs },
  jumpRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minWidth: 0 },
  jumpInput: {
    flex: 1,
    minWidth: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.sm,
  },
  jumpButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  jumpButtonText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  matchNavInline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.xs,
    gap: 2,
    flexShrink: 0,
  },
  matchNavInlineBtn: { padding: 4 },
  matchNavInlineArrow: { fontSize: 16, fontWeight: '700', lineHeight: 18 },
  matchNavInlineCount: { fontSize: 11, fontWeight: fontWeight.medium, minWidth: 28, textAlign: 'center' },
  favoritesTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, marginBottom: spacing.xxs },
  favoritesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  favoritesButtonText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, marginLeft: spacing.xs },
  favoritesModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
  },
  favoritesModalContent: {
    flex: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  favoritesModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  favoritesModalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    fontFamily: fontFamily.heading,
  },
  favoritesModalCloseBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.xs },
  favoritesModalCloseText: { fontSize: fontSize.md, fontWeight: fontWeight.medium },
  favoritesModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  favoritesModalItemText: { fontSize: fontSize.md, flex: 1, marginLeft: spacing.sm },
  favoritesModalEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  favoriteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.xs,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.xxs,
  },
  favoriteStar: { fontSize: 14, marginRight: spacing.xs },
  favoriteLabel: { fontSize: fontSize.xs, flex: 1 },
  favoritesEmpty: { fontSize: fontSize.xs, fontStyle: 'italic' },
  centered: { paddingVertical: spacing.xxl, alignItems: 'center' },
  cardTouch: { marginBottom: spacing.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  hadithNumber: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  bookmark: { fontSize: 21, fontWeight: '700' },
  hadithText: {
    fontSize: fontSize.md,
    lineHeight: Math.round(fontSize.md * lineHeight.relaxed),
    fontFamily: fontFamily.body,
  },
  sourceText: {
    marginTop: spacing.sm,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  error: { fontSize: fontSize.sm, marginTop: spacing.sm },
  empty: { fontSize: fontSize.sm, marginTop: spacing.sm },
  screenContent: { flex: 1 },
  favoriteLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  listWithFab: { flex: 1, position: 'relative' },
  backToTopButton: {
    position: 'absolute',
    bottom: spacing.xl + 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 1000,
  },
  backToTopRight: { right: spacing.lg },
  backToTopLeft: { left: spacing.lg },
  matchNavFloating: {
    position: 'absolute',
    bottom: spacing.xl + 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 999,
  },
  matchNavFloatingLeft: { left: spacing.lg },
  matchNavFloatingRight: { right: spacing.lg },
  matchNavFloatingBtn: { padding: spacing.xs },
  matchNavFloatingArrow: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  matchNavFloatingCount: { fontSize: fontSize.sm, marginHorizontal: spacing.sm, minWidth: 44, textAlign: 'center' },
});
