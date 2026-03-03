import { Stack } from 'expo-router';

export default function BukhariTabLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[book]" />
      <Stack.Screen name="[book]/[chapter]" />
    </Stack>
  );
}
