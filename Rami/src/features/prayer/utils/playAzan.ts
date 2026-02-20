import { Asset } from 'expo-asset';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Platform } from 'react-native';
import { AZAN_SOUND_KEYS } from '../constants/azan';

export type SoundKey = (typeof AZAN_SOUND_KEYS)[number];

const NOTIFICATION_DURATION_SEC = 30;

/** Bundled 30-sec notification sounds — require() for static resolution. Used for in-app playback (avoids Cloudinary/network issues on Android). */
const BUNDLED_NOTIFICATION_SOUNDS: Record<string, number> = {
  azan1: require('../../../../assets/sounds/azan1_notification.wav'),
  azan2: require('../../../../assets/sounds/azan2_notification.wav'),
  azan3: require('../../../../assets/sounds/azan3_notification.wav'),
  azan4: require('../../../../assets/sounds/azan4_notification.wav'),
  azan5: require('../../../../assets/sounds/azan5_notification.wav'),
  azan6: require('../../../../assets/sounds/azan6_notification.wav'),
  azan7: require('../../../../assets/sounds/azan7_notification.wav'),
  azan8: require('../../../../assets/sounds/azan8_notification.wav'),
};

/** Resolve local URI for bundled azan sound. Returns null if soundKey unknown. */
async function getBundledAzanUri(soundKey: string): Promise<string | null> {
  const moduleId = BUNDLED_NOTIFICATION_SOUNDS[soundKey];
  if (moduleId == null) return null;
  const asset = Asset.fromModule(moduleId);
  await asset.downloadAsync();
  return asset.localUri ?? asset.uri ?? null;
}
export type PlayAzanResult = { success: boolean; error?: string };

/** iOS forbids playsInSilentMode=false with interruptionMode 'duckOthers'. Use 'mixWithOthers' when respecting silent. */
function getInterruptionMode(respectSilentMode: boolean): 'duckOthers' | 'mixWithOthers' {
  return respectSilentMode ? 'mixWithOthers' : 'duckOthers';
}

/**
 * Plays the given azan sound from bundled assets (30-sec). Respects silent mode when passed.
 * Uses local files to avoid Cloudinary/network issues on Android.
 */
export async function playAzanSound(
  soundKey: SoundKey,
  respectSilentMode: boolean
): Promise<PlayAzanResult> {
  const uri = await getBundledAzanUri(soundKey);
  if (uri == null) {
    return {
      success: false,
      error: `Unknown azan sound: ${soundKey}`,
    };
  }
  try {
    await setAudioModeAsync(
      Platform.OS === 'ios'
        ? {
            playsInSilentMode: !respectSilentMode,
            shouldPlayInBackground: !respectSilentMode, // iOS forbids background when not playing in silent
            interruptionMode: getInterruptionMode(respectSilentMode),
            shouldRouteThroughEarpiece: false,
            allowsRecording: false,
          }
        : {
            playsInSilentMode: !respectSilentMode,
            shouldPlayInBackground: true,
            interruptionMode: respectSilentMode ? 'mixWithOthers' : 'duckOthers',
            shouldRouteThroughEarpiece: false,
          }
    );
    const player = createAudioPlayer({ uri }, { updateInterval: 200 });
    player.volume = 1.0;

    return new Promise((resolve) => {
      let settled = false;
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      let subscription: { remove: () => void } | undefined;

      const finish = () => {
        if (settled) return;
        settled = true;
        if (timeoutId != null) clearTimeout(timeoutId);
        subscription?.remove();
        try {
          player.remove();
        } catch {
          /* ignore */
        }
        resolve({ success: true });
      };

      subscription = player.addListener('playbackStatusUpdate', (status) => {
        if (status.isLoaded && status.didJustFinish && !status.playing) {
          finish();
        }
      });

      player.play();

      // Fallback: resolve after 2 min max and release player
      timeoutId = setTimeout(finish, 120000);
    });
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Playback failed',
    };
  }
}

