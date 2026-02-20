/**
 * Personal Space — soft glass cards, toggles glow when active, Azan as wave-style options.
 */
import React, { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  Linking,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../theme/ThemeContext';
import { useDockVisibility } from '../../../components/SacredDock';
import { ScreenWrapper } from '../../../components/ScreenWrapper';
import { BackToHomeBar } from '../../../components/BackToHomeBar';
import { GlassCard } from '../../../components/GlassCard';
import { usePrayerTimes } from '../hooks/usePrayerTimes';
import { playAzanSoundControlled } from '../utils/playAzan';
import { getString, getSoundLabel, translations } from '../../../constants/i18n';
import type { PrayerSettings, Language } from '../types';
import { PRAYER_NAMES_ORDER } from '../constants/methods';
import { AZAN_SOUND_KEYS } from '../constants/azan';
import { spacing, radius } from '../../../theme/spacing';
import { fontSize, fontWeight, fontFamily } from '../../../theme/typography';

const SOUND_KEYS = AZAN_SOUND_KEYS;
const CALC_METHOD_KEYS = ['MWL', 'Egypt', 'UmmAlQura', 'Karachi', 'Diyanet'] as const;
const ASR_KEYS = ['Shafi', 'Hanafi'] as const;
const OFFSET_MIN = -30;
const OFFSET_MAX = 30;

const SCROLL_UP_THRESHOLD = 30;
const lastScrollY = { current: 0 };

const ADMIN_TAP_TARGET = 20;
const ADMIN_TAP_TIMEOUT_MS = 5000;

export function PrayerSettingsScreen() {
  const { colors, pageBackground, style } = useTheme();
  const isRoyal = style === 'royal';
  const { showDock } = useDockVisibility();
  const { settings, language, updateSettings, updateLanguage, refreshSchedule, refreshTimes } = usePrayerTimes();
  const [testingSound, setTestingSound] = useState(false);
  const testPlaybackRef = useRef<null | { stop: () => void }>(null);
  const router = useRouter();
  
  // Hidden admin login - tap title 20 times
  const [adminTapCount, setAdminTapCount] = useState(0);
  const adminTapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync notification permission with system when screen gains focus (user may have changed it in phone settings)
  const [notificationPermissionGranted, setNotificationPermissionGranted] = useState<boolean | null>(null);

  // Stop azan test when user navigates away (e.g. presses back)
  useFocusEffect(
    useCallback(() => {
      refreshTimes();
      Notifications.getPermissionsAsync().then(({ status }) => {
        setNotificationPermissionGranted(status === 'granted');
      });
      return () => {
        if (testPlaybackRef.current) {
          testPlaybackRef.current.stop();
          testPlaybackRef.current = null;
          setTestingSound(false);
        }
      };
    }, [refreshTimes])
  );

  const handleTitleTap = useCallback(() => {
    // Clear previous timeout
    if (adminTapTimeoutRef.current) {
      clearTimeout(adminTapTimeoutRef.current);
    }
    
    const newCount = adminTapCount + 1;
    
    if (newCount >= ADMIN_TAP_TARGET) {
      // Navigate to admin login
      setAdminTapCount(0);
      router.push('/admin');
      return;
    }
    
    setAdminTapCount(newCount);
    
    // Reset after timeout
    adminTapTimeoutRef.current = setTimeout(() => {
      setAdminTapCount(0);
    }, ADMIN_TAP_TIMEOUT_MS);
  }, [adminTapCount, router]);

  const t = (key: Parameters<typeof getString>[1]) => getString(language, key);
  
  // Royal theme text colors
  const textPrimary = isRoyal ? 'rgba(255,255,255,0.95)' : colors.text;
  const textSecondary = isRoyal ? 'rgba(255,255,255,0.75)' : colors.textSecondary;
  const textMuted = isRoyal ? 'rgba(255,255,255,0.55)' : colors.textMuted;
  const chipBg = isRoyal ? 'rgba(10, 25, 18, 0.5)' : undefined;
  const chipBorder = isRoyal ? 'rgba(255,255,255,0.15)' : colors.border;
  const chipActiveBg = isRoyal ? 'rgba(230, 194, 122, 0.22)' : colors.highlightGlow;
  const chipActiveBorder = isRoyal ? 'rgba(230, 194, 122, 0.5)' : colors.highlight;
  const chipActiveText = isRoyal ? '#E6C27A' : colors.highlight;

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      if (y < lastScrollY.current - SCROLL_UP_THRESHOLD && y > 50) showDock();
      lastScrollY.current = y;
    },
    [showDock]
  );

  const respectSilent = settings?.respectSilentMode ?? true;
  const playPreview = useCallback(
    async (soundKey: (typeof AZAN_SOUND_KEYS)[number]) => {
      if (testPlaybackRef.current) {
        testPlaybackRef.current.stop();
        testPlaybackRef.current = null;
      }
      setTestingSound(true);
      const controller = await playAzanSoundControlled(soundKey, respectSilent);
      testPlaybackRef.current = controller;
      void controller.done.then((result) => {
        if (testPlaybackRef.current === controller) {
          testPlaybackRef.current = null;
        }
        setTestingSound(false);
        if (!result.success && result.error) {
          Alert.alert('Test sound', result.error);
        }
      });
    },
    [respectSilent]
  );

  const handleSelectSound = useCallback(
    (key: (typeof AZAN_SOUND_KEYS)[number]) => {
      if (settings) {
        updateSettings({ ...settings, selectedSound: key });
        playPreview(key);
      }
    },
    [settings, updateSettings, playPreview]
  );

  const handleTestSound = useCallback(async () => {
    if (testingSound && testPlaybackRef.current) {
      testPlaybackRef.current.stop();
      testPlaybackRef.current = null;
      setTestingSound(false);
      return;
    }
    if (settings) {
      await playPreview(settings.selectedSound as (typeof AZAN_SOUND_KEYS)[number]);
    }
  }, [testingSound, settings, playPreview]);

  if (!settings) {
    return (
      <ScreenWrapper>
        <View style={styles.centered}>
          <Text style={{ color: textMuted }}>Loading…</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const handleNotificationsToggle = async (value: boolean) => {
    if (value) {
      const { status: existing } = await Notifications.getPermissionsAsync();
      let final = existing;
      if (existing === 'undetermined') {
        const { status } = await Notifications.requestPermissionsAsync();
        final = status;
      } else if (existing === 'denied') {
        Alert.alert(
          t('enableNotifications'),
          t('notificationPermissionRequired'),
          [
            { text: t('openSettings'), onPress: () => Linking.openSettings() },
            { text: t('back'), style: 'cancel' },
          ]
        );
        return;
      }
      if (final !== 'granted') {
        Alert.alert(
          t('enableNotifications'),
          t('notificationPermissionRequired'),
          [
            { text: t('openSettings'), onPress: () => Linking.openSettings() },
            { text: t('back'), style: 'cancel' },
          ]
        );
        return;
      }
      setNotificationPermissionGranted(true);
    }
    try {
      await updateSettings({ ...settings, notificationsEnabled: value });
    } catch (e) {
      Alert.alert(t('error'), e instanceof Error ? e.message : 'Failed to update');
    }
  };

  return (
    <ScreenWrapper>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.xxl + 72 }]}
        onScroll={onScroll}
        scrollEventThrottle={80}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <BackToHomeBar />
          <TouchableOpacity activeOpacity={1} onPress={handleTitleTap}>
            <Text style={[styles.title, { color: textPrimary }]}>{t('settings')}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.locationBtn,
            { borderColor: chipBorder, backgroundColor: chipBg },
          ]}
          onPress={() => router.push('/location-picker')}
          activeOpacity={0.8}
        >
          <Text style={[styles.locationBtnText, { color: chipActiveText }]}>{t('setLocationManually')}</Text>
        </TouchableOpacity>

        {/* Notifications */}
        <GlassCard padding="lg" rounded="lg" style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textSecondary }]}>{t('sectionNotifications')}</Text>
          <View style={styles.row}>
            <Text style={[styles.label, { color: textPrimary }]}>{t('enableNotifications')}</Text>
            <Switch
              value={settings.notificationsEnabled && (notificationPermissionGranted !== false)}
              onValueChange={(v) => void handleNotificationsToggle(v)}
              trackColor={{ false: isRoyal ? 'rgba(255,255,255,0.2)' : colors.border, true: colors.highlight }}
              thumbColor={isRoyal ? '#fff' : colors.background}
            />
          </View>
          {!settings.notificationsEnabled && notificationPermissionGranted && (
            <TouchableOpacity style={styles.revokeHint} onPress={() => Linking.openSettings()}>
              <Text style={[styles.revokeHintText, { color: textMuted }]}>{t('notificationRevokeHint')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.refreshScheduleBtn} onPress={refreshSchedule}>
            <Text style={[styles.refreshScheduleBtnText, { color: colors.highlight }]}>{t('refreshSchedule')}</Text>
          </TouchableOpacity>
          <Text style={[styles.refreshScheduleHint, { color: textMuted }]}>{t('refreshScheduleHint')}</Text>
        </GlassCard>

        {/* Azan */}
        <GlassCard padding="lg" rounded="lg" style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textSecondary }]}>{t('sectionAzan')}</Text>
          <View style={styles.row}>
            <Text style={[styles.label, { color: textPrimary }]}>{t('playAzanSound')}</Text>
            <Switch
              value={settings.playAzanSound}
              onValueChange={(v) => updateSettings({ ...settings, playAzanSound: v })}
              trackColor={{ false: colors.border, true: colors.highlight }}
              thumbColor={colors.background}
            />
          </View>

          <Text style={[styles.groupLabel, { color: textSecondary }]}>{t('selectSound')}</Text>
          <View style={styles.soundOptions}>
            {SOUND_KEYS.map((key) => (
              <TouchableOpacity
                key={key}
                activeOpacity={0.8}
                style={[
                  styles.soundOption,
                  { borderColor: chipBorder, backgroundColor: chipBg },
                  settings.selectedSound === key && { backgroundColor: chipActiveBg, borderColor: chipActiveBorder },
                ]}
                onPress={() => handleSelectSound(key)}
              >
                <View style={styles.waveRow}>
                  {[4, 8, 12, 8, 4].map((h, i) => (
                    <View
                      key={i}
                      style={[
                        styles.waveBar,
                        {
                          height: h,
                          backgroundColor: settings.selectedSound === key ? chipActiveText : textMuted,
                        },
                      ]}
                    />
                  ))}
                </View>
                <Text
                  style={[
                    styles.soundOptionText,
                    { color: settings.selectedSound === key ? textPrimary : textMuted },
                    settings.selectedSound === key && { fontWeight: fontWeight.semibold, color: chipActiveText },
                  ]}
                >
                  {getSoundLabel(language, key)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={[styles.testBtn, { backgroundColor: colors.highlight }]} onPress={handleTestSound}>
            <Text style={[styles.testBtnText, { color: colors.background }]}>
              {testingSound ? t('stopSound') : t('testSound')}
            </Text>
          </TouchableOpacity>
          <View style={styles.row}>
            <Text style={[styles.label, { color: textPrimary }]}>{t('respectSilentMode')}</Text>
            <Switch
              value={settings.respectSilentMode}
              onValueChange={(v) => updateSettings({ ...settings, respectSilentMode: v })}
              trackColor={{ false: colors.border, true: colors.highlight }}
              thumbColor={colors.background}
            />
          </View>
        </GlassCard>

        {/* Prayer times */}
        <GlassCard padding="lg" rounded="lg" style={styles.prayerTimesSection}>
          <Text style={[styles.sectionTitle, { color: textSecondary }]}>{t('sectionPrayerTimes')}</Text>
          <Text style={[styles.groupLabel, { color: textSecondary }]}>{t('calculationMethod')}</Text>
          <View style={styles.chipRow}>
            {CALC_METHOD_KEYS.map((key) => (
              <TouchableOpacity
                key={key}
                activeOpacity={0.8}
                style={[styles.chip, { borderColor: chipBorder, backgroundColor: chipBg }, settings.calculationMethod === key && { backgroundColor: chipActiveBg, borderColor: chipActiveBorder }]}
                onPress={() => updateSettings({ ...settings, calculationMethod: key })}
              >
                <Text style={[styles.chipText, { color: textPrimary }, settings.calculationMethod === key && { color: chipActiveText, fontWeight: fontWeight.semibold }]}>
                  {translations[language].calculationMethodOptions[key]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.groupLabel, { color: textSecondary }]}>{t('asrMethod')}</Text>
          <View style={[styles.chipRow, styles.chipRowLast]}>
            {ASR_KEYS.map((key) => (
              <TouchableOpacity
                key={key}
                activeOpacity={0.8}
                style={[styles.chip, { borderColor: chipBorder, backgroundColor: chipBg }, settings.asrMethod === key && { backgroundColor: chipActiveBg, borderColor: chipActiveBorder }]}
                onPress={() => updateSettings({ ...settings, asrMethod: key })}
              >
                <Text style={[styles.chipText, { color: textPrimary }, settings.asrMethod === key && { color: chipActiveText, fontWeight: fontWeight.semibold }]}>
                  {translations[language].asrMethodOptions[key]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.groupLabel, { color: textSecondary }]}>{t('prayerOffset')}</Text>
          {PRAYER_NAMES_ORDER.map((name) => {
            const off = settings.prayerOffsets[name] ?? 0;
            return (
              <View key={name} style={[styles.offsetRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.offsetPrayerName, { color: textPrimary }]}>{translations[language].prayers[name]}</Text>
                <View style={styles.offsetControls}>
                  <TouchableOpacity
                    style={[styles.offsetBtn, { backgroundColor: colors.highlight }, off <= OFFSET_MIN && styles.offsetBtnDisabled]}
                    onPress={() =>
                      updateSettings({
                        ...settings,
                        prayerOffsets: { ...settings.prayerOffsets, [name]: Math.max(OFFSET_MIN, off - 1) },
                      })
                    }
                    disabled={off <= OFFSET_MIN}
                  >
                    <Text style={[styles.offsetBtnText, { color: colors.background }]}>−</Text>
                  </TouchableOpacity>
                  <Text style={[styles.offsetValue, { color: textPrimary }]}>{off >= 0 ? `+${off}` : off} min</Text>
                  <TouchableOpacity
                    style={[styles.offsetBtn, { backgroundColor: colors.highlight }, off >= OFFSET_MAX && styles.offsetBtnDisabled]}
                    onPress={() =>
                      updateSettings({
                        ...settings,
                        prayerOffsets: { ...settings.prayerOffsets, [name]: Math.min(OFFSET_MAX, off + 1) },
                      })
                    }
                    disabled={off >= OFFSET_MAX}
                  >
                    <Text style={[styles.offsetBtnText, { color: colors.background }]}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          <Text style={[styles.groupLabel, { color: textSecondary }]}>{t('notifyForPrayer')}</Text>
          {PRAYER_NAMES_ORDER.map((name) => (
            <View key={name} style={styles.row}>
              <Text style={[styles.label, { color: textPrimary }]}>{translations[language].prayers[name]}</Text>
              <Switch
                value={settings.prayerNotify[name] ?? true}
                onValueChange={(v) =>
                  updateSettings({
                    ...settings,
                    prayerNotify: { ...settings.prayerNotify, [name]: v },
                  })
                }
                trackColor={{ false: colors.border, true: colors.highlight }}
                thumbColor={colors.background}
              />
            </View>
          ))}
          <TouchableOpacity style={styles.refreshScheduleBtn} onPress={refreshSchedule}>
            <Text style={[styles.refreshScheduleBtnText, { color: colors.highlight }]}>{t('refreshSchedule')}</Text>
          </TouchableOpacity>
          <Text style={[styles.refreshScheduleHint, { color: textMuted }]}>{t('refreshScheduleHint')}</Text>
        </GlassCard>

        {/* Info */}
        <GlassCard padding="lg" rounded="lg" fillContent={false} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textSecondary }]}>{t('sectionInfo')}</Text>
          <Text style={[styles.knownLimitationsTitle, { color: textPrimary }]}>{t('knownLimitations')}</Text>
          <Text style={[styles.knownLimitationsText, { color: textMuted }]}>{t('knownLimitationsText')}</Text>
        </GlassCard>

        {/* App */}
        <GlassCard padding="lg" rounded="lg" style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textSecondary }]}>{t('sectionApp')}</Text>
          <Text style={[styles.label, { color: textPrimary }]}>{t('onboardingChooseLanguage')}</Text>
          <View style={styles.langRow}>
            <View style={styles.langRowInner}>
              {(['en', 'ar', 'tr', 'fr'] as const).map((lang) => (
                <TouchableOpacity
                  key={lang}
                  activeOpacity={0.8}
                  style={[styles.langBtn, { borderColor: chipBorder, backgroundColor: chipBg }, language === lang && { backgroundColor: chipActiveBg, borderColor: chipActiveBorder }]}
                  onPress={() => updateLanguage(lang)}
                >
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                    style={[styles.langBtnText, { color: textPrimary }, language === lang && { color: chipActiveText, fontWeight: fontWeight.semibold }]}
                  >
                    {{ en: 'English', ar: 'العربية', tr: 'Türkçe', fr: 'Français' }[lang]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.langRowInner}>
              {(['es', 'sv', 'de'] as const).map((lang) => (
                <TouchableOpacity
                  key={lang}
                  activeOpacity={0.8}
                  style={[styles.langBtn, { borderColor: chipBorder, backgroundColor: chipBg }, language === lang && { backgroundColor: chipActiveBg, borderColor: chipActiveBorder }]}
                  onPress={() => updateLanguage(lang)}
                >
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                    style={[styles.langBtnText, { color: textPrimary }, language === lang && { color: chipActiveText, fontWeight: fontWeight.semibold }]}
                  >
                    {{ es: 'Español', sv: 'Svenska', de: 'Deutsch' }[lang]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </GlassCard>

        <Text style={[styles.versionText, { color: textMuted }]}>
          v{Constants.expoConfig?.version ?? '?'}
        </Text>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: spacing.lg, paddingBottom: spacing.md },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.regular, fontFamily: fontFamily.heading },
  locationBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  locationBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  section: { marginTop: spacing.lg, marginBottom: spacing.md },
  prayerTimesSection: { marginTop: spacing.lg, marginBottom: spacing.md },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  label: { fontSize: fontSize.md, flex: 1 },
  groupLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginTop: spacing.md, marginBottom: spacing.xs },
  soundOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs, marginBottom: spacing.sm },
  soundOption: {
    minWidth: 72,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  waveRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, marginBottom: spacing.xs },
  waveBar: { width: 4, borderRadius: 2 },
  soundOptionText: { fontSize: fontSize.sm },
  testBtn: { paddingVertical: spacing.md, borderRadius: radius.lg, alignItems: 'center', marginTop: spacing.md },
  testBtnDisabled: { opacity: 0.6 },
  testBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  revokeHint: { paddingVertical: spacing.xs, paddingHorizontal: 0 },
  revokeHintText: { fontSize: 12 },
  refreshScheduleBtn: { paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.xs },
  refreshScheduleHint: { fontSize: 11, marginTop: -spacing.xs },
  refreshScheduleBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  knownLimitationsTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, marginBottom: spacing.xs },
  knownLimitationsText: { fontSize: fontSize.sm, lineHeight: 20, paddingBottom: radius.lg },
  langRow: { flexDirection: 'column', gap: spacing.sm, marginTop: spacing.sm },
  langRowInner: { flexDirection: 'row', gap: spacing.xs },
  langBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 0,
  },
  langBtnText: { fontSize: fontSize.sm, flexShrink: 1 },
  themeRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm },
  themeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 0,
  },
  themeBtnText: { fontSize: fontSize.sm, flexShrink: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  chipRowLast: { marginBottom: spacing.md },
  chip: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth },
  chipText: { fontSize: fontSize.sm },
  offsetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  offsetPrayerName: { fontSize: fontSize.sm },
  offsetControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  offsetBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  offsetBtnDisabled: { opacity: 0.4 },
  offsetBtnText: { fontSize: 18, fontWeight: '700' },
  offsetValue: { fontSize: fontSize.sm, minWidth: 48, textAlign: 'center' },
  versionText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
});
