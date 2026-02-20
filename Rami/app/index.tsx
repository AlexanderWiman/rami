/**
 * Entry: redirect to onboarding or to (tabs). Tabs are the main app with bottom menu.
 */
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { isOnboardingDone } from '../src/features/onboarding/storage';
import { useTheme } from '../src/theme/ThemeContext';

export default function Index() {
  const router = useRouter();
  const { colors, pageBackground } = useTheme();
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
    } else {
      router.replace('/(tabs)');
    }
  }, [ready, showOnboarding, router]);

  return (
    <View style={[styles.centered, { backgroundColor: pageBackground }]}>
      <ActivityIndicator size="large" color={colors.highlight} />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