export async function playAzanSoundControlled(
  soundKey: SoundKey,
  respectSilentMode: boolean
): Promise<{ stop: () => void; done: Promise<PlayAzanResult> }> {
  const uri = await getBundledAzanUri(soundKey);
  if (uri == null) {
    return {
      stop: () => undefined,
      done: Promise.resolve({
        success: false,
        error: `Unknown azan sound: ${soundKey}`,
      }),
    };
  }

  let resolveDone: (value: PlayAzanResult) => void = () => undefined;
  const done = new Promise<PlayAzanResult>((resolve) => {
    resolveDone = resolve;
  });

  let settled = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let subscription: { remove: () => void } | undefined;
  let player: ReturnType<typeof createAudioPlayer> | undefined;

  const finish = (result: PlayAzanResult = { success: true }) => {
    if (settled) return;
    settled = true;
    if (timeoutId != null) clearTimeout(timeoutId);
    subscription?.remove();
    try {
      player?.pause();
      try {
        player?.seekTo(0);
      } catch {
        /* ignore */
      }
      player?.remove();
    } catch {
      /* ignore */
    }
    resolveDone(result);
  };

  try {
    await setAudioModeAsync(
      Platform.OS === 'ios'
        ? {
            playsInSilentMode: !respectSilentMode,
            shouldPlayInBackground: !respectSilentMode, // iOS forbids background when not playing in silent
            interruptionMode: getInterruptionMode(respectSilentMode),
            shouldRouteThroughEarpiece: false,
            allowsRecording: false,
          }
        : {
            playsInSilentMode: !respectSilentMode,
            shouldPlayInBackground: true,
            interruptionMode: respectSilentMode ? 'mixWithOthers' : 'duckOthers',
            shouldRouteThroughEarpiece: false,
          }
    );
    player = createAudioPlayer({ uri }, { updateInterval: 200 });
    player.volume = 1.0;

    subscription = player.addListener('playbackStatusUpdate', (status) => {
      if (status.isLoaded && status.didJustFinish && !status.playing) {
        finish();
      }
    });

    player.play();

    // Fallback: resolve after 2 min max and release player
    timeoutId = setTimeout(() => finish(), 120000);
  } catch (e) {
    finish({ success: false, error: e instanceof Error ? e.message : 'Playback failed' });
  }

  return {
    stop: () => finish(),
    done,
  };
}

export function isSoundAvailable(key: SoundKey): boolean {
  return key in BUNDLED_NOTIFICATION_SOUNDS;
}

/**
 * Plays the remainder of the 30-sec bundled notification sound when user opens app mid-playback.
 * Seeks to elapsed position and plays for (30 - elapsed) seconds.
 */
export async function playBundledAzanRemainder(
  soundKey: SoundKey,
  triggerDateMs: number,
  respectSilentMode: boolean
): Promise<PlayAzanResult> {
  const uri = await getBundledAzanUri(soundKey);
  if (!uri) {
    return { success: false, error: `No bundled sound for ${soundKey}` };
  }

  const elapsedSec = Math.max(0, (Date.now() - triggerDateMs) / 1000);
  if (elapsedSec >= NOTIFICATION_DURATION_SEC) {
    return { success: true }; // Already finished, nothing to play
  }

  const startSec = Math.min(elapsedSec, NOTIFICATION_DURATION_SEC - 1);
  const durationSec = NOTIFICATION_DURATION_SEC - startSec;

  try {
    await setAudioModeAsync(
      Platform.OS === 'ios'
        ? {
            playsInSilentMode: !respectSilentMode,
            shouldPlayInBackground: !respectSilentMode,
            interruptionMode: getInterruptionMode(respectSilentMode),
            shouldRouteThroughEarpiece: false,
            allowsRecording: false,
          }
        : {
            playsInSilentMode: !respectSilentMode,
            shouldPlayInBackground: true,
            interruptionMode: respectSilentMode ? 'mixWithOthers' : 'duckOthers',
            shouldRouteThroughEarpiece: false,
          }
    );
    const player = createAudioPlayer({ uri }, { updateInterval: 200 });
    player.volume = 1.0;

    return new Promise((resolve) => {
      let settled = false;
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const subscription = player.addListener('playbackStatusUpdate', (status) => {
        if (status.isLoaded && status.didJustFinish && !status.playing) {
          if (!settled) {
            settled = true;
            if (timeoutId != null) clearTimeout(timeoutId);
            subscription.remove();
            try {
              player.remove();
            } catch {}
            resolve({ success: true });
          }
        }
      });

      player.seekTo(startSec);
      player.play();

      timeoutId = setTimeout(() => {
        if (!settled) {
          settled = true;
          subscription.remove();
          try {
            player.remove();
          } catch {}
          resolve({ success: true });
        }
      }, (durationSec + 1) * 1000);
    });
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Playback failed',
    };
  }
}
