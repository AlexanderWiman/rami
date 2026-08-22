/**
 * Personal Space — soft glass cards; Adhan via stylad drop-down (sheet + blur).
 */
import React, { useState, useCallback, useRef, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  Alert,
  Linking,
  Share,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
  useWindowDimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../theme/ThemeContext';
import { useDockVisibility } from '../../../components/SacredDock';
import { ScreenWrapper } from '../../../components/ScreenWrapper';
import { BackToHomeBar } from '../../../components/BackToHomeBar';
import { GlassCard } from '../../../components/GlassCard';
import { usePrayerTimes } from '../hooks/usePrayerTimes';
import { playAzanSoundControlled, type SoundKey } from '../utils/playAzan';
import { getString, getSoundLabel, translations } from '../../../constants/i18n';
import type { Language } from '../types';
import { PRAYER_NAMES_ORDER } from '../constants/methods';
import { AZAN_SOUND_KEYS } from '../constants/azan';
import {
  CUSTOM_AZAN_KEY,
  clearCustomAzan,
  loadCustomAzan,
  pickCustomAzan,
  type CustomAzan,
} from '../storage/customAzan';
import { spacing, radius } from '../../../theme/spacing';
import { fontSize, fontWeight, fontFamily } from '../../../theme/typography';
import { hapticSelection } from '../../../utils/haptics';

const SOUND_KEYS = AZAN_SOUND_KEYS;
const OFFSET_MIN = -30;
const OFFSET_MAX = 30;

const SCROLL_UP_THRESHOLD = 30;
const lastScrollY = { current: 0 };

const ADMIN_TAP_TARGET = 20;
const ADMIN_TAP_TIMEOUT_MS = 5000;

const STORE_URL_ANDROID = 'https://play.google.com/store/apps/details?id=com.rami.burhank';
// App not on App Store yet – use Play Store link for sharing on iOS too
const STORE_URL_IOS = STORE_URL_ANDROID;

export function PrayerSettingsScreen() {
  const { colors, pageBackground, style, scheme } = useTheme();
  const isRoyal = style === 'royal';
  const { showDock } = useDockVisibility();
  const { settings, language, clockFormat, setClockFormat, updateSettings, updateLanguage, refreshSchedule, refreshTimes } = usePrayerTimes();
  const [testingSound, setTestingSound] = useState(false);
  const testPlaybackRef = useRef<null | { stop: () => void }>(null);
  const router = useRouter();
  
  // Hidden admin login - tap title 20 times
  const [adminTapCount, setAdminTapCount] = useState(0);
  const adminTapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync notification permission with system when screen gains focus (user may have changed it in phone settings)
  const [notificationPermissionGranted, setNotificationPermissionGranted] = useState<boolean | null>(null);
  const [sendingTestPush, setSendingTestPush] = useState(false);
  const [azanPickerOpen, setAzanPickerOpen] = useState(false);
  const [customAzan, setCustomAzan] = useState<CustomAzan | null>(null);
  const insets = useSafeAreaInsets();

  // Load the user's own adhan file (if any) so the picker can show its name.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadCustomAzan().then((azan) => {
        if (active) setCustomAzan(azan);
      });
      return () => {
        active = false;
      };
    }, [])
  );

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

  const { height: windowHeight } = useWindowDimensions();
  const azanPickerMaxHeight = useMemo(
    () => Math.min(windowHeight * 0.52, 380),
    [windowHeight]
  );

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
    async (soundKey: SoundKey) => {
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

  const pickAzanSound = useCallback(
    async (key: SoundKey) => {
      if (!settings) return;
      await hapticSelection();
      updateSettings({ ...settings, selectedSound: key });
      setAzanPickerOpen(false);
    },
    [settings, updateSettings]
  );

  /** Pick an audio file from the phone and select it as the adhan sound. */
  const handlePickCustomAzan = useCallback(async () => {
    if (!settings) return;
    const result = await pickCustomAzan();
    if (result.status === 'canceled') return;
    if (result.status === 'error') {
      Alert.alert(t('customAzan'), t('customAzanError'));
      return;
    }
    setCustomAzan(result.azan);
    await hapticSelection();
    updateSettings({ ...settings, selectedSound: CUSTOM_AZAN_KEY });
    setAzanPickerOpen(false);
  }, [settings, updateSettings, t]);

  /** Forget the user's file and fall back to the first bundled adhan. */
  const handleRemoveCustomAzan = useCallback(async () => {
    if (!settings) return;
    await clearCustomAzan();
    setCustomAzan(null);
    if (settings.selectedSound === CUSTOM_AZAN_KEY) {
      updateSettings({ ...settings, selectedSound: AZAN_SOUND_KEYS[0] });
    }
  }, [settings, updateSettings]);

  const handleTestSound = useCallback(async () => {
    if (testingSound && testPlaybackRef.current) {
      testPlaybackRef.current.stop();
      testPlaybackRef.current = null;
      setTestingSound(false);
      return;
    }
    if (settings) {
      await playPreview(settings.selectedSound as SoundKey);
    }
  }, [testingSound, settings, playPreview]);

  const storeUrl = Platform.OS === 'ios' ? STORE_URL_IOS : STORE_URL_ANDROID;
  const appName = translations[language]?.appName ?? translations.en.appName;

  const handleShareApp = useCallback(async () => {
    try {
      await Share.share({
        message: `${appName}\n${storeUrl}`,
        title: appName,
        url: Platform.OS === 'ios' ? storeUrl : undefined,
      });
    } catch {
      /* user dismissed */
    }
  }, [appName, storeUrl]);

  const handleRateApp = useCallback(async () => {
    try {
      await Linking.openURL(storeUrl);
    } catch {
      /* ignore */
    }
  }, [storeUrl]);

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
        <GlassCard padding="lg" rounded="lg" fillContent={false} style={styles.section}>
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
          {settings.notificationsEnabled && notificationPermissionGranted !== false && (
            <>
              <View style={[styles.row, { marginTop: spacing.sm }]}>
                <Text style={[styles.label, { color: textPrimary, flex: 1, paddingRight: spacing.sm }]}>
                  {t('alhamdulillahReminder')}
                </Text>
                <Switch
                  value={settings.alhamdulillahReminderEnabled}
                  onValueChange={(v) => void updateSettings({ ...settings, alhamdulillahReminderEnabled: v })}
                  trackColor={{ false: isRoyal ? 'rgba(255,255,255,0.2)' : colors.border, true: colors.highlight }}
                  thumbColor={isRoyal ? '#fff' : colors.background}
                />
              </View>
              <Text style={[styles.refreshScheduleHint, { color: textMuted, marginTop: spacing.xs }]}>
                {t('alhamdulillahReminderHint')}
              </Text>
            </>
          )}
          {!settings.notificationsEnabled && notificationPermissionGranted && (
            <TouchableOpacity style={styles.revokeHint} onPress={() => Linking.openSettings()}>
              <Text style={[styles.revokeHintText, { color: textMuted }]}>{t('notificationRevokeHint')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.refreshScheduleBtn} onPress={refreshSchedule}>
            <Text style={[styles.refreshScheduleBtnText, { color: colors.highlight }]}>{t('refreshSchedule')}</Text>
          </TouchableOpacity>
          <Text style={[styles.refreshScheduleHint, { color: textMuted }]}>{t('refreshScheduleHint')}</Text>
          <TouchableOpacity
            style={[styles.testPushBtn, { borderColor: chipBorder, backgroundColor: chipBg }]}
            onPress={async () => {
              setSendingTestPush(true);
              try {
                if (Platform.OS === 'android' && Constants.appOwnership === 'expo') {
                  throw new Error('notifications_unavailable_in_expo_go_android');
                }
                const { scheduleTestNotification } = await import('../notifications/scheduler');
                await scheduleTestNotification(settings);
                Alert.alert(t('testNotification'), t('testNotificationBody'));
              } catch {
                Alert.alert(t('testNotification'), t('testNotificationTapHint'));
              } finally {
                setSendingTestPush(false);
              }
            }}
            disabled={sendingTestPush}
            activeOpacity={0.8}
          >
            <Text style={[styles.testPushBtnText, { color: chipActiveText }]}>
              {sendingTestPush ? '...' : t('testNotification')}
            </Text>
          </TouchableOpacity>
        </GlassCard>

        {/* Azan */}
        <GlassCard padding="lg" rounded="lg" fillContent={false} style={styles.azanSection}>
          <View style={styles.azanCardBody}>
          <Text style={[styles.sectionTitle, { color: textSecondary }]}>{t('sectionAzan')}</Text>
          <View style={styles.row}>
            <Text style={[styles.label, { color: textPrimary }]}>{t('playAzanSound')}</Text>
            <Switch
              value={settings.playAzanSound}
              onValueChange={(v) => updateSettings({ ...settings, playAzanSound: v })}
              trackColor={{ false: isRoyal ? 'rgba(255,255,255,0.2)' : colors.border, true: colors.highlight }}
              thumbColor={isRoyal ? '#fff' : colors.background}
            />
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: textPrimary }]}>{t('respectSilentMode')}</Text>
            <Switch
              value={settings.respectSilentMode}
              onValueChange={(v) => updateSettings({ ...settings, respectSilentMode: v })}
              trackColor={{ false: isRoyal ? 'rgba(255,255,255,0.2)' : colors.border, true: colors.highlight }}
              thumbColor={isRoyal ? '#fff' : colors.background}
            />
          </View>

          <Text style={[styles.groupLabel, { color: textSecondary }]}>{t('selectSound')}</Text>
          <TouchableOpacity
            style={[
              styles.soundDropdownTrigger,
              { borderColor: chipBorder, backgroundColor: chipBg },
              !settings.playAzanSound && styles.soundDropdownTriggerMuted,
            ]}
            onPress={() => setAzanPickerOpen(true)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t('selectSound')}
            accessibilityHint={getSoundLabel(language, settings.selectedSound)}
          >
            <View style={styles.soundDropdownTriggerInner}>
              <View style={styles.waveRow}>
                {[4, 8, 12, 8, 4].map((h, i) => (
                  <View
                    key={i}
                    style={[
                      styles.waveBar,
                      {
                        height: h,
                        backgroundColor: chipActiveText,
                        opacity: settings.playAzanSound ? 1 : 0.35,
                      },
                    ]}
                  />
                ))}
              </View>
              <Text
                style={[styles.soundDropdownLabel, { color: textPrimary }]}
                numberOfLines={2}
              >
                {getSoundLabel(language, settings.selectedSound)}
              </Text>
              <Ionicons name="chevron-down" size={22} color={textMuted} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testPushBtn, { borderColor: chipBorder, backgroundColor: chipBg }]}
            onPress={handleTestSound}
            activeOpacity={0.8}
          >
            <Text style={[styles.testPushBtnText, { color: chipActiveText }]}>
              {testingSound ? t('stopSound') : t('testSound')}
            </Text>
          </TouchableOpacity>
          </View>
        </GlassCard>

        {/* Prayer times */}
        <GlassCard padding="lg" rounded="lg" style={styles.prayerTimesSection}>
          <Text style={[styles.sectionTitle, { color: textSecondary }]}>{t('sectionPrayerTimes')}</Text>
          <Text style={[styles.groupLabel, { color: textSecondary }]}>{t('timeFormat')}</Text>
          <View style={styles.clockFormatRow}>
            <TouchableOpacity
              style={[styles.clockFormatChip, { borderColor: chipBorder, backgroundColor: chipBg }, clockFormat === '12h' && { backgroundColor: chipActiveBg, borderColor: chipActiveBorder }]}
              onPress={() => setClockFormat('12h')}
            >
              <Text style={[styles.clockFormatChipText, { color: textPrimary }, clockFormat === '12h' && { color: chipActiveText, fontWeight: fontWeight.semibold }]}>{t('timeFormat12h')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.clockFormatChip, { borderColor: chipBorder, backgroundColor: chipBg }, clockFormat === '24h' && { backgroundColor: chipActiveBg, borderColor: chipActiveBorder }]}
              onPress={() => setClockFormat('24h')}
            >
              <Text style={[styles.clockFormatChipText, { color: textPrimary }, clockFormat === '24h' && { color: chipActiveText, fontWeight: fontWeight.semibold }]}>{t('timeFormat24h')}</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.refreshScheduleHint, { color: textMuted, marginTop: 0, marginBottom: spacing.sm }]}>{t('adjustPrayerTimesHint')}</Text>
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

        {/* Share & Rate */}
        <View style={styles.shareRateRow}>
          <TouchableOpacity
            style={[styles.shareRateBtn, { borderColor: chipBorder, backgroundColor: chipBg }]}
            onPress={handleShareApp}
            activeOpacity={0.8}
          >
            <Text style={[styles.shareRateBtnText, { color: chipActiveText }]}>{t('shareApp')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.shareRateBtn, { borderColor: chipBorder, backgroundColor: chipBg }]}
            onPress={handleRateApp}
            activeOpacity={0.8}
          >
            <Text style={[styles.shareRateBtnText, { color: chipActiveText }]}>{t('rateApp')}</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.versionText, { color: textMuted }]}>
          v{Constants.expoConfig?.version ?? '?'}
        </Text>
      </ScrollView>

      <Modal
        transparent
        visible={azanPickerOpen}
        animationType="fade"
        onRequestClose={() => setAzanPickerOpen(false)}
        statusBarTranslucent
      >
        <View style={styles.azanPickerRoot}>
          <TouchableWithoutFeedback onPress={() => setAzanPickerOpen(false)}>
            <View style={StyleSheet.absoluteFill}>
              {Platform.OS === 'ios' ? (
                <BlurView
                  intensity={48}
                  tint={scheme === 'dark' ? 'dark' : 'light'}
                  style={StyleSheet.absoluteFill}
                />
              ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.52)' }]} />
              )}
            </View>
          </TouchableWithoutFeedback>
          <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, styles.azanPickerSheetWrap]}>
            <View
              style={[
                styles.azanPickerSheet,
                {
                  borderColor: chipBorder,
                  backgroundColor: isRoyal ? 'rgba(10, 25, 18, 0.97)' : colors.surface,
                  paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm,
                },
              ]}
            >
              <View style={styles.azanPickerHandleWrap}>
                <View style={[styles.azanPickerHandle, { backgroundColor: textMuted }]} />
              </View>
              <Text style={[styles.azanPickerTitle, { color: textSecondary }]}>{t('selectSound')}</Text>
              <ScrollView
                style={{ maxHeight: azanPickerMaxHeight }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {SOUND_KEYS.map((key, index) => {
                  const selected = settings.selectedSound === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      activeOpacity={0.75}
                      style={[
                        styles.azanPickerRow,
                        index < SOUND_KEYS.length - 1 && {
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: chipBorder,
                        },
                      ]}
                      onPress={() => void pickAzanSound(key)}
                    >
                      <View style={styles.waveRow}>
                        {[4, 8, 12, 8, 4].map((h, i) => (
                          <View
                            key={i}
                            style={[
                              styles.waveBar,
                              {
                                height: h,
                                backgroundColor: selected ? chipActiveText : textMuted,
                                opacity: selected ? 1 : 0.55,
                              },
                            ]}
                          />
                        ))}
                      </View>
                      <Text
                        style={[
                          styles.azanPickerRowLabel,
                          { color: textPrimary },
                          selected && { color: chipActiveText, fontWeight: fontWeight.semibold },
                        ]}
                      >
                        {getSoundLabel(language, key)}
                      </Text>
                      {selected ? (
                        <Ionicons name="checkmark-circle" size={24} color={chipActiveText} />
                      ) : (
                        <View style={styles.azanPickerRowCheckPlaceholder} />
                      )}
                    </TouchableOpacity>
                  );
                })}

                {/* User's own adhan file */}
                <View style={[styles.azanPickerCustomWrap, { borderTopColor: chipBorder }]}>
                  <TouchableOpacity
                    activeOpacity={0.75}
                    style={styles.azanPickerRow}
                    onPress={() => void handlePickCustomAzan()}
                  >
                    <Ionicons
                      name="folder-open-outline"
                      size={20}
                      color={
                        settings.selectedSound === CUSTOM_AZAN_KEY ? chipActiveText : textMuted
                      }
                      style={styles.azanPickerCustomIcon}
                    />
                    <View style={styles.azanPickerCustomLabels}>
                      <Text
                        style={[
                          styles.azanPickerRowLabel,
                          styles.azanPickerCustomLabel,
                          { color: textPrimary },
                          settings.selectedSound === CUSTOM_AZAN_KEY && {
                            color: chipActiveText,
                            fontWeight: fontWeight.semibold,
                          },
                        ]}
                      >
                        {t('customAzan')}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[styles.azanPickerCustomHint, { color: textMuted }]}
                      >
                        {customAzan ? customAzan.name : t('customAzanPick')}
                      </Text>
                    </View>
                    {settings.selectedSound === CUSTOM_AZAN_KEY ? (
                      <Ionicons name="checkmark-circle" size={24} color={chipActiveText} />
                    ) : (
                      <View style={styles.azanPickerRowCheckPlaceholder} />
                    )}
                  </TouchableOpacity>

                  {customAzan ? (
                    <View style={styles.azanPickerCustomActions}>
                      {settings.selectedSound !== CUSTOM_AZAN_KEY ? (
                        <TouchableOpacity
                          activeOpacity={0.75}
                          onPress={() => void pickAzanSound(CUSTOM_AZAN_KEY)}
                        >
                          <Text style={[styles.azanPickerCustomAction, { color: chipActiveText }]}>
                            {t('selectSound')}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                      <TouchableOpacity
                        activeOpacity={0.75}
                        onPress={() => void handleRemoveCustomAzan()}
                      >
                        <Text style={[styles.azanPickerCustomAction, { color: textMuted }]}>
                          {t('customAzanRemove')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  <Text style={[styles.azanPickerCustomNote, { color: textMuted }]}>
                    {t('customAzanNotificationNote')}
                  </Text>
                </View>
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
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
  azanSection: { marginTop: spacing.lg, marginBottom: spacing.sm },
  prayerTimesSection: { marginTop: spacing.md, marginBottom: spacing.md },
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
  clockFormatRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  clockFormatChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  clockFormatChipText: { fontSize: fontSize.sm },
  soundDropdownTrigger: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  soundDropdownTriggerMuted: { opacity: 0.72 },
  soundDropdownTriggerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  soundDropdownLabel: { flex: 1, fontSize: fontSize.md, lineHeight: 22 },
  waveRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  waveBar: { width: 4, borderRadius: 2 },
  azanPickerRoot: { flex: 1 },
  azanPickerSheetWrap: { justifyContent: 'flex-end' },
  azanPickerSheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  azanPickerHandleWrap: { alignItems: 'center', paddingBottom: spacing.sm },
  azanPickerHandle: { width: 36, height: 4, borderRadius: 2, opacity: 0.45 },
  azanPickerTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
  },
  azanPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingRight: spacing.xs,
  },
  azanPickerRowLabel: { flex: 1, fontSize: fontSize.md, lineHeight: 22 },
  azanPickerRowCheckPlaceholder: { width: 24, height: 24 },
  azanPickerCustomWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
  },
  azanPickerCustomIcon: { width: 28, textAlign: 'center' },
  azanPickerCustomLabels: { flex: 1 },
  azanPickerCustomLabel: { flex: 0 },
  azanPickerCustomHint: { fontSize: fontSize.xs, lineHeight: 16, marginTop: 2 },
  azanPickerCustomActions: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  azanPickerCustomAction: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  azanPickerCustomNote: {
    fontSize: fontSize.xs,
    lineHeight: 16,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  azanCardBody: { paddingBottom: spacing.lg },
  revokeHint: { paddingVertical: spacing.xs, paddingHorizontal: 0 },
  revokeHintText: { fontSize: 12 },
  refreshScheduleBtn: { paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.xs },
  refreshScheduleHint: { fontSize: 11, marginTop: -spacing.xs },
  refreshScheduleBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  testPushBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center' as const,
    marginTop: spacing.md,
  },
  testPushBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
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
  shareRateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  shareRateBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  shareRateBtnText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  versionText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
});
