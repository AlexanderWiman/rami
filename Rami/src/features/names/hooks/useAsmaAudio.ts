/**
 * Hook to play 99 Names of Allah (Asma ul Husna) audio.
 * Uses IslamicAPI CDN for Arabic recitation (only language with audio available).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Platform } from 'react-native';
import { getAsmaAudioUrl } from '../../../constants/asmaUlHusna';
import { ASMA_UL_HUSNA } from '../../../constants/asmaUlHusna';

export type AsmaAudioState = {
  isPlaying: boolean;
  isPaused: boolean;
  currentId: number | null;
  error: string | null;
  isLoading: boolean;
};

export function useAsmaAudio() {
  const [state, setState] = useState<AsmaAudioState>({
    isPlaying: false,
    isPaused: false,
    currentId: null,
    error: null,
    isLoading: false,
  });

  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const subscriptionRef = useRef<{ remove: () => void } | null>(null);
  const queueRef = useRef<{ fromId: number } | null>(null);
  const stateRef = useRef(state);
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  stateRef.current = state;

  const cleanup = useCallback(() => {
    if (advanceTimeoutRef.current) {
      clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
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
      currentId: null,
      isLoading: false,
    }));
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const getUrl = useCallback((_nameId: number, audioFilename: string) => getAsmaAudioUrl(audioFilename), []);

  /** didJustFinish fires twice per track. Block duplicate within 150ms. */
  const lastAdvanceRef = useRef(0);

  const playNextInQueue = useCallback(() => {
    const now = Date.now();
    if (now - lastAdvanceRef.current < 150) return;
    lastAdvanceRef.current = now;

    const q = queueRef.current;
    if (!q) return;
    if (advanceTimeoutRef.current) {
      clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }

    const currentIndex = ASMA_UL_HUSNA.findIndex((n) => n.id === q.fromId);
    const nextIndex = currentIndex + 1;
    if (nextIndex >= ASMA_UL_HUSNA.length) {
      queueRef.current = null;
      setState((s) => ({ ...s, isPlaying: false, isPaused: false, currentId: null, isLoading: false }));
      cleanup();
      return;
    }

    const next = ASMA_UL_HUSNA[nextIndex]!;
    queueRef.current = { fromId: next.id };
    setState((s) => ({ ...s, currentId: next.id }));

    const uri = getUrl(next.id, next.audio);
    setupPlayer(uri, () => playNextInQueue(), next.id, next.transliteration);
  }, [cleanup, setupPlayer, getUrl]);

  const setupPlayer = useCallback(
    (uri: string, onFinish: () => void, nameId: number, transliteration: string, clearLoadTimeout?: () => void, retryCount = 0) => {
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
            const playing = (status as { playing?: boolean }).playing;
            if (queueRef.current && status.isLoaded && !playing && !stateRef.current.isPaused) {
              try {
                playerRef.current?.play();
              } catch {
                /* ignore */
              }
            }
            const dur = (status as { duration?: number }).duration ?? 0;
            const pos = (status as { currentTime?: number }).currentTime ?? 0;
            const nearEnd = dur > 0.5 && dur - pos <= 0.5;
            if (nearEnd || (status.didJustFinish && !status.playing)) {
              if (advanceTimeoutRef.current) {
                clearTimeout(advanceTimeoutRef.current);
                advanceTimeoutRef.current = null;
              }
              onFinish();
              return;
            }
            if (dur > 0.5 && !advanceTimeoutRef.current) {
              advanceTimeoutRef.current = setTimeout(() => {
                advanceTimeoutRef.current = null;
                onFinish();
              }, Math.ceil(dur) * 1000 + 500);
            }
          });

          try {
            player.setActiveForLockScreen?.(true, {
              title: transliteration,
              artist: '99 Names of Allah',
            });
          } catch {
            /* Lock screen not supported in Expo Go */
          }

          player.play();
          clearLoadTimeout?.();
          setState((s) => ({ ...s, isPlaying: true, error: null, isLoading: false }));
        })
        .catch((e) => {
          const msg = e instanceof Error ? e.message : String(e);
          __DEV__ && console.warn('[AsmaAudio] Load failed:', uri, msg);
          if (retryCount < 1) {
            setTimeout(() => setupPlayer(uri, onFinish, nameId, transliteration, clearLoadTimeout, retryCount + 1), 1500);
            return;
          }
          clearLoadTimeout?.();
          setState((s) => ({
            ...s,
            isPlaying: false,
            isPaused: false,
            currentId: null,
            isLoading: false,
            error: msg || 'Kunde inte spela upp.',
          }));
        });
    },
    []
  );

  const playName = useCallback(
    (nameId: number) => {
      const name = ASMA_UL_HUSNA.find((n) => n.id === nameId);
      if (!name) return;

      queueRef.current = null;
      const uri = getUrl(nameId, name.audio);
      setState((s) => ({ ...s, currentId: nameId }));

      setupPlayer(
        uri,
        () => {
          queueRef.current = null;
          setState((s) => ({ ...s, isPlaying: false, isPaused: false, currentId: null }));
          cleanup();
        },
        nameId,
        name.transliteration
      );
    },
    [setupPlayer, cleanup, getUrl]
  );

  const playFromName = useCallback(
    (nameId: number) => {
      const name = ASMA_UL_HUSNA.find((n) => n.id === nameId);
      if (!name) return;

      queueRef.current = { fromId: nameId };
      const uri = getUrl(nameId, name.audio);
      setState((s) => ({ ...s, currentId: nameId, error: null, isLoading: true }));

      const timeoutId = setTimeout(() => {
        setState((s) => {
          if (s.isLoading && s.currentId === nameId) {
            return { ...s, isLoading: false, error: 'Laddning tog för lång tid.' };
          }
          return s;
        });
      }, 15000);

      const clearLoadTimeout = () => clearTimeout(timeoutId);
      setupPlayer(
        uri,
        () => playNextInQueue(),
        nameId,
        name.transliteration,
        clearLoadTimeout
      );
    },
    [setupPlayer, playNextInQueue, getUrl]
  );

  const pause = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    try {
      player.pause();
    } catch {
      /* ignore */
    }
    setState((s) => ({ ...s, isPlaying: false, isPaused: true }));
  }, []);

  const resume = useCallback(() => {
    const player = playerRef.current;
    const { currentId } = stateRef.current;
    if (player) {
      try {
        player.play();
        setState((s) => ({ ...s, isPlaying: true, isPaused: false }));
      } catch {
        setState((s) => ({ ...s, error: 'Kunde inte återuppta.' }));
      }
    } else if (currentId != null) {
      playFromName(currentId);
    }
  }, [playFromName]);

  const stop = useCallback(() => {
    queueRef.current = null;
    cleanup();
  }, [cleanup]);

  return { playName, playFromName, pause, resume, stop, state };
}
