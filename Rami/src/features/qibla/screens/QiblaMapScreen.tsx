/**
 * Web fallback: react-native-maps is native-only. On web we show a placeholder.
 * Native implementation is in QiblaMapScreen.native.tsx.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '../../../components/ScreenWrapper';

export function QiblaMapScreen() {
  const router = useRouter();
  return (
    <ScreenWrapper>
      <View style={styles.centered}>
        <Text style={styles.message}>Qibla-kartan finns i appen på din telefon.</Text>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  message: { fontSize: 16, color: '#555', textAlign: 'center' },
});
