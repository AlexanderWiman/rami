/**
 * Hadith section navigator.
 *
 * The root stack declares a single screen named "hadith", so this directory
 * needs its own Stack for that name to resolve: without it the routes here
 * become siblings in the root stack, which the root's explicit screen list
 * does not know about, and pushing to one of them fails at runtime.
 */
import { Stack } from 'expo-router';

export default function HadithLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
      }}
    />
  );
}
