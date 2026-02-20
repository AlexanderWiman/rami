/**
 * Admin Management Screen — superadmin only.
 * Create and delete admin accounts.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '../../../theme/ThemeContext';
import { ScreenWrapper } from '../../../components/ScreenWrapper';
import { GlassCard } from '../../../components/GlassCard';
import { useAdmin } from '../AdminContext';
import { getAdmins, createAdmin, deleteAdmin } from '../../forum/api';
import type { Admin } from '../../forum/types';
import { spacing, radius } from '../../../theme/spacing';
import { fontSize, fontWeight, fontFamily } from '../../../theme/typography';

export function AdminManageScreen() {
  const { colors, style: themeStyle } = useTheme();
  const isRoyal = themeStyle === 'royal';
  const router = useRouter();
  const { admin: currentAdmin, isSuperadmin, isAuthenticated } = useAdmin();

  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'superadmin'>('admin');
  const [creating, setCreating] = useState(false);

  // Redirect if not superadmin
  React.useEffect(() => {
    if (!isAuthenticated || !isSuperadmin) {
      router.replace('/admin');
    }
  }, [isAuthenticated, isSuperadmin, router]);

  const loadAdmins = useCallback(async () => {
    try {
      const data = await getAdmins();
      setAdmins(data);
    } catch (err) {
      console.error('Failed to load admins:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  const handleCreateAdmin = async () => {
    if (!newUsername.trim() || !newPassword) {
      Alert.alert('Error', 'Please enter username and password');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    setCreating(true);
    try {
      const admin = await createAdmin(newUsername.trim(), newPassword, newRole);
      setAdmins((prev) => [admin, ...prev]);
      setShowForm(false);
      setNewUsername('');
      setNewPassword('');
      setNewRole('admin');
      Alert.alert('Success', `Admin "${admin.username}" created`);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create admin');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteAdmin = (admin: Admin) => {
    if (admin.id === currentAdmin?.id) {
      Alert.alert('Error', 'Cannot delete yourself');
      return;
    }

    Alert.alert(
      'Delete Admin',
      `Are you sure you want to delete "${admin.username}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAdmin(admin.id);
              setAdmins((prev) => prev.filter((a) => a.id !== admin.id));
            } catch (err) {
              Alert.alert('Error', 'Failed to delete admin');
            }
          },
        },
      ]
    );
  };

  const inputStyle = [
    styles.input,
    {
      backgroundColor: isRoyal ? 'rgba(10, 25, 18, 0.72)' : colors.surfaceGlass,
      color: isRoyal ? 'rgba(255,255,255,0.95)' : colors.text,
      borderColor: isRoyal ? 'rgba(230, 194, 122, 0.28)' : colors.border,
    },
  ];

  const renderAdmin = (admin: Admin, index: number) => (
    <Animated.View key={admin.id} entering={FadeIn.delay(index * 30).duration(280)}>
      <GlassCard padding="md" rounded="lg" style={styles.adminCard}>
        <View style={styles.adminInfo}>
          <Text
            style={[styles.adminName, { color: isRoyal ? 'rgba(255,255,255,0.95)' : colors.text }]}
          >
            {admin.username}
          </Text>
          <View
            style={[
              styles.roleBadge,
              {
                backgroundColor:
                  admin.role === 'superadmin'
                    ? (isRoyal ? 'rgba(230, 194, 122, 0.2)' : colors.highlightGlow)
                    : 'transparent',
                borderColor:
                  admin.role === 'superadmin'
                    ? (isRoyal ? 'rgba(230, 194, 122, 0.4)' : colors.highlight)
                    : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.roleText,
                {
                  color:
                    admin.role === 'superadmin'
                      ? (isRoyal ? '#E6C27A' : colors.highlight)
                      : (isRoyal ? 'rgba(255,255,255,0.7)' : colors.textMuted),
                },
              ]}
            >
              {admin.role}
            </Text>
          </View>
        </View>
        {admin.id !== currentAdmin?.id && (
          <TouchableOpacity onPress={() => handleDeleteAdmin(admin)}>
            <Text style={[styles.deleteText, { color: colors.error }]}>Delete</Text>
          </TouchableOpacity>
        )}
      </GlassCard>
    </Animated.View>
  );

  if (!isSuperadmin) {
    return null;
  }

  return (
    <ScreenWrapper>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: spacing.xxl }]}
        showsVerticalScrollIndicator={false}
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
          <Text style={[styles.title, { color: colors.text }]}>Manage Admins</Text>
        </View>

        {/* Add Admin Button / Form */}
        {showForm ? (
          <GlassCard padding="lg" rounded="lg" style={styles.formCard}>
            <Text style={[styles.formTitle, { color: isRoyal ? 'rgba(255,255,255,0.95)' : colors.text }]}>
              New Admin
            </Text>
            <TextInput
              style={inputStyle}
              placeholder="Username"
              placeholderTextColor={isRoyal ? 'rgba(255,255,255,0.5)' : colors.textMuted}
              value={newUsername}
              onChangeText={setNewUsername}
              autoCapitalize="none"
            />
            <TextInput
              style={inputStyle}
              placeholder="Password (min 8 characters)"
              placeholderTextColor={isRoyal ? 'rgba(255,255,255,0.5)' : colors.textMuted}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
            <View style={styles.roleSelector}>
              <TouchableOpacity
                style={[
                  styles.roleOption,
                  { borderColor: colors.border },
                  newRole === 'admin' && { backgroundColor: isRoyal ? 'rgba(230, 194, 122, 0.2)' : colors.highlightGlow, borderColor: isRoyal ? '#E6C27A' : colors.highlight },
                ]}
                onPress={() => setNewRole('admin')}
              >
                <Text
                  style={[
                    styles.roleOptionText,
                    { color: newRole === 'admin' ? (isRoyal ? '#E6C27A' : colors.highlight) : (isRoyal ? 'rgba(255,255,255,0.7)' : colors.textMuted) },
                  ]}
                >
                  Admin
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.roleOption,
                  { borderColor: colors.border },
                  newRole === 'superadmin' && { backgroundColor: isRoyal ? 'rgba(230, 194, 122, 0.2)' : colors.highlightGlow, borderColor: isRoyal ? '#E6C27A' : colors.highlight },
                ]}
                onPress={() => setNewRole('superadmin')}
              >
                <Text
                  style={[
                    styles.roleOptionText,
                    { color: newRole === 'superadmin' ? (isRoyal ? '#E6C27A' : colors.highlight) : (isRoyal ? 'rgba(255,255,255,0.7)' : colors.textMuted) },
                  ]}
                >
                  Superadmin
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.formActions}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => {
                  setShowForm(false);
                  setNewUsername('');
                  setNewPassword('');
                }}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.createBtn,
                  { backgroundColor: isRoyal ? '#E6C27A' : colors.highlight },
                  creating && styles.createBtnDisabled,
                ]}
                onPress={handleCreateAdmin}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.createBtnText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </GlassCard>
        ) : (
          <TouchableOpacity
            style={[
              styles.addBtn,
              { backgroundColor: isRoyal ? '#E6C27A' : colors.highlight },
            ]}
            onPress={() => setShowForm(true)}
          >
            <Text style={styles.addBtnText}>+ Add Admin</Text>
          </TouchableOpacity>
        )}

        {/* Admins List */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Current Admins</Text>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={isRoyal ? '#E6C27A' : colors.highlight} />
          </View>
        ) : (
          admins.map(renderAdmin)
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
  addBtn: {
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  addBtnText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  formCard: { marginBottom: spacing.lg },
  formTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  input: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: fontSize.md,
    marginBottom: spacing.md,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  roleOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  roleOptionText: { fontSize: fontSize.sm },
  formActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: fontSize.sm },
  createBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  createBtnDisabled: { opacity: 0.7 },
  createBtnText: {
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
  adminCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  adminInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  adminName: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  roleBadge: {
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  roleText: { fontSize: fontSize.xs },
  deleteText: { fontSize: fontSize.sm },
});
