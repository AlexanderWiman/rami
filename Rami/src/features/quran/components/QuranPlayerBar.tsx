/**
 * Recitation player for the mushaf, laid out like the printed-mushaf apps the
 * request pointed at: who is reciting on top, the position within the verse in
 * the middle, and the controls beneath.
 *
 * The scrubber is a plain measured track rather than a slider component — the
 * project has no slider dependency, and a track that reports where it was
 * touched is all a seek needs.
 */
import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { spacing, radius } from '../../../theme/spacing';
import { fontSize, fontWeight } from '../../../theme/typography';

/** mm:ss, with a dash until the player knows how long the verse is. */
function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

interface Props {
  /** Verse being recited, e.g. "Al-Fatihah 3" */
  title: string;
  /** Safe-area inset at the bottom, so the controls clear the system nav bar. */
  bottomInset: number;
  reciterName: string;
  isPlaying: boolean;
  isPreparing: boolean;
  position: number;
  duration: number;
  rate: number;
  repeatVerse: boolean;
  onTogglePlay: () => void;
  onStop: () => void;
  onSeek: (seconds: number) => void;
  onPressReciter: () => void;
  onCycleRate: () => void;
  onToggleRepeat: () => void;
}

export function QuranPlayerBar({
  title,
  bottomInset,
  reciterName,
  isPlaying,
  isPreparing,
  position,
  duration,
  rate,
  repeatVerse,
  onTogglePlay,
  onStop,
  onSeek,
  onPressReciter,
  onCycleRate,
  onToggleRepeat,
}: Props) {
  const { colors, style: themeStyle } = useTheme();
  const isRoyal = themeStyle === 'royal';
  const gold = isRoyal ? '#E6C27A' : colors.highlight;
  const textPrimary = isRoyal ? 'rgba(255,255,255,0.95)' : colors.text;
  const textMuted = isRoyal ? 'rgba(255,255,255,0.6)' : colors.textMuted;
  const trackBg = isRoyal ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)';

  const trackWidth = useRef(0);
  const [dragRatio, setDragRatio] = useState<number | null>(null);

  const handleTrackLayout = useCallback((event: LayoutChangeEvent) => {
    trackWidth.current = event.nativeEvent.layout.width;
  }, []);

  const ratioFromTouch = useCallback((event: GestureResponderEvent) => {
    if (trackWidth.current <= 0) return null;
    const x = event.nativeEvent.locationX;
    return Math.max(0, Math.min(1, x / trackWidth.current));
  }, []);

  const handleSeek = useCallback(
    (event: GestureResponderEvent) => {
      const ratio = ratioFromTouch(event);
      setDragRatio(null);
      if (ratio == null || duration <= 0) return;
      onSeek(ratio * duration);
    },
    [ratioFromTouch, duration, onSeek]
  );

  const playedRatio =
    dragRatio ?? (duration > 0 ? Math.max(0, Math.min(1, position / duration)) : 0);

  return (
    <View
      style={[
        styles.bar,
        {
          borderTopColor: colors.border,
          backgroundColor: isRoyal ? 'rgba(6,18,13,0.96)' : colors.surface,
          paddingBottom: spacing.sm + bottomInset,
        },
      ]}
    >
      <View style={styles.topRow}>
        <TouchableOpacity
          onPress={onPressReciter}
          style={styles.identity}
          accessibilityRole="button"
        >
          <Text style={[styles.title, { color: textPrimary }]} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.reciterRow}>
            <Ionicons name="mic-outline" size={12} color={textMuted} />
            <Text style={[styles.reciter, { color: textMuted }]} numberOfLines={1}>
              {reciterName}
            </Text>
            <Ionicons name="chevron-down" size={12} color={textMuted} />
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={onStop} style={styles.iconButton} accessibilityRole="button">
          <Ionicons name="close-circle-outline" size={26} color={textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.progressRow}>
        <Text style={[styles.time, { color: textMuted }]}>{formatTime(position)}</Text>
        <View
          style={styles.trackTouch}
          onLayout={handleTrackLayout}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderMove={(event) => setDragRatio(ratioFromTouch(event))}
          onResponderRelease={handleSeek}
          onResponderTerminate={() => setDragRatio(null)}
        >
          <View style={[styles.track, { backgroundColor: trackBg }]}>
            <View
              style={[styles.trackFill, { backgroundColor: gold, width: `${playedRatio * 100}%` }]}
            />
          </View>
          <View style={[styles.knob, { backgroundColor: gold, left: `${playedRatio * 100}%` }]} />
        </View>
        <Text style={[styles.time, { color: textMuted }]}>{formatTime(duration)}</Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          onPress={onToggleRepeat}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityState={{ selected: repeatVerse }}
        >
          <Ionicons name="repeat" size={24} color={repeatVerse ? gold : textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onTogglePlay}
          style={[styles.playButton, { borderColor: gold }]}
          accessibilityRole="button"
        >
          <Ionicons
            name={isPreparing ? 'hourglass-outline' : isPlaying ? 'pause' : 'play'}
            size={28}
            color={gold}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={onCycleRate} style={styles.iconButton} accessibilityRole="button">
          <Text style={[styles.rate, { color: rate === 1 ? textMuted : gold }]}>{rate}x</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  identity: { flex: 1, paddingVertical: spacing.xxs },
  title: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  reciterRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  reciter: { fontSize: fontSize.xs, maxWidth: '80%' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  time: { fontSize: fontSize.xs, minWidth: 36, textAlign: 'center' },
  trackTouch: { flex: 1, height: 28, justifyContent: 'center' },
  track: { height: 3, borderRadius: 2, overflow: 'hidden' },
  trackFill: { height: 3, borderRadius: 2 },
  knob: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: -5,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    marginTop: spacing.xxs,
  },
  iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rate: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
});
