/**
 * Hook to play Quran recitation (single ayah or from an ayah through the surah).
 * Uses Al-Quran Cloud CDN verse-by-verse audio.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
const _dbg = (_msg: string, _data?: object) => {};
import { Platform } from 'react-native';
import { getAyahAudioUrl, getFullSurahAudioUrls } from '../utils/audio';
import { getResolvedAyahAudioUri } from '../utils/quranAudioCache';
import { SURAH_LIST } from '../data/surahs';
import {
  loadAudioPosition,
  saveAudioPosition,
  clearAudioPosition,
  loadSelectedReciter,
} from '../storage/quranStorage';

/** Debug toggle: true = force CDN streaming URL instead of cache file. */
const FORCE_STREAMING_DEBUG = false;

/** Reciters with poorly cut audio need more overlap to reduce gaps. */
const RECITERS_EXTRA_OVERLAP: Record<string, number> = {
  'everyayah.yasseraldossari': 0.55,
};
/** Reciters som behöver längre paus mellan verser – vänta tills nästan slut. */
const RECITERS_LATE_ADVANCE: Record<string, number> = {};
const DEFAULT_EARLY_ADVANCE = 0.55;

/** Korta verser: begränsa early advance så vi inte klipper för mycket – minskar skrapigt ljud vid övergång. */
const SHORT_VERSE_THRESHOLD_SEC = 3;
const SHORT_VERSE_MAX_EARLY_ADVANCE = 0.35;

/** Reciters som läser för fort – lätt sänkt hastighet (1.0 = normal). */
const RECITERS_PLAYBACK_RATE: Record<string, number> = {
  'everyayah.yasseraldossari': 0.95,
};

function getEarlyAdvanceSec(reciter: string): number {
  return RECITERS_LATE_ADVANCE[reciter] ?? RECITERS_EXTRA_OVERLAP[reciter] ?? DEFAULT_EARLY_ADVANCE;
}

function getEffectiveEarlyAdvance(reciter: string, durationSec: number): number {
  const base = getEarlyAdvanceSec(reciter);
  if (durationSec < SHORT_VERSE_THRESHOLD_SEC) {
    return Math.min(base, SHORT_VERSE_MAX_EARLY_ADVANCE);
  }
  return base;
}

function getPlaybackRate(reciter: string): number {
  return RECITERS_PLAYBACK_RATE[reciter] ?? 1.0;
}

export type QuranAudioState = {
  isPlaying: boolean;
  isPaused: boolean;
  isPreparing: boolean;
  isFullSurahPlaying: boolean;
  currentSurah: number | null;
  currentAyah: number | null;
  error: string | null;
};

export type QuranAudioDebugInfo = {
  lastVerseStarted: { surah: number; ayah: number } | null;
  lastVerseStartedAt: number | null;
  lastVerseFinished: { surah: number; ayah: number; reason: string } | null;
  lastAdvance: { surah: number; ayah: number; mode: string } | null;
  queue: { surah: number; fromAyah: number; ayahCount: number } | null;
  verseFinishFired: string | null;
  replacePending: boolean;
  lastSkipReason: string | null;
  lastNearEndValues: { duration: number; currentTime: number; remaining: number; wouldFire: boolean } | null;
  eventLog: string[];
  eventCount: number;
  lastEventAt: number;
};

