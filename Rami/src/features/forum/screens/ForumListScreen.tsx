/**
 * Forum List Screen — displays all threads in a list with cards.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useDockVisibility } from '../../../components/SacredDock';
import { ScreenWrapper } from '../../../components/ScreenWrapper';
import { BackToHomeBar } from '../../../components/BackToHomeBar';
import { GlassCard } from '../../../components/GlassCard';
import { getThreads } from '../api';
import { loadFavoriteThreadIds, toggleFavoriteThread } from '../storage/forumFavorites';
import type { Thread } from '../types';
import { spacing, radius } from '../../../theme/spacing';
import { fontSize, fontWeight, fontFamily } from '../../../theme/typography';
import { LOCALE_BY_LANGUAGE } from '../../../constants/i18n';
import { hapticSelection } from '../../../utils/haptics';

const SCROLL_UP_THRESHOLD = 30;
const lastScrollY = { current: 0 };

// i18n for forum
const forumStrings = {
  en: {
    title: 'Community',
    noThreads: 'No posts yet',
    pinned: 'Pinned',
    loadError: 'Failed to load posts',
    retry: 'Retry',
    favorites: 'Favourites',
    showAll: 'All',
    noFavorites: 'No favourites yet — tap the star on a post to save it',
  },
  ar: {
    title: 'المجتمع',
    noThreads: 'لا توجد منشورات بعد',
    pinned: 'مثبت',
    loadError: 'فشل في تحميل المنشورات',
    retry: 'إعادة المحاولة',
    favorites: 'المفضلة',
    showAll: 'الكل',
    noFavorites: 'لا توجد مفضلة بعد — اضغط على النجمة لحفظ المنشور',
  },
  tr: {
    title: 'Topluluk',
    noThreads: 'Henüz gönderi yok',
    pinned: 'Sabitlenmiş',
    loadError: 'Gönderiler yüklenemedi',
    retry: 'Tekrar dene',
    favorites: 'Favoriler',
    showAll: 'Tümü',
    noFavorites: 'Henüz favori yok — kaydetmek için yıldıza dokun',
  },
  fr: { title: 'Communauté', noThreads: 'Aucune publication', pinned: 'Épinglé', loadError: 'Échec du chargement', retry: 'Réessayer', favorites: 'Favoris', showAll: 'Tout', noFavorites: 'Aucun favori — touchez l’étoile pour enregistrer' },
  es: { title: 'Comunidad', noThreads: 'Sin publicaciones', pinned: 'Fijado', loadError: 'Error al cargar', retry: 'Reintentar', favorites: 'Favoritos', showAll: 'Todo', noFavorites: 'Sin favoritos — toca la estrella para guardar' },
  sv: { title: 'Gemenskap', noThreads: 'Inga inlägg än', pinned: 'Fastnaglad', loadError: 'Kunde inte ladda', retry: 'Försök igen', favorites: 'Favoriter', showAll: 'Alla', noFavorites: 'Inga favoriter än — tryck på stjärnan för att spara' },
  de: { title: 'Community', noThreads: 'Noch keine Beiträge', pinned: 'Angeheftet', loadError: 'Laden fehlgeschlagen', retry: 'Erneut versuchen', favorites: 'Favoriten', showAll: 'Alle', noFavorites: 'Noch keine Favoriten — tippe auf den Stern zum Speichern' },
};

export function ForumListScreen() {
  const { colors, style: themeStyle } = useTheme();
  const isRoyal = themeStyle === 'royal';
  const { language } = useLanguage();
  const { showDock } = useDockVisibility();
  const router = useRouter();
  
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const strings = forumStrings[language] || forumStrings.en;

  const loadThreads = useCallback(async () => {
    try {
      setError(null);
      const data = await getThreads({ category: 'community' });
      setThreads(data);
    } catch (err) {
      setError(strings.loadError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [strings.loadError]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  // Favourites live on the device, so re-read them whenever the list is shown.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadFavoriteThreadIds().then((ids) => {
        if (active) setFavoriteIds(ids);
      });
      return () => {
        active = false;
      };
    }, [])
  );

  const onToggleFavorite = useCallback(async (threadId: number) => {
    await hapticSelection();
    const next = await toggleFavoriteThread(threadId);
    setFavoriteIds(next);
  }, []);

  /** Favourites first, then pinned, otherwise the order the backend returned. */
  const visibleThreads = useMemo(() => {
    const isFavorite = (t: Thread) => favoriteIds.includes(t.id);
    const base = favoritesOnly ? threads.filter(isFavorite) : threads;
    return [...base].sort((a, b) => {
      const favDiff = Number(isFavorite(b)) - Number(isFavorite(a));
      if (favDiff !== 0) return favDiff;
      return Number(b.pinned) - Number(a.pinned);
    });
  }, [threads, favoriteIds, favoritesOnly]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadThreads();
  }, [loadThreads]);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      if (y < lastScrollY.current - SCROLL_UP_THRESHOLD && y > 50) showDock();
      lastScrollY.current = y;
    },
    [showDock]
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(LOCALE_BY_LANGUAGE[language], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderThread = (thread: Thread, index: number) => {
    const isFavorite = favoriteIds.includes(thread.id);
    return (
    <Animated.View key={thread.id} entering={FadeIn.delay(index * 40).duration(320)}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push(`/forum/${thread.id}` as const)}
        style={styles.itemTouch}
      >
        <GlassCard padding="lg" rounded="lg">
          <View style={styles.titleRow}>
            {thread.pinned && (
              <View
                style={[
                  styles.pinnedBadge,
                  {
                    backgroundColor: isRoyal ? 'rgba(230, 194, 122, 0.18)' : colors.highlightGlow,
                    borderColor: isRoyal ? 'rgba(230, 194, 122, 0.35)' : colors.border,
                  },
                ]}
              >
                <Text style={[styles.pinnedText, { color: isRoyal ? '#E6C27A' : colors.highlight }]}>
                  {strings.pinned}
                </Text>
              </View>
            )}
            <View style={styles.titleWithStar}>
              <Text
                style={[
                  styles.itemTitle,
                  { color: isRoyal ? 'rgba(255,255,255,0.95)' : colors.text },
                ]}
                numberOfLines={2}
              >
                {thread.title}
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={strings.favorites}
                accessibilityState={{ selected: isFavorite }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onPress={() => void onToggleFavorite(thread.id)}
                style={styles.starButton}
              >
                <Ionicons
                  name={isFavorite ? 'star' : 'star-outline'}
                  size={22}
                  color={
                    isFavorite
                      ? isRoyal
                        ? '#E6C27A'
                        : colors.highlight
                      : isRoyal
                        ? 'rgba(255,255,255,0.45)'
                        : colors.textMuted
                  }
                />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.metaRow}>
            <Text style={[styles.metaText, { color: isRoyal ? 'rgba(255,255,255,0.6)' : colors.textMuted }]}>
              {thread.created_by_username}
            </Text>
            <Text style={[styles.metaText, { color: isRoyal ? 'rgba(255,255,255,0.5)' : colors.textMuted }]}>
              {formatDate(thread.created_at)}
            </Text>
          </View>
        </GlassCard>
      </TouchableOpacity>
    </Animated.View>
    );
  };

  return (
    <ScreenWrapper>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: spacing.xxl + 72 }]}
        onScroll={onScroll}
        scrollEventThrottle={80}
        showsVerticalScrollIndicator={false}
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
          <Text style={[styles.title, { color: colors.text }]}>{strings.title}</Text>
          {favoriteIds.length > 0 ? (
            <View style={styles.filterRow}>
              {([false, true] as const).map((onlyFavorites) => {
                const active = favoritesOnly === onlyFavorites;
                return (
                  <TouchableOpacity
                    key={String(onlyFavorites)}
                    activeOpacity={0.8}
                    onPress={() => setFavoritesOnly(onlyFavorites)}
                    style={[
                      styles.filterChip,
                      {
                        borderColor: active
                          ? isRoyal
                            ? 'rgba(230, 194, 122, 0.5)'
                            : colors.highlight
                          : colors.border,
                        backgroundColor: active
                          ? isRoyal
                            ? 'rgba(230, 194, 122, 0.18)'
                            : colors.highlightGlow
                          : 'transparent',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        {
                          color: active
                            ? isRoyal
                              ? '#E6C27A'
                              : colors.highlight
                            : isRoyal
                              ? 'rgba(255,255,255,0.7)'
                              : colors.textMuted,
                        },
                      ]}
                    >
                      {onlyFavorites ? `★ ${strings.favorites}` : strings.showAll}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={isRoyal ? '#E6C27A' : colors.highlight} />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            <TouchableOpacity
              style={[styles.retryButton, { borderColor: colors.border }]}
              onPress={loadThreads}
            >
              <Text style={[styles.retryText, { color: colors.text }]}>{strings.retry}</Text>
            </TouchableOpacity>
          </View>
        ) : visibleThreads.length === 0 ? (
          <View style={styles.centered}>
            <Text style={[styles.emptyText, { color: isRoyal ? 'rgba(255,255,255,0.6)' : colors.textMuted }]}>
              {favoritesOnly ? strings.noFavorites : strings.noThreads}
            </Text>
          </View>
        ) : (
          visibleThreads.map(renderThread)
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  header: { paddingTop: spacing.lg, paddingBottom: spacing.md },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.regular,
    fontFamily: fontFamily.heading,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xxl,
  },
  itemTouch: { marginBottom: spacing.sm },
  titleRow: { marginBottom: spacing.xs },
  titleWithStar: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  starButton: { paddingTop: 1 },
  filterRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm },
  filterChip: {
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  filterChipText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  itemTitle: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  metaText: { fontSize: fontSize.xs },
  pinnedBadge: {
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
  },
  pinnedText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  emptyText: { fontSize: fontSize.md, textAlign: 'center' },
  errorText: { fontSize: fontSize.md, marginBottom: spacing.md },
  retryButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  retryText: { fontSize: fontSize.sm },
});
