/**
 * Prayer Space — UX 2.0: spiritual companion.
 * Time-based greeting (crossfade), NextPrayerOrb with radial menu, Time Pill Stack.
 */
import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
  RefreshControl,
  Alert,
  I18nManager,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTheme } from '../../../theme/ThemeContext';
import { ScreenWrapper } from '../../../components/ScreenWrapper';
import { AppTitleHeader } from '../../../components/AppTitleHeader';
import { NextPrayerOrb } from '../../../components/NextPrayerOrb';
import { RadialMenu } from '../../../components/RadialMenu';
import { QuickMenuGrid, QuickMenuIcon, getMenuItems } from '../../../components/QuickMenuGrid';
import { TimePillStack } from '../../../components/TimePillStack';
import { PrayerQuickSettingsSheet } from '../../../components/PrayerQuickSettingsSheet';
import { usePrayerTimes } from '../hooks/usePrayerTimes';
import { getCurrentPrayer } from '../utils/nextPrayer';
import { getPrayerName, getString } from '../../../constants/i18n';
import { consumePendingPlayAzanFromNotification } from '../notificationResponse';
import { playAzanSound, playBundledAzanRemainder } from '../utils/playAzan';
import { isAzanSoundKey } from '../constants/azan';
import { loadPrayerSettings } from '../storage/prayerSettings';
import { saveMuteNextPrayerUntil } from '../storage/muteNextPrayer';
import { useAdmin } from '../../admin/AdminContext';
import { fontSize, fontWeight } from '../../../theme/typography';
import { spacing } from '../../../theme/spacing';
import { hapticLight } from '../../../utils/haptics';

const ROYAL_BADGE_BG = 'rgba(31,111,84,0.22)';
const ROYAL_BADGE_RING = 'rgba(230,194,122,0.55)';

