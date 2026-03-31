/**
 * Vertical stack of prayer time pills. Active glows, past fades.
 * UX 2.0: currentPrayerName => isNow on pill for ceremonial "Now" styling.
 */
import React, { memo } from 'react';
import { View, Platform } from 'react-native';
import { spacing } from '../theme/spacing';
import { TimePill } from './TimePill';
import type { PrayerTime } from '../features/prayer/types';
import { getPrayerName, getString, formatTimeWithLocale } from '../constants/i18n';
import type { Language } from '../features/prayer/types';

type TimePillStackProps = {
  times: PrayerTime[];
  sunrise?: Date | null;
  nextPrayerName: string | null;
  currentPrayerName: string | null;
  language: Language;
  use12h?: boolean;
  onLongPressPill?: (prayer: PrayerTime) => void;
};

export const TimePillStack = memo(function TimePillStack({
  times,
  sunrise,
  nextPrayerName,
  currentPrayerName,
  language,
  use12h = false,
  onLongPressPill,
}: TimePillStackProps) {
  const sorted = [...times].sort((a, b) => a.time.getTime() - b.time.getTime());
  const now = Date.now();

  const items: { key: string; label: string; time: Date; isPast: boolean; isActive: boolean; isNow: boolean; prayer?: PrayerTime }[] = [];
  for (const p of sorted) {
    items.push({
      key: p.name,
      label: getPrayerName(language, p.name),
      time: p.time,
      isPast: p.time.getTime() < now,
      isActive: false,
      isNow: currentPrayerName === p.name,
      prayer: p,
    });
    if (p.name === 'Fajr' && sunrise) {
      items.push({
        key: 'shuruq',
        label: getString(language, 'shuruq'),
        time: sunrise,
        isPast: sunrise.getTime() < now,
        isActive: false,
        isNow: false,
      });
    }
  }

  const stackMarginTop = Platform.OS === 'android' ? spacing.sm : spacing.md;
  const nowLabel = getString(language, 'now');
  return (
    <View style={{ marginTop: stackMarginTop }}>
      {items.map((item) => (
        <TimePill
          key={item.key}
          prayer={item.prayer ?? { name: 'Fajr', time: item.time, dateKey: '' }}
          label={item.label}
          time={formatTimeWithLocale(language, item.time, use12h)}
          isActive={item.isActive}
          isPast={item.isPast}
          isNow={item.isNow}
          nowLabel={nowLabel}
          onLongPress={item.prayer ? onLongPressPill : undefined}
        />
      ))}
    </View>
  );
});
