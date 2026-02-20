/**
 * Home tab: onboarding redirect + PrayerTimesScreen.
 */
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { PrayerSpaceScreen } from '../../src/features/prayer/screens/PrayerSpaceScreen';
import { isOnboardingDone } from '../../src/features/onboarding/storage';
import { useTheme } from '../../src/theme/ThemeContext';

export default function HomeTab() {
  const router = useRouter();
  const { colors } = useTheme();
  const [ready, setReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    isOnboardingDone().then((done) => {
      setShowOnboarding(!done);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (showOnboarding) {
      router.replace('/onboarding');
    }
  }, [ready, showOnboarding, router]);

  if (!ready || showOnboarding) {
    return (
      <View style={[styles.centered, styles.transparentBg]}>
        <ActivityIndicator size="large" color={colors.highlight} />
      </View>
    );
  }

  return <PrayerSpaceScreen />;
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  transparentBg: { backgroundColor: 'transparent' },
});
