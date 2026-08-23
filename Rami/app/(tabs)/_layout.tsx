/**
 * Tabs layout: no visible tab bar. Navigation from Home via Quick Menu grid.
 * Dock provider kept so useDockVisibility() on other screens does not throw (showDock is no-op).
 * QuranAudioProvider moved to root layout so recitation continues when app is backgrounded.
 */
import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import Constants from 'expo-constants';
import { DockVisibilityProvider } from '../../src/components/SacredDock';

let PrayerNotificationRescheduler: (() => React.JSX.Element) | null = null;
if (Constants.appOwnership !== 'expo') {
  try {
    PrayerNotificationRescheduler = require('../../src/features/prayer/components/PrayerNotificationRescheduler').PrayerNotificationRescheduler;
  } catch {
    PrayerNotificationRescheduler = null;
  }
}

export default function TabsLayout() {
  return (
    <DockVisibilityProvider>
      {PrayerNotificationRescheduler ? <PrayerNotificationRescheduler /> : null}
      <View style={styles.container}>
        <Tabs
          screenOptions={{
            headerShown: false,
            sceneStyle: [styles.transparent, styles.sceneFill],
            tabBarStyle: styles.hiddenTabBar,
            tabBarShowLabel: false,
            tabBarButton: () => null,
          }}
        >
          <Tabs.Screen name="index" options={{ title: 'Prayer' }} />
          <Tabs.Screen name="quran" options={{ title: 'Quran' }} />
          <Tabs.Screen name="bukhari" options={{ title: 'Bukhari' }} />
          <Tabs.Screen name="qibla" options={{ title: 'Qibla' }} />
          <Tabs.Screen name="qa" options={{ title: 'Sources' }} />
          <Tabs.Screen name="forum" options={{ title: 'Forum' }} />
          <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
        </Tabs>
      </View>
    </DockVisibilityProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  transparent: { backgroundColor: 'transparent' },
  sceneFill: { flex: 1 },
  hiddenTabBar: {
    position: 'absolute',
    height: 0,
    opacity: 0,
    borderTopWidth: 0,
    elevation: 0,
    backgroundColor: 'transparent',
  },
});
