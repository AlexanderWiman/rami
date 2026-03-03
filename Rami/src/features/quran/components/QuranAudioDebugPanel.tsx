/**
 * Debug panel for Quran audio playback – ta skärmdump när verser hoppar.
 * Visas i prod tills buggen är fixad.
 * Tryck på titeln för att förstora/minska.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import type { QuranAudioDebugInfo } from '../hooks/useQuranAudio';
import type { QuranAudioState } from '../hooks/useQuranAudio';

interface QuranAudioDebugPanelProps {
  state: QuranAudioState;
  debugInfo: QuranAudioDebugInfo;
}

export function QuranAudioDebugPanel({ state, debugInfo }: QuranAudioDebugPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const active = state.currentSurah != null && (state.isPlaying || state.isPaused);
  if (!active && debugInfo.eventCount === 0) return null;

  const fmt = (s: number | null, a: number | null) =>
    s != null && a != null ? `${s}:${a}` : '–';

  const logLines = expanded ? debugInfo.eventLog : debugInfo.eventLog.slice(-6);

  return (
    <View style={[styles.container, expanded && styles.containerExpanded]}>
      <TouchableOpacity
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.8}
        style={styles.titleRow}
      >
        <Text style={styles.title}>Quran Audio Debug</Text>
        <Text style={styles.expandHint}>{expanded ? '▼ minska' : '▲ förstora'}</Text>
      </TouchableOpacity>
      <Text style={styles.row}>
        <Text style={styles.label}>State: </Text>
        {state.isPlaying ? '▶ playing' : state.isPaused ? '⏸ paused' : '–'}
      </Text>
      <Text style={styles.row}>
        <Text style={styles.label}>Current: </Text>
        {fmt(state.currentSurah, state.currentAyah)}
      </Text>
      <Text style={styles.row}>
        <Text style={styles.label}>VerseStarted: </Text>
        {debugInfo.lastVerseStarted
          ? `${fmt(debugInfo.lastVerseStarted.surah, debugInfo.lastVerseStarted.ayah)}${debugInfo.lastVerseStartedAt ? ` @ ${new Date(debugInfo.lastVerseStartedAt).toLocaleTimeString()}` : ''}`
          : '–'}
      </Text>
      <Text style={styles.row}>
        <Text style={styles.label}>VerseFinished: </Text>
        {debugInfo.lastVerseFinished
          ? `${fmt(debugInfo.lastVerseFinished.surah, debugInfo.lastVerseFinished.ayah)} (${debugInfo.lastVerseFinished.reason})`
          : '–'}
      </Text>
      <Text style={styles.row}>
        <Text style={styles.label}>FinishFired: </Text>
        {debugInfo.verseFinishFired ?? '–'}
      </Text>
      <Text style={styles.row}>
        <Text style={styles.label}>ReplacePending: </Text>
        {debugInfo.replacePending ? '⚠ ja' : 'nej'}
      </Text>
      {debugInfo.lastSkipReason && (
        <Text style={[styles.row, styles.warning]}>
          <Text style={styles.label}>Skip: </Text>
          {debugInfo.lastSkipReason}
        </Text>
      )}
      {debugInfo.lastNearEndValues && (
        <Text style={styles.row}>
          <Text style={styles.label}>NearEnd: </Text>
          {`dur=${debugInfo.lastNearEndValues.duration.toFixed(1)} pos=${debugInfo.lastNearEndValues.currentTime.toFixed(1)} left=${debugInfo.lastNearEndValues.remaining.toFixed(1)} fire=${debugInfo.lastNearEndValues.wouldFire ? 'Y' : 'N'}`}
        </Text>
      )}
      <Text style={styles.row}>
        <Text style={styles.label}>LastAdvance: </Text>
        {debugInfo.lastAdvance
          ? `${fmt(debugInfo.lastAdvance.surah, debugInfo.lastAdvance.ayah)} [${debugInfo.lastAdvance.mode}]`
          : '–'}
      </Text>
      <Text style={styles.row}>
        <Text style={styles.label}>Queue: </Text>
        {debugInfo.queue
          ? `${debugInfo.queue.surah}:${debugInfo.queue.fromAyah}/${debugInfo.queue.ayahCount}`
          : '–'}
      </Text>
      <Text style={styles.row}>
        <Text style={styles.label}>Events: </Text>
        {debugInfo.eventCount} @ {new Date(debugInfo.lastEventAt).toLocaleTimeString()}
      </Text>
      {debugInfo.eventLog.length > 0 && (
        <View style={styles.logSection}>
          <Text style={styles.label}>
            Sekvens {expanded ? `(${debugInfo.eventLog.length} händelser)` : '(senaste)'}:
          </Text>
          {expanded ? (
            <ScrollView style={styles.logScroll} nestedScrollEnabled showsVerticalScrollIndicator>
              {logLines.map((line, i) => (
                <Text key={i} style={styles.logLine}>
                  {line}
                </Text>
              ))}
            </ScrollView>
          ) : (
            logLines.map((line, i) => (
              <Text key={i} style={styles.logLine}>
                {line}
              </Text>
            ))
          )}
        </View>
      )}
      {state.error ? (
        <Text style={[styles.row, styles.error]}>Error: {state.error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80,
    left: 12,
    right: 12,
    maxHeight: 220,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  containerExpanded: {
    bottom: 40,
    maxHeight: 420,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: '#aaa',
  },
  expandHint: {
    fontSize: 10,
    color: '#6a9',
  },
  row: {
    fontSize: 10,
    color: '#fff',
    marginBottom: 1,
  },
  label: {
    color: '#888',
  },
  logSection: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    paddingTop: 4,
  },
  logScroll: {
    maxHeight: 280,
  },
  logLine: {
    fontSize: 9,
    color: '#ccc',
    marginBottom: 1,
  },
  error: {
    color: '#f66',
  },
  warning: {
    color: '#fa8',
  },
});
