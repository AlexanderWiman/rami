import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getPrayerName, getString, formatCountdownWithLocale } from '../../../constants/i18n';
import type { NextPrayerResult } from '../types';
import type { Language } from '../types';

interface NextPrayerCardProps {
  nextPrayer: NextPrayerResult | null;
  countdownSeconds: number | null;
  language: Language;
}

export function NextPrayerCard({ nextPrayer, countdownSeconds, language }: NextPrayerCardProps) {
  if (!nextPrayer) {
    return (
      <View style={styles.card}>
        <Text style={styles.label}>{getString(language, 'nextPrayer')}</Text>
        <Text style={styles.value}>{getString(language, 'noUpcomingPrayer')}</Text>
      </View>
    );
  }
  const displayName = getPrayerName(language, nextPrayer.prayer.name);
  const countdown = countdownSeconds != null ? formatCountdownWithLocale(language, countdownSeconds) : '--:--:--';
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{getString(language, 'nextPrayer')}</Text>
      <Text style={styles.prayerName}>{displayName}</Text>
      <Text style={styles.countdown}>{countdown}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a472a',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 12,
  },
  label: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  prayerName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#fff',
  },
  countdown: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginTop: 8,
    letterSpacing: 1,
  },
  value: {
    fontSize: 18,
    color: '#fff',
  },
});
