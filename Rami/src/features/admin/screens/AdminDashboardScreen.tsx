/**
 * Admin Dashboard — manage threads and admins.
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
import { useLanguage } from '../../../contexts/LanguageContext';
import { ScreenWrapper } from '../../../components/ScreenWrapper';
import { GlassCard } from '../../../components/GlassCard';
import { useAdmin } from '../AdminContext';
import { getThreads, deleteThread } from '../../forum/api';
import type { Thread } from '../../forum/types';
import { getString } from '../../../constants/i18n';
import { spacing, radius } from '../../../theme/spacing';
import { fontSize, fontWeight, fontFamily } from '../../../theme/typography';

export function AdminDashboardScreen() {
  const { colors, style: themeStyle } = useTheme();
  const isRoyal = themeStyle === 'royal';
  const { language } = useLanguage();
  const router = useRouter();
  const { admin, logout, isSuperadmin, isAuthenticated } = useAdmin();

  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/admin');
    }
  }, [isAuthenticated, router]);

  const loadThreads = useCallback(async () => {
    try {
      const data = await getThreads({ category: 'community' });
      setThreads(data);
    } catch (err) {
      console.error('Failed to load threads:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadThreads();
  }, [loadThreads]);

  const handleHome = () => {
    router.replace('/(tabs)');
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  const homeLabel = getString(language, 'adminHome');
  const logoutLabel = getString(language, 'adminLogout');

  const handleDeleteThread = (thread: Thread) => {
    Alert.alert(
      'Delete Thread',
      `Are you sure you want to delete "${thread.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteThread(thread.id);
              setThreads((prev) => prev.filter((t) => t.id !== thread.id));
            } catch (err) {
              Alert.alert('Error', 'Failed to delete thread');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const renderThread = (thread: Thread, index: number) => (
    <Animated.View key={thread.id} entering={FadeIn.delay(index * 30).duration(280)}>
      <GlassCard padding="md" rounded="lg" style={styles.threadCard}>
        <View style={styles.threadHeader}>
          <View style={styles.threadInfo}>
            {thread.pinned && (
              <Text style={[styles.pinnedBadge, { color: isRoyal ? '#E6C27A' : colors.highlight }]}>
                📌
              </Text>
            )}
            <Text
              style={[styles.threadTitle, { color: isRoyal ? 'rgba(255,255,255,0.95)' : colors.text }]}
              numberOfLines={1}
            >
              {thread.title}
            </Text>
          </View>
          <Text style={[styles.threadDate, { color: isRoyal ? 'rgba(255,255,255,0.5)' : colors.textMuted }]}>
            {formatDate(thread.created_at)}
          </Text>
        </View>
        <View style={styles.threadActions}>
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: colors.border }]}
            onPress={() => router.push(`/admin/thread/${thread.id}` as any)}
          >
            <Text style={[styles.actionText, { color: isRoyal ? '#E6C27A' : colors.highlight }]}>
              Edit
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: colors.error }]}
            onPress={() => handleDeleteThread(thread)}
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
          <View style={styles.headerTop}>
            <Text style={[styles.title, { color: colors.text }]}>Admin Panel</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={handleHome}
                style={[
                  styles.logoutPill,
                  { backgroundColor: isRoyal ? 'rgba(230, 194, 122, 0.2)' : colors.surfaceGlass, borderColor: isRoyal ? '#E6C27A' : colors.border },
                ]}
              >
                <Text style={[styles.logoutText, { color: isRoyal ? '#E6C27A' : colors.text }]}>{homeLabel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleLogout}
                style={[
                  styles.logoutPill,
                  { backgroundColor: colors.error, borderColor: colors.error },
                ]}
              >
                <Text style={[styles.logoutText, { color: '#fff' }]}>{logoutLabel}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={[styles.welcomeText, { color: isRoyal ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]}>
            Welcome, {admin?.username} ({admin?.role})
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              { backgroundColor: isRoyal ? '#E6C27A' : colors.highlight },
            ]}
            onPress={() => router.push('/admin/thread/new')}
          >
            <Text style={styles.primaryButtonText}>+ New Thread</Text>
          </TouchableOpacity>

          {isSuperadmin && (
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.border }]}
              onPress={() => router.push('/admin/admins')}
            >
              <Text style={[styles.secondaryButtonText, { color: isRoyal ? 'rgba(255,255,255,0.9)' : colors.text }]}>
                Manage Admins
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.border }]}
            onPress={() => router.push('/admin/sources')}
          >
            <Text style={[styles.secondaryButtonText, { color: isRoyal ? 'rgba(255,255,255,0.9)' : colors.text }]}>
              Sources
            </Text>
          </TouchableOpacity>
        </View>

        {/* Threads List */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Threads</Text>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={isRoyal ? '#E6C27A' : colors.highlight} />
          </View>
        ) : threads.length === 0 ? (
          <Text style={[styles.emptyText, { color: isRoyal ? 'rgba(255,255,255,0.6)' : colors.textMuted }]}>
            No threads yet. Create your first one!
          </Text>
        ) : (
          threads.map(renderThread)
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  header: { marginBottom: spacing.lg },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    fontFamily: fontFamily.heading,
  },
  logoutPill: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  logoutText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  headerActions: { flexDirection: 'row', gap: spacing.xs },
  welcomeText: { fontSize: fontSize.sm, marginTop: spacing.xs },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  secondaryButtonText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  centered: { paddingTop: spacing.xl },
  emptyText: { fontSize: fontSize.sm, textAlign: 'center', paddingTop: spacing.lg },
  threadCard: { marginBottom: spacing.sm },
  threadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  threadInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  pinnedBadge: { fontSize: fontSize.sm },
  threadTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, flex: 1 },
  threadDate: { fontSize: fontSize.xs },
  threadActions: { flexDirection: 'row', gap: spacing.sm },
  actionButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
});
