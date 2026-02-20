/**
 * Tabs layout: no visible tab bar. Navigation from Home via Quick Menu grid.
 * Dock provider kept so useDockVisibility() on other screens does not throw (showDock is no-op).
 * QuranAudioProvider moved to root layout so recitation continues when app is backgrounded.
 */
import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { DockVisibilityProvider } from '../../src/components/SacredDock';
import { PrayerNotificationRescheduler } from '../../src/features/prayer/components/PrayerNotificationRescheduler';

export default function TabsLayout() {
  return (
    <DockVisibilityProvider>
      <PrayerNotificationRescheduler />
      <View style={styles.container}>
        <Tabs
          sceneContainerStyle={[styles.transparent, styles.sceneFill]}
          screenOptions={{
            headerShown: false,
            tabBarStyle: styles.hiddenTabBar,
            tabBarShowLabel: false,
            tabBarButton: () => null,
            contentStyle: styles.transparent,
          }}
        >
          <Tabs.Screen name="index" options={{ title: 'Prayer' }} />
          <Tabs.Screen name="quran" options={{ title: 'Quran' }} />
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
