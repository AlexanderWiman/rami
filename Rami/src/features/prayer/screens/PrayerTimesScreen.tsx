import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Switch,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { NextPrayerCard } from '../components/NextPrayerCard';
import { DebugPanel } from '../components/DebugPanel';
import { usePrayerTimes } from '../hooks/usePrayerTimes';
import { useTheme } from '../../../theme/ThemeContext';
import { ScreenWrapper } from '../../../components/ScreenWrapper';
import { BackToHomeBar } from '../../../components/BackToHomeBar';
import { GlassCard } from '../../../components/GlassCard';
import { getPrayerName, getString, formatTimeWithLocale } from '../../../constants/i18n';
import type { PrayerName } from '../types';
import { consumePendingPlayAzanFromNotification } from '../notificationResponse';
import { playAzanSound, playBundledAzanRemainder } from '../utils/playAzan';
import { isAzanSoundKey } from '../constants/azan';
import { loadPrayerSettings } from '../storage/prayerSettings';
import { spacing, radius } from '../../../theme/spacing';
import { fontSize, fontWeight, fontFamily } from '../../../theme/typography';

export function PrayerTimesScreen() {
  const { colors, style: themeStyle } = useTheme();
  const isRoyal = themeStyle === 'royal';
  const {
    today,
    nextPrayer,
    countdownSeconds,
    loading,
    error,
    location,
    language,
    settings,
    refreshTimes,
    refreshSchedule,
    updateSettings,
  } = usePrayerTimes();
  // Debug panel: __DEV__ only; raw/offset-adjusted times + Reschedule button
  const [refreshing, setRefreshing] = React.useState(false);

  useFocusEffect(
    React.useCallback(() => {
      refreshTimes();
    }, [refreshTimes])
  );

  useFocusEffect(
    React.useCallback(() => {
      const pending = consumePendingPlayAzanFromNotification();
      if (!pending.play) return;
      loadPrayerSettings().then((s) => {
        if (!s.playAzanSound) return;
        const soundKey = s.selectedSound as import('../utils/playAzan').SoundKey;
        const respectSilent = s.respectSilentMode;
        if (pending.triggerDate != null && isAzanSoundKey(soundKey)) {
          playBundledAzanRemainder(soundKey, pending.triggerDate, respectSilent).catch(() => {});
        } else {
          playAzanSound(soundKey, respectSilent).catch(() => {});
        }
      });
    }, [])
  );

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refreshTimes();
    await refreshSchedule();
    setRefreshing(false);
  }, [refreshTimes, refreshSchedule]);

  const titleColor = isRoyal ? 'rgba(255,255,255,0.95)' : colors.text;
  const mutedColor = isRoyal ? 'rgba(255,255,255,0.7)' : colors.textMuted;
  const cardBg = isRoyal ? 'rgba(10, 25, 18, 0.72)' : colors.surfaceGlass;
  const cardBorder = isRoyal ? 'rgba(230, 194, 122, 0.28)' : colors.border;

  if (loading && !today) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <BackToHomeBar />
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={isRoyal ? '#E6C27A' : colors.highlight} />
            <Text style={[styles.loadingText, { color: mutedColor }]}>{getString(language, 'loadingPrayerTimes')}</Text>
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <BackToHomeBar />
          <GlassCard padding="md" rounded="lg" style={styles.titleCard} fillColor={cardBg} strokeColor={cardBorder}>
            <Text style={[styles.title, { color: titleColor }]}>{getString(language, 'prayerTimes')}</Text>
            <Text style={[styles.locationLabel, { color: mutedColor }]}>{getString(language, 'location')}</Text>
            <Text style={[styles.locationValue, { color: titleColor }]}>{location || getString(language, 'noLocation')}</Text>
          </GlassCard>
        </View>

        {error && (
          <View style={[styles.errorBox, { backgroundColor: isRoyal ? 'rgba(180,60,60,0.3)' : '#ffebee', borderColor: isRoyal ? 'rgba(230,194,122,0.3)' : undefined, borderWidth: isRoyal ? 1 : 0 }]}>
            <Text style={[styles.errorText, { color: isRoyal ? 'rgba(255,255,255,0.95)' : '#c62828' }]}>{error}</Text>
            <TouchableOpacity onPress={refreshTimes} style={[styles.retryBtn, { backgroundColor: isRoyal ? 'rgba(230, 194, 122, 0.3)' : '#1a472a' }]}>
              <Text style={[styles.retryBtnText, { color: isRoyal ? '#E6C27A' : '#fff' }]}>{getString(language, 'retry')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <NextPrayerCard nextPrayer={nextPrayer ?? null} countdownSeconds={countdownSeconds} language={language} />

        {today && (
          <View style={[styles.list, { backgroundColor: isRoyal ? 'rgba(10, 25, 18, 0.5)' : '#fff', borderWidth: isRoyal ? 1 : 0, borderColor: isRoyal ? cardBorder : undefined }]}>
            <Text style={[styles.listTitle, { color: titleColor }]}>{getString(language, 'todaysTimes')}</Text>
            {(() => {
              const sorted = today.times.slice().sort((a, b) => a.time.getTime() - b.time.getTime());
              const items: { key: string; label: string; time: Date; isShuruq?: boolean }[] = [];
              for (const p of sorted) {
                items.push({ key: p.name, label: getPrayerName(language, p.name), time: p.time });
                if (p.name === 'Fajr' && today.sunrise) {
                  items.push({
                    key: 'shuruq',
                    label: getString(language, 'shuruq'),
                    time: today.sunrise,
                    isShuruq: true,
                  });
                }
              }
              return items.map((item) => (
                <View key={item.key} style={[styles.row, { borderBottomColor: isRoyal ? 'rgba(255,255,255,0.1)' : '#eee' }]}>
                  <Text style={[styles.prayerName, { color: titleColor }]}>{item.label}</Text>
                  <View style={styles.rowRight}>
                    <Text style={[styles.prayerTime, { color: isRoyal ? '#E6C27A' : '#1a472a' }]}>{formatTimeWithLocale(language, item.time)}</Text>
                    {item.isShuruq ? (
                      <View style={styles.switchPlaceholder} />
                    ) : settings ? (
                      <Switch
                        value={settings.prayerNotify[item.key as PrayerName] ?? true}
                        onValueChange={(v) =>
                          updateSettings({
                            ...settings,
                            prayerNotify: { ...settings.prayerNotify, [item.key]: v },
                          })
                        }
                        trackColor={{ false: isRoyal ? 'rgba(255,255,255,0.3)' : colors.border, true: isRoyal ? '#E6C27A' : colors.highlight }}
                        thumbColor={colors.background}
                      />
                    ) : null}
                  </View>
                </View>
              ));
            })()}
          </View>
        )}
        <DebugPanel today={today} onReschedule={refreshSchedule} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl + 72,
  },
  loadingContainer: { flex: 1, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#555',
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  titleCard: {
    marginTop: spacing.xs,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    fontFamily: fontFamily.heading,
  },
  locationLabel: {
    fontSize: fontSize.xs,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  locationValue: {
    fontSize: fontSize.sm,
  },
  errorBox: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  errorText: {
    fontSize: fontSize.sm,
  },
  retryBtn: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  retryBtnText: {
    fontWeight: fontWeight.semibold,
  },
  list: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  listTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  switchPlaceholder: {
    width: 51,
    height: 31,
  },
  prayerName: {
    fontSize: fontSize.md,
  },
  prayerTime: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
});
