/**
 * When user taps a prayer notification with playAzan=true, we set this so
 * the home screen can play azan on mount. If triggerDate is provided and
 * the 30-sec notification sound was playing, we continue from that position.
 */
export interface PendingAzanFromNotification {
  play: boolean;
  /** Notification trigger timestamp (ms) — used to continue from position if user opened mid-playback */
  triggerDate?: number;
}

let pending: PendingAzanFromNotification = { play: false };

export function setPendingPlayAzanFromNotification(value: boolean | PendingAzanFromNotification): void {
  pending = typeof value === 'boolean' ? { play: value } : value;
}

export function consumePendingPlayAzanFromNotification(): PendingAzanFromNotification {
  const v = { ...pending };
  pending = { play: false };
  return v;
}
