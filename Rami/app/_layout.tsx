import 'expo-asset';
import { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider as NavigationThemeProvider, DarkTheme, DefaultTheme } from "expo-router/react-navigation";
import * as Notifications from 'expo-notifications';
import { useColorScheme } from 'react-native';
import { Platform } from 'react-native';
import { setAudioModeAsync } from 'expo-audio';
import { ensureAndroidNotificationChannels } from '../src/features/prayer/notifications/channels';
import { setPendingPlayAzanFromNotification } from '../src/features/prayer/notificationResponse';
import { isOnboardingDone } from '../src/features/onboarding/storage';
import { registerForPushNotifications } from '../src/services/pushRegistration';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import { AdminProvider } from '../src/features/admin/AdminContext';
import { QuranAudioProvider } from '../src/features/quran/context/QuranAudioContext';
import { applyPendingUpdateOnLaunch } from '../src/services/autoUpdate';
import { UpdateOverlay } from '../src/components/UpdateOverlay';

const TransparentLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: 'transparent',
    card: 'transparent',
  },
};

const TransparentDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: 'transparent',
    card: 'transparent',
  },
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const navTheme = colorScheme === 'dark' ? TransparentDarkTheme : TransparentLightTheme;

  // Before anything else on a cold start: take a pending OTA update if one is
  // ready quickly, so it does not wait for a second launch to appear.
  const [downloadingUpdate, setDownloadingUpdate] = useState(false);
  useEffect(() => {
    // The flag is cleared on the way out for the case where the download did not
    // finish inside its budget: then there is no reload and the notice must go.
    void applyPendingUpdateOnLaunch(() => setDownloadingUpdate(true)).finally(() =>
      setDownloadingUpdate(false)
    );
  }, []);

  useEffect(() => {
    ensureAndroidNotificationChannels().catch(() => {});

    // Register for remote push after onboarding, with current settings + location.
    // Also ensure Android notification channel for the selected azan sound exists
    // (needed for remote push to play the right sound on Android).
    isOnboardingDone().then(async (done) => {
      if (!done) return;
      try {
        const { loadPrayerSettings, loadLocation, loadLanguage } = await import(
          '../src/features/prayer/storage/prayerSettings'
        );
        const { ensurePrayerChannelForSound } = await import(
          '../src/features/prayer/notifications/channels'
        );
        const { isAzanSoundKey } = await import(
          '../src/features/prayer/constants/azan'
        );
        const [settings, loc, lang] = await Promise.all([
          loadPrayerSettings(),
          loadLocation(),
          loadLanguage(),
        ]);

        // Ensure custom azan channel exists on Android so remote push plays the right sound
        if (settings.playAzanSound && isAzanSoundKey(settings.selectedSound)) {
          ensurePrayerChannelForSound(settings.selectedSound).catch(() => {});
        }

        registerForPushNotifications({
          latitude: loc?.lat,
          longitude: loc?.lon,
          calculationMethod: settings.calculationMethod,
          asrMethod: settings.asrMethod,
          highLatitudeRule: settings.highLatitudeRule,
          prayerOffsets: settings.prayerOffsets,
          prayerNotify: settings.prayerNotify,
          notificationsEnabled: settings.notificationsEnabled,
          language: lang,
          selectedSound: settings.selectedSound,
          playAzanSound: settings.playAzanSound,
        }).catch(() => {});
      } catch {
        // Settings not yet available — will register on next open
      }
    });
  }, []);

  useEffect(() => {
    setAudioModeAsync(
      Platform.OS === 'ios'
        ? {
            playsInSilentMode: true,
            shouldPlayInBackground: true,
            interruptionMode: 'duckOthers',
            shouldRouteThroughEarpiece: false,
            allowsRecording: false,
          }
        : {
            shouldPlayInBackground: true,
            shouldRouteThroughEarpiece: false,
          }
    ).catch(() => {});
  }, []);

  useEffect(() => {
    type NotificationPayload = {
      title?: string | null;
      data?: { screen?: string; playAzan?: boolean | string; ramiKind?: string } | null;
    };
    const isPlayAzan = (d: { playAzan?: boolean | string } | undefined) => d?.playAzan === true || d?.playAzan === 'true';
    const isPrayerNotificationByTitle = (title: string | null | undefined) =>
      (title?.includes('Böneutrop') ?? false) || (title?.includes('time for') ?? false) || /حان وقت/.test(title ?? '');
    const shouldPlayAzan = (content: NotificationPayload) => {
      if (content.data?.ramiKind === 'alhamdulillah' || content.data?.ramiKind === 'salawat') return false;
      return (
        (content.data?.screen === '/' && isPlayAzan(content.data)) ||
        (Platform.OS === 'android' && !content.data && isPrayerNotificationByTitle(content.title))
      );
    };
    async function handleNotificationResponse(response: Notifications.NotificationResponse) {
      const content = response.notification.request.content;
      const data = content.data as { screen?: string; playAzan?: boolean | string } | undefined;
      if (data?.screen === '/' || (Platform.OS === 'android' && isPrayerNotificationByTitle(content.title))) {
        const onboardingDone = await isOnboardingDone();
        if (!onboardingDone) {
          // Never jump into tabs before onboarding is completed.
          router.replace('/onboarding');
          return;
        }
        if (shouldPlayAzan(content)) {
          const { loadPrayerSettings } = await import('../src/features/prayer/storage/prayerSettings');
          const s = await loadPrayerSettings();
          if (s?.playAzanSound) {
            const trigger = response.notification.request.trigger as { date?: Date | number } | undefined;
            const triggerDate = trigger?.date != null
              ? (typeof trigger.date === 'number' ? trigger.date : trigger.date.getTime())
              : undefined;
            setPendingPlayAzanFromNotification({ play: true, triggerDate });
          }
        }
        router.replace('/(tabs)');
      }
    }

    // When notification is received while app is in foreground: play adhan immediately (no tap needed)
    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const content = notification.request.content;
      if (shouldPlayAzan(content)) {
        import('../src/features/prayer/storage/prayerSettings').then(({ loadPrayerSettings }) =>
          loadPrayerSettings().then((s) => {
            if (s?.playAzanSound) {
              import('../src/features/prayer/utils/playAzan').then(({ playAzanSound }) =>
                playAzanSound(s.selectedSound as import('../src/features/prayer/utils/playAzan').SoundKey, s.respectSilentMode).catch(() => {})
              );
            }
          })
        );
      }
    });

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleNotificationResponse(response);
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, []);

  return (
    <ThemeProvider>
      <LanguageProvider>
        <AdminProvider>
          <QuranAudioProvider>
          <NavigationThemeProvider value={navTheme}>
            <StatusBar style="auto" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: 'transparent' },
                animation: 'fade',
              }}
            >
              <Stack.Screen name="index" options={{ contentStyle: { backgroundColor: 'transparent' } }} />
              <Stack.Screen name="onboarding" options={{ contentStyle: { backgroundColor: 'transparent' } }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' }, animation: 'none' }} />
              <Stack.Screen name="prayer-mode" options={{ gestureEnabled: false, contentStyle: { backgroundColor: 'transparent' } }} />
              <Stack.Screen name="names" options={{ contentStyle: { backgroundColor: 'transparent' } }} />
              <Stack.Screen name="tasbih" options={{ contentStyle: { backgroundColor: 'transparent' } }} />
              <Stack.Screen name="adkhar" options={{ contentStyle: { backgroundColor: 'transparent' } }} />
              <Stack.Screen name="hadith" options={{ contentStyle: { backgroundColor: 'transparent' } }} />
              <Stack.Screen name="quiz" options={{ contentStyle: { backgroundColor: 'transparent' } }} />
              <Stack.Screen name="support" options={{ contentStyle: { backgroundColor: 'transparent' } }} />
              <Stack.Screen name="location-picker" options={{ contentStyle: { backgroundColor: 'transparent' } }} />
              <Stack.Screen name="prayer-times" options={{ contentStyle: { backgroundColor: 'transparent' } }} />
              <Stack.Screen name="admin" options={{ contentStyle: { backgroundColor: 'transparent' } }} />
            </Stack>
            {downloadingUpdate && <UpdateOverlay />}
          </NavigationThemeProvider>
          </QuranAudioProvider>
        </AdminProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
