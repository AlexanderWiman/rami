import 'expo-asset';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider as NavigationThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Platform } from 'react-native';
import { setAudioModeAsync } from 'expo-audio';
import { ensureAndroidNotificationChannels } from '../src/features/prayer/notifications/channels';
import { setPendingPlayAzanFromNotification } from '../src/features/prayer/notificationResponse';
import { isOnboardingDone } from '../src/features/onboarding/storage';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import { AdminProvider } from '../src/features/admin/AdminContext';
import { QuranAudioProvider } from '../src/features/quran/context/QuranAudioContext';

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

  useEffect(() => {
    ensureAndroidNotificationChannels().catch(() => {});
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
      data?: { screen?: string; playAzan?: boolean | string } | null;
    };
    const isPlayAzan = (d: { playAzan?: boolean | string } | undefined) => d?.playAzan === true || d?.playAzan === 'true';
    const isPrayerNotificationByTitle = (title: string | null | undefined) =>
      (title?.includes('Böneutrop') ?? false) || (title?.includes('time for') ?? false) || /حان وقت/.test(title ?? '');
    const shouldPlayAzan = (content: NotificationPayload) =>
      (content.data?.screen === '/' && isPlayAzan(content.data)) ||
      (Platform.OS === 'android' && !content.data && isPrayerNotificationByTitle(content.title));
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
              <Stack.Screen name="location-picker" options={{ contentStyle: { backgroundColor: 'transparent' } }} />
              <Stack.Screen name="prayer-times" options={{ contentStyle: { backgroundColor: 'transparent' } }} />
              <Stack.Screen name="admin" options={{ contentStyle: { backgroundColor: 'transparent' } }} />
            </Stack>
          </NavigationThemeProvider>
          </QuranAudioProvider>
        </AdminProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
