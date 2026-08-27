/**
 * Counts a few named events on the backend.
 *
 * Nothing identifying is sent — no device id, no token, no payload at all, just
 * a bump of a named counter. It can answer how many times something was pressed
 * and nothing about who pressed it.
 *
 * Every call is fire-and-forget: it never blocks the action it accompanies, and
 * a failure is swallowed. A counter is never worth making a user wait or see an
 * error for.
 */
const API_BASE_URL =
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) ||
  'https://adventurous-bravery-production.up.railway.app/api';

const REQUEST_TIMEOUT_MS = 5000;

function countEvent(name: string): void {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  void fetch(`${API_BASE_URL}/metrics/${name}/tap`, {
    method: 'POST',
    signal: controller.signal,
  })
    .catch(() => {
      /* A missed count is not worth surfacing. */
    })
    .finally(() => clearTimeout(timeout));
}

/** Someone pressed the support button. */
export function countGiftButtonTap(): void {
  countEvent('gift_button_tap');
}
