import { Stack } from 'expo-router';

export default function QiblaTabLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="map" />
    </Stack>
  );
}
