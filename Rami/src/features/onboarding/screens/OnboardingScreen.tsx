/**
 * Onboarding: Step 1 Language, Step 2 Location, Step 3 Notifications.
 * Save and go Home when done.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { saveLanguage, saveLocation, savePrayerSettings, DEFAULT_SETTINGS } from '../../prayer/storage/prayerSettings';
import { setOnboardingDone } from '../storage';
import type { Language } from '../../prayer/types';
import { ScreenWrapper } from '../../../components/ScreenWrapper';
import { useLanguage } from '../../../contexts/LanguageContext';
import { t } from '../../../constants/i18n';
import { countryNameToCode, normalizeCountryCode } from '../../prayer/constants/presets';

const STEPS = 3;

/** Fallback when location services are unavailable (e.g. simulator, location off). */
const DEFAULT_LOCATION = { lat: 59.3293, lon: 18.0686, label: 'Stockholm', countryCode: 'SE', country: 'Sweden' };

const textShadow = Platform.select({
  ios: { textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  android: { textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
});

export function OnboardingScreen() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const [step, setStep] = useState(1);
  const [lang, setLang] = useState<Language>('ar');
  const [loading, setLoading] = useState(false);

  const finishOnboarding = async () => {
    const settings = { ...DEFAULT_SETTINGS };
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      settings.notificationsEnabled = false;
    }
    await savePrayerSettings(settings);
    await setOnboardingDone();
    router.replace('/');
  };

  const handleNext = async () => {
    if (step === 1) {
      await saveLanguage(lang);
      setLanguage(lang);
      setStep(2);
      return;
    }
    if (step === 2) {
      setLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            t(language, 'onboardingLocationAlertTitle'),
            t(language, 'onboardingLocationAlertMessage'),
          );
          setLoading(false);
          return;
        }
        try {
          let pos: { coords: { latitude: number; longitude: number } } | null = null;
          try {
            pos = await Promise.race([
              Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Location timeout')), 15000)
              ),
            ]);
          } catch {
            const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 600000 });
            if (lastKnown) pos = lastKnown;
          }
          if (pos) {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            let countryCode: string | undefined;
            let country: string | undefined;
            try {
              const [first] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
              const withIso = first as (Location.LocationGeocodedAddress & { isoCountryCode?: string; countryCode?: string }) | undefined;
              country = first?.country ?? undefined;
              countryCode =
                normalizeCountryCode(withIso?.isoCountryCode) ??
                normalizeCountryCode(withIso?.countryCode) ??
                countryNameToCode(country) ??
                undefined;
            } catch {
              /* keep location without country metadata */
            }
            await saveLocation({ lat, lon, countryCode, country });
          } else {
            throw new Error('No location');
          }
        } catch (_e) {
          // Location services disabled, simulator without GPS, timeout, or unavailable
          Alert.alert(
            t(language, 'onboardingLocationUnavailableTitle'),
            t(language, 'onboardingLocationUnavailableMessage'),
            [
              { text: t(language, 'retry'), onPress: () => handleNext() },
              {
                text: t(language, 'onboardingUseDefaultLocation'),
                onPress: async () => {
                  await saveLocation(DEFAULT_LOCATION);
                  setStep(3);
                },
              },
            ],
          );
          setLoading(false);
          return;
        }
      } finally {
        setLoading(false);
      }
      setStep(3);
      return;
    }
    if (step === 3) {
      setLoading(true);
      try {
        const { status: existing } = await Notifications.getPermissionsAsync();
        let finalStatus = existing;
        if (existing !== 'granted') {
          const { status: requested } = await Notifications.requestPermissionsAsync();
          finalStatus = requested;
        }
        if (finalStatus !== 'granted') {
          setLoading(false);
          Alert.alert(
            t(language, 'onboardingAllowNotifications'),
            t(language, 'onboardingNotificationsPermissionDenied') +
              (Platform.OS === 'android' ? t(language, 'onboardingAndroidNotificationHint') : ''),
            [
              {
                text: t(language, 'onboardingOpenSettings'),
                onPress: () => {
                  Linking.openSettings();
                  finishOnboarding();
                },
              },
              {
                text: t(language, 'onboardingContinueWithout'),
                onPress: () => finishOnboarding(),
              },
            ]
          );
          return;
        }
      } finally {
        setLoading(false);
      }
      await finishOnboarding();
      return;
    }
  };

  const stepLabel = t(language, 'onboardingStepOf').replace('{step}', String(step)).replace('{total}', String(STEPS));

  return (
    <ScreenWrapper style={styles.container}>
      <View style={styles.content}>
        <Text style={[styles.stepLabel, styles.royalText]}>{stepLabel}</Text>
        {step === 1 && (
          <>
            <Text style={[styles.title, styles.royalTitle]}>{t(language, 'onboardingChooseLanguage')}</Text>
            <View style={styles.options}>
              {(['ar', 'en', 'tr', 'fr', 'es', 'sv', 'de'] as const).map((l) => (
                <TouchableOpacity
                  key={l}
                  style={[styles.opt, styles.optRoyal, lang === l && styles.optSelRoyal]}
                  onPress={async () => {
                    setLang(l);
                    setLanguage(l);
                    await saveLanguage(l);
                  }}
                >
                  <Text style={[styles.optText, styles.optTextRoyal, lang === l && styles.optTextSelRoyal]}>
                    {{ ar: 'العربية', en: 'English', tr: 'Türkçe', fr: 'Français', es: 'Español', sv: 'Svenska', de: 'Deutsch' }[l]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
        {step === 2 && (
          <>
            <Text style={[styles.title, styles.royalTitle]}>{t(language, 'onboardingAllowLocation')}</Text>
            <Text style={[styles.body, styles.royalBody]}>{t(language, 'onboardingLocationBody')}</Text>
            {loading && <ActivityIndicator size="large" color="#E6C27A" style={styles.spinner} />}
          </>
        )}
        {step === 3 && (
          <>
            <Text style={[styles.title, styles.royalTitle]}>{t(language, 'onboardingAllowNotifications')}</Text>
            <Text style={[styles.body, styles.royalBody]}>{t(language, 'onboardingNotificationsBody')}</Text>
            {loading && <ActivityIndicator size="large" color="#E6C27A" style={styles.spinner} />}
          </>
        )}
      </View>
      <TouchableOpacity style={[styles.nextBtn, styles.nextBtnRoyal]} onPress={handleNext} disabled={loading}>
        <Text style={styles.nextBtnText}>{step === STEPS ? t(language, 'onboardingFinish') : t(language, 'onboardingNext')}</Text>
      </TouchableOpacity>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between' },
  content: { padding: 24 },
  stepLabel: { fontSize: 12, color: '#888', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#111', marginBottom: 16 },
  body: { fontSize: 16, color: '#555', lineHeight: 24, marginBottom: 24 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  opt: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, backgroundColor: '#e8e8e8' },
  optSel: { backgroundColor: '#1a472a' },
  optText: { fontSize: 16, color: '#333' },
  optTextSel: { color: '#fff', fontWeight: '600' },
  spinner: { marginTop: 24 },
  nextBtn: { margin: 24, paddingVertical: 16, borderRadius: 10, backgroundColor: '#1a472a', alignItems: 'center' },
  nextBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  // Royal background: light text + shadow for readability
  royalText: { color: 'rgba(255,255,255,0.75)', ...textShadow },
  royalTitle: { color: 'rgba(255,255,255,0.96)', ...textShadow },
  royalBody: { color: 'rgba(255,255,255,0.85)', ...textShadow },
  optRoyal: { backgroundColor: 'rgba(10, 25, 18, 0.72)', borderWidth: 1, borderColor: 'rgba(230, 194, 122, 0.28)' },
  optSelRoyal: { backgroundColor: 'rgba(230, 194, 122, 0.25)', borderColor: 'rgba(230, 194, 122, 0.5)' },
  optTextRoyal: { color: 'rgba(255,255,255,0.9)', ...textShadow },
  optTextSelRoyal: { color: '#E6C27A', fontWeight: '600' },
  nextBtnRoyal: { backgroundColor: 'rgba(10, 25, 18, 0.9)', borderWidth: 1, borderColor: 'rgba(230, 194, 122, 0.4)' },
});