export function useQuranAudio() {
  const [state, setState] = useState<QuranAudioState>({
    isPlaying: false,
    isPaused: false,
    isPreparing: false,
    isFullSurahPlaying: false,
    currentSurah: null,
    currentAyah: null,
    error: null,
  });

  const [debugInfo, setDebugInfo] = useState<QuranAudioDebugInfo>({
    lastVerseStarted: null,
    lastVerseStartedAt: null,
    lastVerseFinished: null,
    lastAdvance: null,
    queue: null,
    verseFinishFired: null,
    replacePending: false,
    lastSkipReason: null,
    lastNearEndValues: null,
    eventLog: [],
    eventCount: 0,
    lastEventAt: 0,
  });
  const updateDebug = useCallback((updates: Partial<QuranAudioDebugInfo> & { event?: string }) => {
    const { event, ...rest } = updates;
    setDebugInfo((prev) => {
      const log = event
        ? [...prev.eventLog.slice(-9), `${new Date().toLocaleTimeString()} ${event}`]
        : prev.eventLog;
      return {
        ...prev,
        ...rest,
        eventLog: log,
        eventCount: prev.eventCount + 1,
        lastEventAt: Date.now(),
      };
    });
  }, []);

  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const preloadPlayerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const preloadForRef = useRef<{ surah: number; ayah: number } | null>(null);
  const subscriptionRef = useRef<{ remove: () => void } | null>(null);
  const queueRef = useRef<{
    surah: number;
    fromAyah: number;
    ayahCount: number;
    reciter: string;
  } | null>(null);
  const currentVerseRef = useRef<{ surah: number; ayah: number } | null>(null);
  const lastVerseStartedRef = useRef<string | null>(null);
  const verseFinishFiredRef = useRef<string | null>(null);
  /** Ignorera nearEnd tills nya versen faktiskt startat – undviker stale status från replace(). */
  const replacePendingRef = useRef(false);
  const replacePendingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastVerseStartedAtRef = useRef<number>(0);
  const lastSkipDebugAtRef = useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;
  const cleanupPreload = useCallback(() => {
    try {
      preloadPlayerRef.current?.pause();
      preloadPlayerRef.current?.remove();
    } catch {
      /* ignore */
    }
    preloadPlayerRef.current = null;
    preloadForRef.current = null;
  }, []);

  const cleanup = useCallback(() => {
    if (replacePendingTimeoutRef.current) {
      clearTimeout(replacePendingTimeoutRef.current);
      replacePendingTimeoutRef.current = null;
    }
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    cleanupPreload();
    try {
      playerRef.current?.clearLockScreenControls?.();
      playerRef.current?.pause();
      playerRef.current?.remove();
    } catch {
      /* ignore */
    }
    playerRef.current = null;
    queueRef.current = null;
    setState((s) => ({
      ...s,
      isPlaying: false,
      isPaused: false,
      currentSurah: null,
      currentAyah: null,
    }));
  }, []);

  useEffect(() => {
    loadAudioPosition().then((pos) => {
      if (pos) {
        setState((s) => ({
          ...s,
          isPaused: true,
          currentSurah: pos.surah,
          currentAyah: pos.ayah,
        }));
      }
    });
    return cleanup;
  }, [cleanup]);

  const startPreloadForNext = useCallback(
    async (surah: number, currentAyah: number, ayahCount: number, reciter: string) => {
      if (Platform.OS === 'android') {
        _dbg('preload skipped on android');
        return;
      }
      cleanupPreload();
      const nextAyah = currentAyah + 1;
      if (nextAyah > ayahCount) return;
      try {
        const uri = await getResolvedAyahAudioUri(surah, nextAyah, reciter);
        const preload = createAudioPlayer({ uri }, { updateInterval: 200, downloadFirst: true });
        preloadPlayerRef.current = preload;
        preloadForRef.current = { surah, ayah: nextAyah };
      } catch {
        /* ignore preload failure */
      }
    },
    [cleanupPreload]
  );

  const playNextInQueue = useCallback(() => {
    const q = queueRef.current;
    if (!q) return;

    const nextAyah = q.fromAyah + 1;
    if (nextAyah > q.ayahCount) {
      queueRef.current = null;
      cleanupPreload();
      clearAudioPosition();
      setState((s) => ({ ...s, isPlaying: false, isPaused: false, currentSurah: null, currentAyah: null }));
      cleanup();
      return;
    }

    const preload = preloadPlayerRef.current;
    const preloadFor = preloadForRef.current;
    const preloadReady =
      preload &&
      preloadFor &&
      preloadFor.surah === q.surah &&
      preloadFor.ayah === nextAyah &&
      preload.isLoaded;

    if (preloadReady) {
      _dbg('advanceToVerse (preload)', { surahNumber: q.surah, ayahNumber: nextAyah });
      replacePendingRef.current = true;
      updateDebug({
        lastAdvance: { surah: q.surah, ayah: nextAyah, mode: 'preload' },
        queue: { ...q, fromAyah: nextAyah },
        replacePending: true,
        event: `Advance→${q.surah}:${nextAyah} [preload]`,
      });
      currentVerseRef.current = { surah: q.surah, ayah: nextAyah };
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
      try {
        playerRef.current?.clearLockScreenControls?.();
        playerRef.current?.pause();
        playerRef.current?.remove();
      } catch {
        /* ignore */
      }
      playerRef.current = preload;
      preloadPlayerRef.current = null;
      preloadForRef.current = null;
      const rate = getPlaybackRate(q.reciter);
      if (rate !== 1.0) playerRef.current!.setPlaybackRate(rate);

      queueRef.current = { ...q, fromAyah: nextAyah };
      setState((s) => ({ ...s, currentAyah: nextAyah }));
      try {
        const surah = SURAH_LIST.find((s) => s.number === q.surah);
        const surahName = surah?.nameEn ?? `Surah ${q.surah}`;
        playerRef.current!.setActiveForLockScreen(true, {
          title: `${surahName} ${nextAyah}`,
          artist: 'Quran Recitation',
        });
      } catch {
        /* Lock screen not supported in Expo Go */
      }
      subscriptionRef.current = playerRef.current!.addListener('playbackStatusUpdate', (status) => {
        if (!status.isLoaded) return;
        const duration = status.duration ?? 0;
        const earlySec = getEffectiveEarlyAdvance(q.reciter, duration);
        const nearEnd =
          duration > 0.5 &&
          duration - (status.currentTime ?? 0) <= earlySec;
        if (nearEnd || (status.didJustFinish && !status.playing)) {
          const cur = currentVerseRef.current;
          const key = cur ? `${cur.surah}:${cur.ayah}` : null;
          if (key && verseFinishFiredRef.current === key) return;
          if (key) verseFinishFiredRef.current = key;
          onVerseFinishedRef.current();
        }
      });
      playerRef.current!.volume = 1.0;
      playerRef.current!.play();
      startPreloadForNext(q.surah, nextAyah, q.ayahCount, q.reciter);
      return;
    }

    if (!playerRef.current) return;
    queueRef.current = { ...q, fromAyah: nextAyah };
    setState((s) => ({ ...s, currentAyah: nextAyah }));

    const doReplace = (uri: string) => {
      if (!playerRef.current || queueRef.current?.fromAyah !== nextAyah) return;
      if (replacePendingTimeoutRef.current) {
        clearTimeout(replacePendingTimeoutRef.current);
        replacePendingTimeoutRef.current = null;
      }
      try {
        const surah = SURAH_LIST.find((s) => s.number === q.surah);
        const surahName = surah?.nameEn ?? `Surah ${q.surah}`;
        playerRef.current.updateLockScreenMetadata({
          title: `${surahName} ${nextAyah}`,
          artist: 'Quran Recitation',
        });
      } catch {
        /* Lock screen not supported in Expo Go */
      }
      _dbg('advanceToVerse (replace)', { surahNumber: q.surah, ayahNumber: nextAyah });
      replacePendingRef.current = true;
      replacePendingTimeoutRef.current = setTimeout(() => {
        replacePendingTimeoutRef.current = null;
        if (replacePendingRef.current) {
          _dbg('replacePending timeout – clearing', { surah: q.surah, ayah: nextAyah });
          replacePendingRef.current = false;
          updateDebug({ replacePending: false });
        }
      }, 5000);
      updateDebug({
        lastAdvance: { surah: q.surah, ayah: nextAyah, mode: 'replace' },
        queue: { ...q, fromAyah: nextAyah },
        replacePending: true,
        event: `Advance→${q.surah}:${nextAyah} [replace]`,
      });
      currentVerseRef.current = { surah: q.surah, ayah: nextAyah };
      try {
        playerRef.current.replace({ uri });
        const rate = getPlaybackRate(q.reciter);
        if (rate !== 1.0) playerRef.current.setPlaybackRate(rate);
        playerRef.current.play();
        startPreloadForNext(q.surah, nextAyah, q.ayahCount, q.reciter);
      } catch (e) {
        _dbg('replace/play failed', { err: String(e), surah: q.surah, ayah: nextAyah });
        replacePendingRef.current = false;
        if (replacePendingTimeoutRef.current) {
          clearTimeout(replacePendingTimeoutRef.current);
          replacePendingTimeoutRef.current = null;
        }
        queueRef.current = { ...q, fromAyah: q.fromAyah };
        currentVerseRef.current = { surah: q.surah, ayah: q.fromAyah };
        onVerseFinishedRef.current();
      }
    };

    const uriPromise = getResolvedAyahAudioUri(q.surah, nextAyah, q.reciter);
    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('uri_timeout')), 2500)
    );
    Promise.race([uriPromise, timeoutPromise])
      .then((uri) => doReplace(uri))
      .catch(() => {
        const uri = getAyahAudioUrl(q.surah, nextAyah, q.reciter);
        doReplace(uri);
      });
  }, [cleanup, cleanupPreload, startPreloadForNext, updateDebug]);

  const setupPlayer = useCallback(
    (
      uri: string,
      onFinish: () => void,
      surahNumber: number,
      ayahNumber: number,
      earlyAdvanceSec: number | false = false,
      reciter?: string,
      fallbackUri?: string | null
    ) => {
      _dbg('setupPlayer', { uri: uri?.slice?.(0, 100), surahNumber, ayahNumber });
      currentVerseRef.current = { surah: surahNumber, ayah: ayahNumber };
      subscriptionRef.current?.remove();
      if (playerRef.current) {
        try {
          playerRef.current.pause();
          playerRef.current.remove();
        } catch {
          /* ignore */
        }
      }

      setState((s) => ({ ...s, error: null }));

      setAudioModeAsync(
        Platform.OS === 'ios'
          ? {
              playsInSilentMode: true,
              shouldPlayInBackground: true,
              interruptionMode: 'duckOthers',
              shouldRouteThroughEarpiece: false,
              allowsRecording: false,
            }
          : {
              playsInSilentMode: true,
              shouldPlayInBackground: true,
              interruptionMode: 'duckOthers' as const,
              shouldRouteThroughEarpiece: false,
            }
      )
        .then(() => {
          _dbg('setAudioModeAsync ok, creating player');
          const player = createAudioPlayer({ uri }, { updateInterval: 200 });
          playerRef.current = player;
          player.volume = 1.0;
          const rate = reciter ? getPlaybackRate(reciter) : 1.0;
          if (rate !== 1.0) {
            player.setPlaybackRate(rate);
            _dbg('playbackRate set', { reciter, rate });
          }
          _dbg('createAudioPlayer done', { hasPlayer: !!player });

          let statusLogCount = 0;
          let playAfterLoadDone = false;
          let postPlayLogCount = 0;
          subscriptionRef.current = player.addListener('playbackStatusUpdate', (status) => {
            if (statusLogCount < 5) {
              const s = status as { isLoaded?: boolean; error?: string; duration?: number; playing?: boolean };
              _dbg('playbackStatusUpdate', { isLoaded: s.isLoaded, error: s.error, duration: s.duration, playing: s.playing, n: statusLogCount++ });
            }
            if (!status.isLoaded) return;
            if (!playAfterLoadDone) _dbg('isLoaded true (first time)');
            const playing = (status as { playing?: boolean }).playing;
            const didJustFinish = (status as { didJustFinish?: boolean }).didJustFinish;
            if (playing) {
              const cur = currentVerseRef.current;
              const surah = cur?.surah ?? surahNumber;
              const ayah = cur?.ayah ?? ayahNumber;
              const key = `${surah}:${ayah}`;
              if (lastVerseStartedRef.current !== key) {
                lastVerseStartedRef.current = key;
                replacePendingRef.current = false;
                if (replacePendingTimeoutRef.current) {
                  clearTimeout(replacePendingTimeoutRef.current);
                  replacePendingTimeoutRef.current = null;
                }
                lastVerseStartedAtRef.current = Date.now();
                _dbg('verseStarted', { surahNumber: surah, ayahNumber: ayah });
                updateDebug({
                  lastVerseStarted: { surah, ayah },
                  lastVerseStartedAt: Date.now(),
                  replacePending: false,
                  event: `Started ${surah}:${ayah}`,
                });
              }
            }
            if (postPlayLogCount < 5) {
              const s = status as { duration?: number; currentTime?: number };
              _dbg('postPlay status', { playing, duration: s.duration, currentTime: s.currentTime, n: postPlayLogCount++ });
            }
            if (!playAfterLoadDone && !playing && !didJustFinish) {
              playAfterLoadDone = true;
              try {
                player.play();
                _dbg('playAfterLoad: play() called');
              } catch {
                /* ignore */
              }
            }
            const duration = status.duration ?? 0;
            const currentTime = status.currentTime ?? 0;
            const remaining = duration - currentTime;
            const effectiveEarly =
              earlyAdvanceSec !== false && reciter
                ? getEffectiveEarlyAdvance(reciter, duration)
                : earlyAdvanceSec;
            const nearEnd =
              effectiveEarly !== false &&
              duration > 0.5 &&
              remaining <= (typeof effectiveEarly === 'number' ? effectiveEarly : 0);
            const wouldFire = nearEnd || (status.didJustFinish && !status.playing);
            const nearEndValues = { duration, currentTime, remaining, wouldFire };

            const secSinceStart = (Date.now() - lastVerseStartedAtRef.current) / 1000;
            const suspiciouslyFast = secSinceStart < 1 && currentTime > 2;
            if (suspiciouslyFast && wouldFire) {
              updateDebug({
                lastSkipReason: `staleTime: ${currentTime.toFixed(1)}s played in ${secSinceStart.toFixed(1)}s`,
                lastNearEndValues: nearEndValues,
              });
              return;
            }

            if (replacePendingRef.current) {
              const now = Date.now();
              if (now - lastSkipDebugAtRef.current > 500) {
                lastSkipDebugAtRef.current = now;
                updateDebug({
                  replacePending: true,
                  lastSkipReason: 'replacePending',
                  lastNearEndValues: nearEndValues,
                });
              }
              return;
            }
            if (wouldFire) {
              const cur = currentVerseRef.current;
              const surah = cur?.surah ?? surahNumber;
              const ayah = cur?.ayah ?? ayahNumber;
              const key = `${surah}:${ayah}`;
              if (verseFinishFiredRef.current === key) {
                const now = Date.now();
                if (now - lastSkipDebugAtRef.current > 500) {
                  lastSkipDebugAtRef.current = now;
                  updateDebug({
                    lastSkipReason: `alreadyFired:${key}`,
                    lastNearEndValues: nearEndValues,
                  });
                }
                return;
              }
              verseFinishFiredRef.current = key;
              const reason = nearEnd ? 'nearEnd' : 'didJustFinish';
              _dbg('verseFinished', { surahNumber: surah, ayahNumber: ayah, reason });
              updateDebug({
                lastVerseFinished: { surah, ayah, reason },
                verseFinishFired: key,
                lastSkipReason: null,
                lastNearEndValues: nearEndValues,
                event: `Finished ${surah}:${ayah} (${reason})`,
              });
              onFinish();
            }
          });

          try {
            const surah = SURAH_LIST.find((s) => s.number === surahNumber);
            const surahName = surah?.nameEn ?? `Surah ${surahNumber}`;
            player.setActiveForLockScreen(true, {
              title: `${surahName} ${ayahNumber}`,
              artist: 'Quran Recitation',
            });
          } catch {
            /* Lock screen not supported in Expo Go */
          }

          _dbg('skipping initial play(), will play when isLoaded');
          setState((s) => ({ ...s, isPlaying: true, isPreparing: false, error: null }));
        })
        .catch((e) => {
          _dbg('setupPlayer catch', { err: String(e), fallback: !!fallbackUri });
          if (fallbackUri) {
            setupPlayer(fallbackUri, onFinish, surahNumber, ayahNumber, earlyAdvanceSec, reciter, null);
          } else {
            setState((s) => ({
              ...s,
              isPlaying: false,
              isPaused: false,
              isPreparing: false,
              isFullSurahPlaying: false,
              currentSurah: null,
              currentAyah: null,
              error: e instanceof Error ? e.message : 'Kunde inte spela upp.',
            }));
          }
        });
    },
    []
  );

  const playAyah = useCallback(
    async (surahNumber: number, ayahInSurah: number) => {
      queueRef.current = null;
      const reciter = await loadSelectedReciter();
      setState((s) => ({
        ...s,
        isFullSurahPlaying: false,
        currentSurah: surahNumber,
        currentAyah: ayahInSurah,
      }));
      try {
        const uri = await getResolvedAyahAudioUri(surahNumber, ayahInSurah, reciter);
        setupPlayer(uri, () => {
          queueRef.current = null;
          clearAudioPosition();
          setState((s) => ({ ...s, isPlaying: false, isPaused: false, currentSurah: null, currentAyah: null }));
          cleanup();
        }, surahNumber, ayahInSurah, false, reciter);
      } catch (e) {
        const url = getAyahAudioUrl(surahNumber, ayahInSurah, reciter);
        setupPlayer(url, () => {
          queueRef.current = null;
          clearAudioPosition();
          setState((s) => ({ ...s, isPlaying: false, isPaused: false, currentSurah: null, currentAyah: null }));
          cleanup();
        }, surahNumber, ayahInSurah, false, reciter);
      }
    },
    [setupPlayer, cleanup]
  );

  const lastAdvanceRef = useRef(0);
  const onVerseFinishedRef = useRef<() => void>(() => {});
  const onVerseFinished = useCallback(() => {
    const now = Date.now();
    if (now - lastAdvanceRef.current < 150) return;
    lastAdvanceRef.current = now;
    playNextInQueue();
  }, [playNextInQueue]);
  onVerseFinishedRef.current = onVerseFinished;

  const onFullSurahFinished = useCallback(() => {
    queueRef.current = null;
    clearAudioPosition();
    setState((s) => ({ ...s, isPlaying: false, isPaused: false, isPreparing: false, isFullSurahPlaying: false, currentSurah: null, currentAyah: null }));
    cleanup();
  }, [cleanup]);

  const playFromAyah = useCallback(
    async (surahNumber: number, ayahInSurah: number) => {
      const surah = SURAH_LIST.find((s) => s.number === surahNumber);
      if (!surah) return;

      const reciter = await loadSelectedReciter();
      _dbg('playFromAyah', { reciter, surahNumber, ayahInSurah });
      const fullSurahUrls = ayahInSurah === 1 ? getFullSurahAudioUrls(surahNumber, reciter) : null;

      if (fullSurahUrls) {
        const [fullSurahUrl, fallbackUrl] = fullSurahUrls;
        queueRef.current = null;
        setState((s) => ({
          ...s,
          isPreparing: true,
          isFullSurahPlaying: true,
          currentSurah: surahNumber,
          currentAyah: 1,
        }));
        setupPlayer(fullSurahUrl, onFullSurahFinished, surahNumber, 1, false, reciter, fallbackUrl);
      } else {
        setState((s) => ({ ...s, error: 'fullSurahNotAvailable' }));
        return;
      }
    },
    [setupPlayer, onFullSurahFinished]
  );

  const pause = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    try {
      player.pause();
    } catch {
      /* ignore */
    }
    setState((s) => {
      if (s.currentSurah != null && s.currentAyah != null) {
        saveAudioPosition({ surah: s.currentSurah, ayah: s.currentAyah });
      }
      return { ...s, isPlaying: false, isPaused: true };
    });
  }, []);

  const resume = useCallback(() => {
    const player = playerRef.current;
    const { currentSurah, currentAyah } = stateRef.current;
    if (player) {
      try {
        player.play();
        setState((s) => ({ ...s, isPlaying: true, isPaused: false }));
      } catch {
        setState((s) => ({ ...s, error: 'Kunde inte återuppta.' }));
      }
    } else if (currentSurah != null && currentAyah != null) {
      playAyah(currentSurah, currentAyah);
    }
  }, [playAyah]);

  const stop = useCallback(() => {
    queueRef.current = null;
    clearAudioPosition();
    setState((s) => ({ ...s, isPlaying: false, isPaused: false, isPreparing: false, isFullSurahPlaying: false, currentSurah: null, currentAyah: null }));
    cleanup();
  }, [cleanup]);

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  return { playAyah, playFromAyah, pause, resume, stop, clearError, state, debugInfo };
}
