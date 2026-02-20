/**
 * Admin Sources Screen — manage Sources posts.
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
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '../../../theme/ThemeContext';
import { ScreenWrapper } from '../../../components/ScreenWrapper';
import { GlassCard } from '../../../components/GlassCard';
import { useAdmin } from '../AdminContext';
import { getThreads, deleteThread } from '../../forum/api';
import type { Thread } from '../../forum/types';
import { spacing, radius } from '../../../theme/spacing';
import { fontSize, fontWeight, fontFamily } from '../../../theme/typography';

export function AdminQASourcesScreen() {
  const { colors, style: themeStyle } = useTheme();
  const isRoyal = themeStyle === 'royal';
  const router = useRouter();
  const { isAuthenticated } = useAdmin();

  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  React.useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/admin');
    }
  }, [isAuthenticated, router]);

  const loadItems = useCallback(async () => {
    try {
      const data = await getThreads({ category: 'sources' });
      setThreads(data);
    } catch (err) {
      console.error('Failed to load sources:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadItems();
  }, [loadItems]);

  const handleDeleteItem = (item: Thread) => {
    Alert.alert(
      'Delete source',
      `Are you sure you want to delete "${item.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteThread(item.id);
              setThreads((prev) => prev.filter((i) => i.id !== item.id));
            } catch (err) {
              Alert.alert('Error', 'Failed to delete source');
            }
          },
        },
      ]
    );
  };

  const renderItem = (item: Thread, index: number) => (
    <Animated.View key={item.id} entering={FadeIn.delay(index * 30).duration(280)}>
      <GlassCard padding="md" rounded="lg" style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <View style={styles.itemInfo}>
            <Text style={[styles.itemTitle, { color: isRoyal ? 'rgba(255,255,255,0.95)' : colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
          </View>
        </View>
        <View style={styles.itemActions}>
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: colors.border }]}
            onPress={() => router.push(`/admin/thread/${item.id}` as any)}
          >
            <Text style={[styles.actionText, { color: isRoyal ? '#E6C27A' : colors.highlight }]}>
              Edit
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: colors.error }]}
            onPress={() => handleDeleteItem(item)}
          >
            <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </GlassCard>
    </Animated.View>
  );

  if (!isAuthenticated) {
    return null;
  }

  return (
    <ScreenWrapper>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: spacing.xxl }]}
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
          <TouchableOpacity
            onPress={() => router.back()}
            style={[
              styles.backPill,
              { backgroundColor: isRoyal ? 'rgba(230, 194, 122, 0.2)' : colors.surfaceGlass, borderColor: isRoyal ? '#E6C27A' : colors.border },
            ]}
          >
            <Text style={[styles.backPillText, { color: isRoyal ? '#E6C27A' : colors.text }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Sources</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            { backgroundColor: isRoyal ? '#E6C27A' : colors.highlight },
          ]}
          onPress={() => router.push({ pathname: '/admin/thread/new', params: { category: 'sources' } } as any)}
        >
          <Text style={styles.primaryButtonText}>+ New source</Text>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Sources</Text>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={isRoyal ? '#E6C27A' : colors.highlight} />
          </View>
        ) : threads.length === 0 ? (
          <Text style={[styles.emptyText, { color: isRoyal ? 'rgba(255,255,255,0.6)' : colors.textMuted }]}>
            No sources yet.
          </Text>
        ) : (
          threads.map(renderItem)
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  header: { marginBottom: spacing.lg },
  backPill: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  backPillText: { fontSize: fontSize.sm, fontWeight: '600' },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    fontFamily: fontFamily.heading,
  },
  primaryButton: {
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  centered: { paddingTop: spacing.xl },
  emptyText: { fontSize: fontSize.sm, textAlign: 'center', paddingTop: spacing.lg },
  itemCard: { marginBottom: spacing.sm },
  itemHeader: { marginBottom: spacing.sm },
  itemInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, flex: 1 },
  itemActions: { flexDirection: 'row', gap: spacing.sm },
  actionButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
});
