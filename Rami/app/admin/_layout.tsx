import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="admins" />
      <Stack.Screen name="thread/new" />
      <Stack.Screen name="thread/[id]" />
      <Stack.Screen name="sources/index" />
    </Stack>
  );
}
