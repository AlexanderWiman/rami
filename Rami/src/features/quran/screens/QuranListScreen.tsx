/**
 * Reading Sanctuary — Quran list with soft glass cards and serene typography.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from "expo-router/react-navigation";
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '../../../theme/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useDockVisibility } from '../../../components/SacredDock';
import { ScreenWrapper } from '../../../components/ScreenWrapper';
import { BackToHomeBar } from '../../../components/BackToHomeBar';
import { GlassCard } from '../../../components/GlassCard';
import {
  loadSelectedReciter,
  saveSelectedReciter,
  loadQuranDisplayMode,
  saveQuranDisplayMode,
  loadQuranSurahLayout,
  saveQuranSurahLayout,
  type QuranDisplayMode,
  type QuranSurahLayout,
} from '../storage/quranStorage';
import { SURAH_LIST, searchSurahs, type SurahMeta } from '../data/surahs';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { downloadFullQuranText, isQuranTextDownloaded } from '../utils/quranTextCache';
import {
  downloadSurahAudio,
  downloadFullQuranAudio,
  isFullQuranAudioDownloaded,
  getDownloadedSurahs,
} from '../utils/quranAudioCache';
import { getString, getReciterLabel } from '../../../constants/i18n';
import { QuranSelectModal, type SelectItem } from '../components/QuranSelectModal';
import { QURAN_RECITERS } from '../constants/reciters';
import { spacing, radius } from '../../../theme/spacing';
import { fontSize, fontWeight, fontFamily, lineHeight } from '../../../theme/typography';

const SCROLL_UP_THRESHOLD = 30;
const lastScrollY = { current: 0 };

export function QuranListScreen() {
  const { colors, pageBackground, style: themeStyle } = useTheme();
  const isRoyal = themeStyle === 'royal';
  const { language } = useLanguage();
  const { showDock } = useDockVisibility();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [pendingSurah, setPendingSurah] = useState<number | null>(null);
  const [quranDownloaded, setQuranDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ done: number; total: number } | null>(null);
  const [audioDownloaded, setAudioDownloaded] = useState(false);
  const [audioDownloading, setAudioDownloading] = useState(false);
  const [audioProgress, setAudioProgress] = useState<{ done: number; total: number } | null>(null);
  const [selectedReciter, setSelectedReciter] = useState<string | null>(null);
  const [showReciters, setShowReciters] = useState(false);
  /** The offline card is long; it stays folded away until asked for. */
  const [offlineOpen, setOfflineOpen] = useState(false);

  const reciterItems = useMemo<SelectItem[]>(
    () =>
      QURAN_RECITERS.map((r) => ({
        key: r.id,
        label: language === 'ar' ? r.nameAr : r.nameEn,
        sublabel: language === 'ar' ? r.nameEn : r.nameAr,
      })),
    [language]
  );
  const [downloadedSurahs, setDownloadedSurahs] = useState<Set<number>>(new Set());
  const [downloadingSurah, setDownloadingSurah] = useState<number | null>(null);
  const [surahProgress, setSurahProgress] = useState<{ done: number; total: number } | null>(null);
  const [displayMode, setDisplayMode] = useState<QuranDisplayMode>('verse');
  const [surahLayout, setSurahLayout] = useState<QuranSurahLayout>('grid');

  useEffect(() => {
    loadQuranDisplayMode().then(setDisplayMode);
    loadQuranSurahLayout().then(setSurahLayout);
  }, []);

  const toggleSurahLayout = useCallback(async () => {
    const next: QuranSurahLayout = surahLayout === 'grid' ? 'list' : 'grid';
    setSurahLayout(next);
    await saveQuranSurahLayout(next);
  }, [surahLayout]);

  useEffect(() => {
    Promise.all([
      isQuranTextDownloaded().then(setQuranDownloaded),
      loadSelectedReciter().then(async (reciter) => {
        setSelectedReciter(reciter);
        const full = await isFullQuranAudioDownloaded(reciter);
        setAudioDownloaded(full);
        const surahs = await getDownloadedSurahs(reciter);
        setDownloadedSurahs(full ? new Set(SURAH_LIST.map((s) => s.number)) : surahs);
      }),
    ]).finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      setPendingSurah(null);
      loadSelectedReciter().then(async (r) => {
        setSelectedReciter(r);
        const full = await isFullQuranAudioDownloaded(r);
        setAudioDownloaded(full);
        const surahs = await getDownloadedSurahs(r);
        setDownloadedSurahs(full ? new Set(SURAH_LIST.map((s) => s.number)) : surahs);
      });
    }, [])
  );

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      if (y < lastScrollY.current - SCROLL_UP_THRESHOLD && y > 50) showDock();
      lastScrollY.current = y;
    },
    [showDock]
  );

  const list = SURAH_LIST;
  const searchResults = modalSearch.trim() ? searchSurahs(modalSearch, language) : SURAH_LIST;

  const handleDownloadAudio = useCallback(async () => {
    if (audioDownloading || audioDownloaded) return;
    Alert.alert(
      getString(language, 'downloadQuranAudioFull'),
      getString(language, 'downloadQuranAudioFullConfirm'),
      [
        { text: getString(language, 'cancel'), style: 'cancel' },
        {
          text: getString(language, 'download'),
          onPress: async () => {
            const reciter = await loadSelectedReciter();
            setAudioDownloading(true);
            setAudioProgress({ done: 0, total: 6236 });
            await activateKeepAwakeAsync('quran-audio-download');
            downloadFullQuranAudio(reciter, (done, total) => setAudioProgress({ done, total }))
              .then((result) => {
                setAudioProgress(null);
                if (result.success) {
                  setAudioDownloaded(true);
                  setDownloadedSurahs(new Set(SURAH_LIST.map((s) => s.number)));
                  Alert.alert(
                    getString(language, 'quranAudioFullDownloaded'),
                    getString(language, 'downloadQuranAudioFullDone')
                  );
                } else {
                  Alert.alert(
                    getString(language, 'error'),
                    result.error ?? getString(language, 'downloadQuranAudioError')
                  );
                }
              })
              .finally(() => {
                deactivateKeepAwake('quran-audio-download');
                setAudioDownloading(false);
                setAudioProgress(null);
              });
          },
        },
      ]
    );
  }, [audioDownloading, audioDownloaded, language]);

  const handleDownloadSurah = useCallback(
    async (surahNumber: number) => {
      if (downloadingSurah || !selectedReciter || downloadedSurahs.has(surahNumber)) return;
      setDownloadingSurah(surahNumber);
      setSurahProgress({ done: 0, total: SURAH_LIST.find((s) => s.number === surahNumber)?.ayahCount ?? 0 });
      await activateKeepAwakeAsync('quran-surah-download');
      try {
        const result = await downloadSurahAudio(selectedReciter, surahNumber, (done, total) =>
          setSurahProgress({ done, total })
        );
        if (result.success) {
          setDownloadedSurahs((prev) => new Set([...prev, surahNumber]));
          const full = await isFullQuranAudioDownloaded(selectedReciter);
          setAudioDownloaded(full);
        } else {
          Alert.alert(getString(language, 'error'), result.error ?? getString(language, 'downloadQuranAudioError'));
        }
      } finally {
        deactivateKeepAwake('quran-surah-download');
        setDownloadingSurah(null);
        setSurahProgress(null);
      }
    },
    [downloadingSurah, selectedReciter, downloadedSurahs, language]
  );

  const handleDownloadQuran = useCallback(() => {
    if (downloading || quranDownloaded) return;
    setDownloading(true);
    setDownloadProgress({ done: 0, total: 114 });
    downloadFullQuranText((completed, total) => {
      setDownloadProgress({ done: completed, total });
    })
      .then((result) => {
        setDownloadProgress(null);
        if (result.success) {
          setQuranDownloaded(true);
          Alert.alert(
            getString(language, 'quranDownloaded'),
            getString(language, 'downloadQuranDone')
          );
        } else {
          Alert.alert(
            getString(language, 'error'),
            result.error ?? getString(language, 'downloadQuranError')
          );
        }
      })
      .finally(() => {
        setDownloading(false);
        setDownloadProgress(null);
      });
  }, [downloading, quranDownloaded, language]);

  /** Compact tile for the 3-per-row grid: number, name, verse count. */
  const renderGridItem = useCallback(
    ({ item, index }: { item: SurahMeta; index: number }) => {
      const isDownloaded = downloadedSurahs.has(item.number);
      const isPending = pendingSurah === item.number;
      return (
        <Animated.View entering={FadeIn.delay(Math.min(index, 20) * 20).duration(260)} style={styles.gridCell}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              if (pendingSurah !== null) return;
              setPendingSurah(item.number);
              setTimeout(() => {
                router.push(`/quran/${item.number}` as const);
              }, 0);
            }}
            disabled={isPending}
          >
            <GlassCard
              padding="sm"
              rounded="lg"
              style={styles.gridCard}
              fillColor={isPending ? colors.highlightGlow : undefined}
              strokeColor={isPending ? colors.highlight : undefined}
            >
              <View style={styles.gridTopRow}>
                <Text style={[styles.gridNum, { color: colors.highlight }]}>{item.number}</Text>
                {isPending ? (
                  <ActivityIndicator size="small" color={colors.highlight} />
                ) : isDownloaded ? (
                  <Ionicons name="checkmark-circle" size={14} color={colors.highlight} />
                ) : (
                  <View style={styles.gridBadgePlaceholder} />
                )}
              </View>
              <Text
                style={[styles.gridName, { color: isRoyal ? 'rgba(255,255,255,0.95)' : colors.text }]}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {language === 'ar' ? item.nameAr : item.nameEn}
              </Text>
              <Text style={[styles.gridAyahs, { color: isRoyal ? 'rgba(255,255,255,0.6)' : colors.textMuted }]}>
                {item.ayahCount}
              </Text>
            </GlassCard>
          </TouchableOpacity>
        </Animated.View>
      );
    },
    [language, router, colors, pendingSurah, downloadedSurahs, isRoyal]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: SurahMeta; index: number }) => {
      const isDownloaded = downloadedSurahs.has(item.number);
      const isDownloading = downloadingSurah === item.number;
      const progress = isDownloading && surahProgress ? `${surahProgress.done}/${surahProgress.total}` : null;
      return (
        <Animated.View entering={FadeIn.delay(index * 30).duration(280)}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              if (pendingSurah !== null || isDownloading) return;
              setPendingSurah(item.number);
              setTimeout(() => {
                router.push(`/quran/${item.number}` as const);
              }, 0);
            }}
            style={styles.surahTouch}
            disabled={pendingSurah === item.number}
          >
            <GlassCard
              padding="md"
              rounded="lg"
              style={styles.surahCard}
              fillColor={pendingSurah === item.number ? colors.highlightGlow : undefined}
              strokeColor={pendingSurah === item.number ? colors.highlight : undefined}
            >
              <View style={styles.surahRow}>
                <View style={styles.surahNumWrap}>
                  <Text style={[styles.surahNum, { color: colors.highlight }]}>{item.number}</Text>
                </View>
                <View style={styles.surahNames}>
                  <Text style={[styles.surahName, { color: isRoyal ? 'rgba(255,255,255,0.95)' : colors.text }]}>
                    {language === 'ar' ? item.nameAr : item.nameEn}
                  </Text>
                  <Text style={[styles.surahAyahs, { color: isRoyal ? 'rgba(255,255,255,0.6)' : colors.textMuted }]}>
                    {item.ayahCount} {getString(language, 'verses')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.downloadSurahBtn}
                  onPress={() => void handleDownloadSurah(item.number)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  disabled={isDownloading || isDownloaded}
                >
                  {isDownloading ? (
                    <View style={styles.downloadSurahProgress}>
                      <ActivityIndicator size="small" color={colors.highlight} />
                      {progress && (
                        <Text style={[styles.downloadSurahProgressText, { color: colors.textMuted }]}>{progress}</Text>
                      )}
                    </View>
                  ) : isDownloaded ? (
                    <Ionicons name="checkmark-circle" size={22} color={colors.highlight} />
                  ) : (
                    <Ionicons
                      name="cloud-download-outline"
                      size={22}
                      color={isRoyal ? 'rgba(255,255,255,0.6)' : colors.textMuted}
                    />
                  )}
                </TouchableOpacity>
                <View style={styles.chevronWrap}>
                  {pendingSurah === item.number ? (
                    <ActivityIndicator size="small" color={isRoyal ? 'rgba(255,255,255,0.6)' : colors.textMuted} />
                  ) : (
                    <Text style={[styles.chevron, { color: isRoyal ? 'rgba(255,255,255,0.6)' : colors.textMuted }]}>›</Text>
                  )}
                </View>
              </View>
            </GlassCard>
          </TouchableOpacity>
        </Animated.View>
      );
    },
    [language, router, colors, pendingSurah, downloadedSurahs, downloadingSurah, surahProgress, handleDownloadSurah, isRoyal]
  );

  if (loading) {
    return (
      <ScreenWrapper>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.highlight} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: spacing.xxl + 72 }]}
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={80}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerHomeRow}>
            <BackToHomeBar />
            <View style={styles.headerActions}>
            <TouchableOpacity
              style={[
                styles.searchIconBtn,
                {
                  backgroundColor: isRoyal ? 'rgba(230,194,122,0.35)' : colors.highlightGlow,
                  borderWidth: 1,
                  borderColor: isRoyal ? 'rgba(230,194,122,0.6)' : colors.highlight,
                },
              ]}
              onPress={() => {
                setModalSearch('');
                setShowSearchModal(true);
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="search" size={22} color={isRoyal ? 'rgba(230,194,122,0.95)' : colors.highlight} />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={getString(language, surahLayout === 'grid' ? 'quranLayoutList' : 'quranLayoutGrid')}
              style={[
                styles.searchIconBtn,
                {
                  backgroundColor: isRoyal ? 'rgba(230,194,122,0.35)' : colors.highlightGlow,
                  borderWidth: 1,
                  borderColor: isRoyal ? 'rgba(230,194,122,0.6)' : colors.highlight,
                },
              ]}
              onPress={() => void toggleSurahLayout()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons
                name={surahLayout === 'grid' ? 'list' : 'grid'}
                size={20}
                color={isRoyal ? 'rgba(230,194,122,0.95)' : colors.highlight}
              />
            </TouchableOpacity>
            </View>
          </View>
          <View style={styles.headerTitleRow}>
            <Text style={[styles.title, { color: colors.text }]}>
              {getString(language, 'readingSanctuary')}
            </Text>
          </View>
        </View>
        <View style={styles.viewModeRow}>
          <TouchableOpacity
            style={[
              styles.viewModeChip,
              { backgroundColor: isRoyal ? 'rgba(10, 25, 18, 0.5)' : colors.surfaceGlass, borderColor: isRoyal ? 'rgba(255,255,255,0.15)' : colors.border },
              displayMode === 'verse' && { backgroundColor: isRoyal ? 'rgba(230,194,122,0.22)' : colors.highlightGlow, borderColor: isRoyal ? 'rgba(230,194,122,0.5)' : colors.highlight },
            ]}
            onPress={async () => {
              setDisplayMode('verse');
              await saveQuranDisplayMode('verse');
            }}
          >
            <Text style={[styles.viewModeChipText, { color: displayMode === 'verse' ? (isRoyal ? '#E6C27A' : colors.highlight) : colors.text }]}>
              {getString(language, 'quranViewByVerse')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewModeChip,
              { backgroundColor: isRoyal ? 'rgba(10, 25, 18, 0.5)' : colors.surfaceGlass, borderColor: isRoyal ? 'rgba(255,255,255,0.15)' : colors.border },
              displayMode === 'page' && { backgroundColor: isRoyal ? 'rgba(230,194,122,0.22)' : colors.highlightGlow, borderColor: isRoyal ? 'rgba(230,194,122,0.5)' : colors.highlight },
            ]}
            onPress={async () => {
              setDisplayMode('page');
              await saveQuranDisplayMode('page');
              router.push('/(tabs)/quran/page/1' as const);
            }}
          >
            <Text style={[styles.viewModeChipText, { color: displayMode === 'page' ? (isRoyal ? '#E6C27A' : colors.highlight) : colors.text }]}>
              {getString(language, 'quranViewByPage')}
            </Text>
          </TouchableOpacity>
        </View>
        <GlassCard padding="lg" rounded="lg" style={styles.downloadCard}>
          <TouchableOpacity
            style={styles.downloadCardHeader}
            onPress={() => setOfflineOpen((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded: offlineOpen }}
            activeOpacity={0.7}
          >
            <Text style={[styles.downloadCardTitle, { color: isRoyal ? 'rgba(255,255,255,0.7)' : colors.textMuted }]}>
              {getString(language, 'downloadForOffline')}
            </Text>
            <Ionicons
              name={offlineOpen ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={isRoyal ? 'rgba(255,255,255,0.7)' : colors.textMuted}
            />
          </TouchableOpacity>

          {offlineOpen && (
          <>
          {/* Text row */}
          <TouchableOpacity
            style={styles.downloadRow}
            onPress={handleDownloadQuran}
            disabled={downloading || quranDownloaded}
            activeOpacity={0.7}
          >
            <Ionicons
              name="document-text"
              size={24}
              color={quranDownloaded ? colors.highlight : (isRoyal ? 'rgba(255,255,255,0.5)' : colors.textMuted)}
              style={styles.downloadRowIcon}
            />
            <View style={styles.downloadRowContent}>
              <Text style={[styles.downloadRowLabel, { color: isRoyal ? 'rgba(255,255,255,0.95)' : colors.text }]}>
                {getString(language, 'downloadLabelText')}
              </Text>
              <Text style={[styles.downloadRowSize, { color: isRoyal ? 'rgba(255,255,255,0.6)' : colors.textMuted }]}>
                {getString(language, 'downloadQuranSize')}
              </Text>
            </View>
            {downloading ? (
              <ActivityIndicator size="small" color={colors.highlight} />
            ) : quranDownloaded ? (
              <Ionicons name="checkmark-circle" size={24} color={colors.highlight} />
            ) : (
              <Text style={[styles.downloadRowAction, { color: colors.highlight }]}>
                {getString(language, 'download')}
              </Text>
            )}
          </TouchableOpacity>
          {downloading && (
            <View style={[styles.progressBarTrack, { backgroundColor: isRoyal ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }]}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${((downloadProgress?.done ?? 0) / (downloadProgress?.total ?? 114)) * 100}%`,
                    backgroundColor: colors.highlight,
                  },
                ]}
              />
            </View>
          )}

          {/* Audio – per-surah download */}
          <TouchableOpacity
            style={[styles.downloadRow, styles.downloadRowBorder, { borderTopColor: isRoyal ? 'rgba(255,255,255,0.12)' : colors.border }]}
            onPress={() => setShowReciters(true)}
            accessibilityRole="button"
            accessibilityLabel={getString(language, 'selectReciter')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="musical-notes"
              size={24}
              color={audioDownloaded ? colors.highlight : (isRoyal ? 'rgba(255,255,255,0.5)' : colors.textMuted)}
              style={styles.downloadRowIcon}
            />
            <View style={styles.downloadRowContent}>
              <Text style={[styles.downloadRowLabel, { color: isRoyal ? 'rgba(255,255,255,0.95)' : colors.text }]}>
                {getString(language, 'downloadLabelAudio')}
              </Text>
              <Text style={[styles.downloadRowSize, { color: isRoyal ? 'rgba(255,255,255,0.6)' : colors.textMuted }]}>
                {selectedReciter ? `${getReciterLabel(language, selectedReciter)} • ` : ''}{getString(language, 'downloadSurahHint')}
              </Text>
            </View>
            {audioDownloaded ? (
              <Ionicons name="checkmark-circle" size={24} color={colors.highlight} />
            ) : (
              <Ionicons name="swap-horizontal" size={20} color={isRoyal ? 'rgba(255,255,255,0.6)' : colors.textMuted} />
            )}
          </TouchableOpacity>
          {!audioDownloaded && (
            <TouchableOpacity
              style={styles.downloadAllLink}
              onPress={() => void handleDownloadAudio()}
              disabled={audioDownloading}
            >
              <Text style={[styles.downloadAllLinkText, { color: colors.highlight }]}>
                {getString(language, 'downloadQuranAudioFull')} (~500 MB)
              </Text>
            </TouchableOpacity>
          )}
          {audioDownloading && (
            <>
              <View style={[styles.progressBarTrack, { backgroundColor: isRoyal ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(100, ((audioProgress?.done ?? 0) / (audioProgress?.total ?? 1)) * 100)}%`,
                      backgroundColor: colors.highlight,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.downloadHint, { color: isRoyal ? 'rgba(255,255,255,0.5)' : colors.textMuted }]}>
                {getString(language, 'downloadKeepAppOpen')}
              </Text>
            </>
          )}
          </>
          )}
        </GlassCard>
        <FlatList
          // numColumns cannot change on the fly, so remount when the layout flips.
          key={surahLayout}
          data={list}
          keyExtractor={(item) => String(item.number)}
          renderItem={surahLayout === 'grid' ? renderGridItem : renderItem}
          numColumns={surahLayout === 'grid' ? 3 : 1}
          columnWrapperStyle={surahLayout === 'grid' ? styles.gridRow : undefined}
          extraData={{ pendingSurah, downloadedSurahs, downloadingSurah, surahProgress, surahLayout }}
          scrollEnabled={false}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: isRoyal ? 'rgba(255,255,255,0.6)' : colors.textMuted }]}>{getString(language, 'noResults')}</Text>
          }
        />
      </ScrollView>

      <Modal
        visible={showSearchModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSearchModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowSearchModal(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: isRoyal ? 'rgba(10,25,18,0.98)' : colors.background }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.modalHeader, { borderBottomColor: isRoyal ? 'rgba(230,194,122,0.2)' : colors.border }]}>
              <TextInput
                style={[
                  styles.modalSearchInput,
                  {
                    backgroundColor: isRoyal ? 'rgba(255,255,255,0.08)' : colors.surfaceGlass,
                    color: isRoyal ? 'rgba(255,255,255,0.95)' : colors.text,
                    borderColor: isRoyal ? 'rgba(230,194,122,0.25)' : colors.border,
                  },
                ]}
                placeholder={getString(language, 'search')}
                placeholderTextColor={isRoyal ? 'rgba(255,255,255,0.5)' : colors.textMuted}
                value={modalSearch}
                onChangeText={setModalSearch}
                autoFocus
                returnKeyType="search"
              />
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowSearchModal(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={[styles.modalCloseText, { color: colors.highlight }]}>{getString(language, 'cancel')}</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={searchResults}
              keyExtractor={(item) => `search-${item.number}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalResultItem, { borderBottomColor: isRoyal ? 'rgba(255,255,255,0.06)' : colors.border }]}
                  onPress={() => {
                    setShowSearchModal(false);
                    setPendingSurah(item.number);
                    setTimeout(() => router.push(`/quran/${item.number}` as const), 0);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.modalResultNum, { color: colors.highlight }]}>{item.number}</Text>
                  <Text style={[styles.modalResultName, { color: isRoyal ? 'rgba(255,255,255,0.95)' : colors.text }]}>
                    {language === 'ar' ? item.nameAr : item.nameEn}
                  </Text>
                  <Text style={[styles.modalResultAyahs, { color: isRoyal ? 'rgba(255,255,255,0.5)' : colors.textMuted }]}>
                    {item.ayahCount} {getString(language, 'verses')}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={[styles.modalEmpty, { color: isRoyal ? 'rgba(255,255,255,0.5)' : colors.textMuted }]}>
                  {getString(language, 'noResults')}
                </Text>
              }
              keyboardShouldPersistTaps="handled"
            />
          </Pressable>
        </Pressable>
      </Modal>

      <QuranSelectModal
        visible={showReciters}
        title={getString(language, 'selectReciter')}
        items={reciterItems}
        selectedKey={selectedReciter ?? undefined}
        onSelect={(id) => {
          setShowReciters(false);
          setSelectedReciter(id);
          void saveSelectedReciter(id);
        }}
        onClose={() => setShowReciters(false)}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: spacing.lg, paddingBottom: spacing.sm },
  // The icon buttons sit on the "home" row, which is otherwise empty on the
  // right. That leaves the title the full width — it is a single long word in
  // several languages and would otherwise break mid-word.
  headerHomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  searchIconBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.regular,
    fontFamily: fontFamily.heading,
  },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  search: {
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: fontSize.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
  },
  modalContent: {
    flex: 1,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalSearchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: fontSize.md,
  },
  modalCloseBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  modalCloseText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  modalResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  modalResultNum: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    minWidth: 28,
  },
  modalResultName: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  modalResultAyahs: {
    fontSize: fontSize.sm,
  },
  modalEmpty: {
    padding: spacing.xl,
    textAlign: 'center',
    fontSize: fontSize.md,
  },
  viewModeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  viewModeChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  viewModeChipText: { fontSize: fontSize.sm },
  downloadCard: {
    marginBottom: spacing.lg,
  },
  downloadCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
  },
  downloadCardTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.md,
  },
  downloadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    minHeight: 44,
  },
  downloadRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
    marginTop: spacing.xs,
  },
  downloadRowIcon: {
    marginRight: spacing.md,
  },
  downloadRowContent: {
    flex: 1,
  },
  downloadRowLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  downloadRowSize: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  downloadRowAction: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  progressBarTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  downloadHint: {
    fontSize: 11,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  surahTouch: { marginBottom: Platform.OS === 'android' ? spacing.xxs : spacing.xs },
  gridRow: { gap: spacing.xs },
  gridCell: { flex: 1, marginBottom: spacing.xs },
  gridCard: { minHeight: 96 },
  gridTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xxs,
  },
  gridNum: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  gridBadgePlaceholder: { width: 14, height: 14 },
  gridName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    lineHeight: 20,
    textAlign: 'center',
  },
  gridAyahs: { fontSize: 11, textAlign: 'center', marginTop: 2 },
  surahCard: {},
  surahRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  surahCardPending: {},
  surahNumWrap: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surahNum: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    lineHeight: Math.round(fontSize.md * lineHeight.tight),
    textAlign: 'center',
  },
  surahNames: {
    flex: 1,
    marginLeft: spacing.sm,
    justifyContent: 'center',
  },
  surahName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    lineHeight: Math.round(fontSize.md * lineHeight.tight),
  },
  surahAyahs: {
    fontSize: fontSize.xs,
    marginTop: 4,
    lineHeight: Math.round(fontSize.xs * lineHeight.tight),
  },
  downloadSurahBtn: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  downloadSurahProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  downloadSurahProgressText: {
    fontSize: 11,
  },
  downloadAllLink: {
    paddingVertical: spacing.xs,
    paddingLeft: 24 + spacing.md,
    marginTop: -spacing.xs,
  },
  downloadAllLinkText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  chevronWrap: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: { fontSize: fontSize.lg },
  empty: { marginTop: spacing.lg, fontSize: fontSize.sm },
});
