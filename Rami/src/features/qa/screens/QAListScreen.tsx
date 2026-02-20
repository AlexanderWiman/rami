/**
 * Sources List Screen — mirrors Community layout, shows sources threads.
 */
import React, { useState, useEffect, useCallback } from 'react';
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
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '../../../theme/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useDockVisibility } from '../../../components/SacredDock';
import { ScreenWrapper } from '../../../components/ScreenWrapper';
import { BackToHomeBar } from '../../../components/BackToHomeBar';
import { GlassCard } from '../../../components/GlassCard';
import { getThreads } from '../../forum/api';
import type { Thread } from '../../forum/types';
import { useAdmin } from '../../admin/AdminContext';
import { spacing, radius } from '../../../theme/spacing';
import { fontSize, fontWeight, fontFamily } from '../../../theme/typography';
import { getString, LOCALE_BY_LANGUAGE } from '../../../constants/i18n';

const SCROLL_UP_THRESHOLD = 30;
const lastScrollY = { current: 0 };

// i18n for sources
const sourcesStrings = {
  en: {
    title: 'Sources',
    noThreads: 'No sources yet',
    pinned: 'Pinned',
    loadError: 'Failed to load sources',
    retry: 'Retry',
  },
  ar: {
    title: 'المصادر',
    noThreads: 'لا توجد مصادر بعد',
    pinned: 'مثبت',
    loadError: 'فشل في تحميل المصادر',
    retry: 'إعادة المحاولة',
  },
  tr: {
    title: 'Kaynaklar',
    noThreads: 'Henüz kaynak yok',
    pinned: 'Sabitlenmiş',
    loadError: 'Kaynaklar yüklenemedi',
    retry: 'Tekrar dene',
  },
  fr: { title: 'Sources', noThreads: 'Aucune source', pinned: 'Épinglé', loadError: 'Échec du chargement', retry: 'Réessayer' },
  es: { title: 'Fuentes', noThreads: 'Sin fuentes', pinned: 'Fijado', loadError: 'Error al cargar', retry: 'Reintentar' },
  sv: { title: 'Källor', noThreads: 'Inga källor än', pinned: 'Fastnaglad', loadError: 'Kunde inte ladda', retry: 'Försök igen' },
  de: { title: 'Quellen', noThreads: 'Noch keine Quellen', pinned: 'Angeheftet', loadError: 'Laden fehlgeschlagen', retry: 'Erneut versuchen' },
};

export function QAListScreen() {
  const { colors, style: themeStyle } = useTheme();
  const isRoyal = themeStyle === 'royal';
  const { language } = useLanguage();
  const { showDock } = useDockVisibility();
  const router = useRouter();
  const { isAuthenticated } = useAdmin();

  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strings = sourcesStrings[language] || sourcesStrings.en;
  const noAccess = getString(language, 'noAccess');

  const loadThreads = useCallback(async () => {
    try {
      setError(null);
      const data = await getThreads({ category: 'sources' });
      setThreads(data);
    } catch (err) {
      setError(strings.loadError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [strings.loadError]);

  useEffect(() => {
    if (isAuthenticated) {
      loadThreads();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, loadThreads]);

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

  const renderThread = (thread: Thread, index: number) => (
    <Animated.View key={thread.id} entering={FadeIn.delay(index * 40).duration(320)}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push(`/qa/${thread.id}` as const)}
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
            <Text
              style={[
                styles.itemTitle,
                { color: isRoyal ? 'rgba(255,255,255,0.95)' : colors.text },
              ]}
              numberOfLines={2}
            >
              {thread.title}
            </Text>
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

  return (
    <ScreenWrapper>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: spacing.xxl + 72 }]}
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={80}
        showsVerticalScrollIndicator={false}
        refreshControl={
          isAuthenticated ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={isRoyal ? '#E6C27A' : colors.highlight}
            />
          ) : undefined
        }
      >
        <View style={styles.header}>
          <BackToHomeBar />
          <Text style={[styles.title, { color: colors.text }]}>{strings.title}</Text>
        </View>

        {!isAuthenticated ? (
          <View style={styles.centered}>
            <Text style={[styles.emptyText, { color: isRoyal ? 'rgba(255,255,255,0.6)' : colors.textMuted }]}>
              {noAccess}
            </Text>
          </View>
        ) : loading ? (
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
        ) : threads.length === 0 ? (
          <View style={styles.centered}>
            <Text style={[styles.emptyText, { color: isRoyal ? 'rgba(255,255,255,0.6)' : colors.textMuted }]}>
              {strings.noThreads}
            </Text>
          </View>
        ) : (
          threads.map(renderThread)
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
  itemTitle: {
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
