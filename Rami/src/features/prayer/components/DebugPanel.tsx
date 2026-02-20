/**
 * Debug panel: __DEV__ only. Shows offset-adjusted times and "Reschedule notifications now".
 * TODO(iOS/Android): document platform limits (notification sound, compass, etc.) in UI.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import type { PrayerTimesForDay } from '../types';
import { formatTime } from '../utils/nextPrayer';

interface DebugPanelProps {
  today: PrayerTimesForDay | null;
  onReschedule: () => void;
}

export function DebugPanel({ today, onReschedule }: DebugPanelProps) {
  if (__DEV__ === false) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Debug (dev only)</Text>
      <Text style={styles.subtitle}>Offset-adjusted times</Text>
      {today?.times
        .slice()
        .sort((a, b) => a.time.getTime() - b.time.getTime())
        .map((p) => (
          <Text key={p.name} style={styles.row}>
            {p.name}: {formatTime(p.time)}
          </Text>
        ))}
      <TouchableOpacity style={styles.btn} onPress={onReschedule}>
        <Text style={styles.btnText}>Reschedule notifications now</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  title: { fontSize: 12, fontWeight: '700', color: '#555', marginBottom: 8 },
  subtitle: { fontSize: 11, color: '#666', marginBottom: 6 },
  row: { fontSize: 11, color: '#333', marginBottom: 2 },
  btn: { marginTop: 12, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#1a472a', borderRadius: 6, alignSelf: 'flex-start' },
  btnText: { fontSize: 12, fontWeight: '600', color: '#fff' },
});