export function PrayerSpaceScreen() {
  const { colors, style: themeStyle } = useTheme();
  const isRoyal = themeStyle === 'royal';
  const router = useRouter();
  const { isAuthenticated } = useAdmin();
  const {
    today,
    nextPrayer,
    tomorrowFirstPrayer,
    countdownSeconds,
    loading,
    error,
    location,
    language,
    use12h,
    refreshTimes,
    refreshSchedule,
    settings,
    updateSettings,
  } = usePrayerTimes();
  const [refreshing, setRefreshing] = useState(false);
  const [radialOpen, setRadialOpen] = useState(false);
  const [quickSettingsPrayer, setQuickSettingsPrayer] = useState<import('../types').PrayerName | null>(null);

  const nextPrayerLabel = nextPrayer ? getPrayerName(language, nextPrayer.prayer.name) : '';
  const muteLabel = getString(language, 'muteNextPrayer');
  const comingSoon = getString(language, 'comingSoon');
  const noAccess = getString(language, 'noAccess');
  const cancelLabel = getString(language, 'cancel');

  const menuItems = useMemo(() => {
    const base = getMenuItems(language);
    return base.map((b) => ({
      ...b,
      onPress: () => {
        if (b.key === 'qa' && !isAuthenticated) {
          Alert.alert(noAccess, undefined, [{ text: cancelLabel, style: 'cancel' }]);
          return;
        }
        if (b.route) {
          router.push(b.route as any);
        } else {
          Alert.alert(comingSoon);
        }
      },
    }));
  }, [language, comingSoon, noAccess, cancelLabel, isAuthenticated, router]);

  const prayerItem = menuItems.find((m) => m.key === 'prayer');
  const quranItem = menuItems.find((m) => m.key === 'quran');
  const gridItems = menuItems.filter((m) => m.key !== 'prayer' && m.key !== 'quran');

  const currentPrayerName = useMemo(() => {
    if (!today?.times.length) return null;
    const current = getCurrentPrayer(today.times, new Date());
    return current?.name ?? null;
  }, [today?.times, countdownSeconds]); // re-run when countdown ticks so "now" updates

  const isPrayerTimeNow = currentPrayerName != null;

  const handlePlayAzan = useCallback(() => {
    router.push({
      pathname: '/prayer-mode',
      params: { prayer: nextPrayer?.prayer.name ?? 'Dhuhr' },
    } as any);
  }, [router, nextPrayer?.prayer.name]);

  const handleMuteNextPrayer = useCallback(async () => {
    if (nextPrayer) {
      await saveMuteNextPrayerUntil(nextPrayer.prayer.time.getTime()).catch(() => {});
      await refreshSchedule();
    }
  }, [nextPrayer, refreshSchedule]);

  useFocusEffect(
    useCallback(() => {
      refreshTimes();
      const pending = consumePendingPlayAzanFromNotification();
      if (!pending.play) return;
      loadPrayerSettings().then((s) => {
        if (!s?.playAzanSound) return;
        const soundKey = s.selectedSound as import('../utils/playAzan').SoundKey;
        const respectSilent = s.respectSilentMode;
        if (pending.triggerDate != null && isAzanSoundKey(soundKey)) {
          playBundledAzanRemainder(soundKey, pending.triggerDate, respectSilent).catch(() => {});
        } else {
          playAzanSound(soundKey, respectSilent).catch(() => {});
        }
      });
    }, [refreshTimes])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshTimes();
    await refreshSchedule();
    setRefreshing(false);
  }, [refreshTimes, refreshSchedule]);

  if (loading && !today) {
    return (
      <ScreenWrapper>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.highlight} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>{getString(language, 'loading')}</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <View style={styles.scrollWrapper}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.xxl + 72 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.highlight}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <AppTitleHeader
          location={location}
          noLocationLabel={getString(language, 'noLocation')}
          onLocationPress={() => {
            Alert.alert(
              getString(language, 'locationPickerTitle'),
              undefined,
              [
                { text: getString(language, 'setLocationManually'), onPress: () => router.push('/location-picker') },
                { text: getString(language, 'useCurrentLocation'), onPress: () => refreshTimes() },
                { text: getString(language, 'cancel'), style: 'cancel' },
              ]
            );
          }}
        />

        {error && (
          <View style={[styles.errorBox, { backgroundColor: colors.surfaceGlass, borderColor: colors.border }]}>
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            <TouchableOpacity onPress={refreshTimes} style={[styles.retryBtn, { backgroundColor: colors.highlight }]}>
              <Text style={styles.retryBtnText}>{getString(language, 'retry')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.orbRow, I18nManager.isRTL && styles.orbRowRtl]}>
          {prayerItem && (
            <Pressable
              style={({ pressed }) => [
                styles.flankButton,
                pressed && styles.flankButtonPressed,
              ]}
              onPress={() => {
                hapticLight();
                prayerItem.onPress();
              }}
              accessibilityRole="button"
              accessibilityLabel={prayerItem.label}
            >
              <View style={[styles.flankBadge, { backgroundColor: isRoyal ? ROYAL_BADGE_BG : colors.highlightGlow, borderColor: isRoyal ? ROYAL_BADGE_RING : colors.accentMuted }]}>
                <QuickMenuIcon name={prayerItem.iconName} color={isRoyal ? colors.accent : colors.textOnSurface} />
              </View>
              <Text style={[styles.flankLabel, { color: isRoyal ? colors.accent : colors.textOnSurface }]} numberOfLines={2}>
                {prayerItem.label}
              </Text>
            </Pressable>
          )}
          <View style={styles.orbSection}>
            <NextPrayerOrb
              nextPrayer={nextPrayer ?? null}
              tomorrowFirstPrayer={tomorrowFirstPrayer ?? null}
              language={language}
              use12h={use12h}
              prayerNameLabel={nextPrayerLabel}
              onOpenRadialMenu={() => setRadialOpen(true)}
              isPrayerTimeNow={isPrayerTimeNow}
            />
          </View>
          {quranItem && (
            <Pressable
              style={({ pressed }) => [
                styles.flankButton,
                pressed && styles.flankButtonPressed,
              ]}
              onPress={() => {
                hapticLight();
                quranItem.onPress();
              }}
              accessibilityRole="button"
              accessibilityLabel={quranItem.label}
            >
              <View style={[styles.flankBadge, { backgroundColor: isRoyal ? ROYAL_BADGE_BG : colors.highlightGlow, borderColor: isRoyal ? ROYAL_BADGE_RING : colors.accentMuted }]}>
                <QuickMenuIcon name={quranItem.iconName} color={isRoyal ? colors.accent : colors.textOnSurface} />
              </View>
              <Text style={[styles.flankLabel, { color: isRoyal ? colors.accent : colors.textOnSurface }]} numberOfLines={2}>
                {quranItem.label}
              </Text>
            </Pressable>
          )}
        </View>
        <View style={styles.quickMenuSection}>
          <QuickMenuGrid items={gridItems} />
        </View>
        <RadialMenu
          visible={radialOpen}
          onClose={() => setRadialOpen(false)}
          onPlayAzan={handlePlayAzan}
          onMuteNextPrayer={handleMuteNextPrayer}
          muteLabel={muteLabel}
          language={language}
        />

        {today && today.times.length > 0 && (
          <View style={styles.pillSection}>
            <TimePillStack
              times={today.times}
              sunrise={today.sunrise}
              nextPrayerName={nextPrayer?.prayer.name ?? null}
              currentPrayerName={currentPrayerName}
              language={language}
              use12h={use12h}
              onLongPressPill={(p) => setQuickSettingsPrayer(p.name)}
            />
            <TouchableOpacity
              style={[styles.adjustTimesBtn, { borderColor: isRoyal ? 'rgba(230,194,122,0.5)' : colors.border }]}
              onPress={() => { hapticLight(); router.push('/(tabs)/settings'); }}
            >
              <Text style={[styles.adjustTimesBtnText, { color: isRoyal ? '#E6C27A' : colors.highlight }]}>{getString(language, 'adjustPrayerTimes')}</Text>
            </TouchableOpacity>
            <PrayerQuickSettingsSheet
              visible={quickSettingsPrayer != null}
              onClose={() => setQuickSettingsPrayer(null)}
              prayerName={quickSettingsPrayer ?? 'Dhuhr'}
              settings={settings}
              onSave={(updates) => settings && updateSettings({ ...settings, ...updates })}
            />
          </View>
        )}
        </ScrollView>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollWrapper: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs, backgroundColor: 'transparent' },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { marginTop: spacing.sm, fontSize: 16 },
  errorBox: {
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  errorText: { fontSize: 14, marginBottom: spacing.xs },
  retryBtn: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    marginTop: spacing.xs,
  },
  retryBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  orbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    gap: spacing.sm,
    width: '100%',
  },
  orbRowRtl: {
    flexDirection: 'row-reverse',
  },
  orbSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  flankButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    flexShrink: 1,
    maxWidth: 88,
    minHeight: 44,
  },
  flankButtonPressed: {
    opacity: 0.8,
  },
  flankBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  flankLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
    maxWidth: 76,
  },
  quickMenuSection: {
    marginBottom: spacing.lg,
  },
  adjustTimesBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'center',
  },
  adjustTimesBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  pillSection: { marginBottom: spacing.lg },
});
