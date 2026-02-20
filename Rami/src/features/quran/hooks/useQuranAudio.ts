/**
 * Hook to play Quran recitation (single ayah or from an ayah through the surah).
 * Uses Al-Quran Cloud CDN verse-by-verse audio.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Platform } from 'react-native';
import { getAyahAudioUrl, getFullSurahAudioUrl } from '../utils/audio';
import { getResolvedAyahAudioUri } from '../utils/quranAudioCache';
import { SURAH_LIST } from '../data/surahs';
import {
  loadAudioPosition,
  saveAudioPosition,
  clearAudioPosition,
  loadSelectedReciter,
} from '../storage/quranStorage';

/** Reciters with poorly cut audio need more overlap to reduce gaps. */
const RECITERS_EXTRA_OVERLAP: Record<string, number> = {
  'ar.mahermuaiqly': 0.55,
  'everyayah.yasseraldossari': 0.55,
};
const DEFAULT_EARLY_ADVANCE = 0.4;

function getEarlyAdvanceSec(reciter: string): number {
  return RECITERS_EXTRA_OVERLAP[reciter] ?? DEFAULT_EARLY_ADVANCE;
}

export type QuranAudioState = {
  isPlaying: boolean;
  isPaused: boolean;
  currentSurah: number | null;
  currentAyah: number | null;
  error: string | null;
};

export function useQuranAudio() {
  const [state, setState] = useState<QuranAudioState>({
    isPlaying: false,
    isPaused: false,
    currentSurah: null,
    currentAyah: null,
    error: null,
  });

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
      const earlySec = getEarlyAdvanceSec(q.reciter);
      subscriptionRef.current = playerRef.current!.addListener('playbackStatusUpdate', (status) => {
        if (!status.isLoaded) return;
        const nearEnd =
          status.duration > 0.5 &&
          status.duration - status.currentTime <= earlySec;
        if (nearEnd || (status.didJustFinish && !status.playing)) {
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
    getResolvedAyahAudioUri(q.surah, nextAyah, q.reciter)
      .then((uri) => {
        if (!playerRef.current || queueRef.current?.fromAyah !== nextAyah) return;
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
        playerRef.current.replace({ uri });
        playerRef.current.play();
        startPreloadForNext(q.surah, nextAyah, q.ayahCount, q.reciter);
      })
      .catch(() => {
        const uri = getAyahAudioUrl(q.surah, nextAyah, q.reciter);
        if (playerRef.current && queueRef.current?.fromAyah === nextAyah) {
          playerRef.current.replace({ uri });
          playerRef.current.play();
          startPreloadForNext(q.surah, nextAyah, q.ayahCount, q.reciter);
        }
      });
  }, [cleanup, cleanupPreload, startPreloadForNext]);

  const setupPlayer = useCallback(
    (
      uri: string,
      onFinish: () => void,
      surahNumber: number,
      ayahNumber: number,
      earlyAdvanceSec: number | false = false
    ) => {
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
              shouldPlayInBackground: true,
              shouldRouteThroughEarpiece: false,
            }
      )
        .then(() => {
          const player = createAudioPlayer({ uri }, { updateInterval: 200 });
          playerRef.current = player;
          player.volume = 1.0;

          subscriptionRef.current = player.addListener('playbackStatusUpdate', (status) => {
            if (!status.isLoaded) return;
            const nearEnd =
              earlyAdvanceSec !== false &&
              status.duration > 0.5 &&
              status.duration - status.currentTime <= earlyAdvanceSec;
            if (nearEnd || (status.didJustFinish && !status.playing)) {
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

          player.play();
          setState((s) => ({ ...s, isPlaying: true, error: null }));
        })
        .catch((e) => {
          setState((s) => ({
            ...s,
            isPlaying: false,
            isPaused: false,
            currentSurah: null,
            currentAyah: null,
            error: e instanceof Error ? e.message : 'Kunde inte spela upp.',
          }));
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
        }, surahNumber, ayahInSurah);
      } catch (e) {
        const url = getAyahAudioUrl(surahNumber, ayahInSurah, reciter);
        setupPlayer(url, () => {
          queueRef.current = null;
          clearAudioPosition();
          setState((s) => ({ ...s, isPlaying: false, isPaused: false, currentSurah: null, currentAyah: null }));
          cleanup();
        }, surahNumber, ayahInSurah);
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
    setState((s) => ({ ...s, isPlaying: false, isPaused: false, currentSurah: null, currentAyah: null }));
    cleanup();
  }, [cleanup]);

  const playFromAyah = useCallback(
    async (surahNumber: number, ayahInSurah: number) => {
      const surah = SURAH_LIST.find((s) => s.number === surahNumber);
      if (!surah) return;

      const reciter = await loadSelectedReciter();
      const fullSurahUrl = ayahInSurah === 1 ? getFullSurahAudioUrl(surahNumber, reciter) : null;

      if (fullSurahUrl) {
        queueRef.current = null;
        setState((s) => ({
          ...s,
          currentSurah: surahNumber,
          currentAyah: 1,
        }));
        setupPlayer(fullSurahUrl, onFullSurahFinished, surahNumber, 1);
      } else {
        queueRef.current = {
          surah: surahNumber,
          fromAyah: ayahInSurah,
          ayahCount: surah.ayahCount,
          reciter,
        };
        setState((s) => ({
          ...s,
          currentSurah: surahNumber,
          currentAyah: ayahInSurah,
        }));
        getResolvedAyahAudioUri(surahNumber, ayahInSurah, reciter)
          .then((uri) => {
            if (queueRef.current?.fromAyah !== ayahInSurah) return;
            setupPlayer(uri, onVerseFinished, surahNumber, ayahInSurah, getEarlyAdvanceSec(reciter));
            startPreloadForNext(surahNumber, ayahInSurah, surah.ayahCount, reciter);
          })
          .catch(() => {
            const uri = getAyahAudioUrl(surahNumber, ayahInSurah, reciter);
            if (queueRef.current?.fromAyah === ayahInSurah) {
              setupPlayer(uri, onVerseFinished, surahNumber, ayahInSurah, getEarlyAdvanceSec(reciter));
              startPreloadForNext(surahNumber, ayahInSurah, surah.ayahCount, reciter);
            }
          });
      }
    },
    [setupPlayer, onVerseFinished, onFullSurahFinished, startPreloadForNext]
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
      playFromAyah(currentSurah, currentAyah);
    }
  }, [playFromAyah]);

  const stop = useCallback(() => {
    queueRef.current = null;
    clearAudioPosition();
    cleanup();
  }, [cleanup]);

  return { playAyah, playFromAyah, pause, resume, stop, state };
}
