/**
 * Applies a pending OTA update on the launch that finds it.
 *
 * expo-updates downloads in the background and activates on the *next* launch,
 * which is why an update has needed the app to be started, closed and started
 * again. Here the launch waits a short budget for the check and download, and
 * reloads straight into the new version when both finish in time.
 *
 * The budget is the whole point: if the network is slow the launch must not be
 * held hostage, so we give up and let expo-updates activate it on the next
 * start exactly as before. The behaviour is therefore never worse than the
 * default — only sooner when it can be.
 */
import * as Updates from 'expo-updates';

/**
 * How long a cold start may spend on updating. Past this the user gets the
 * version already on the device, and the download continues on its own.
 */
const UPDATE_BUDGET_MS = 4000;

function withDeadline<T>(work: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    work,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

/**
 * Checks for an update and reloads into it when one arrives inside the budget.
 * Resolves quietly in every other case — a failed check must never block launch.
 *
 * `onDownloadStart` fires only once an update is known to exist, so the notice
 * shown to the user appears for a real download rather than flashing up on
 * every launch while the check comes back empty.
 */
export async function applyPendingUpdateOnLaunch(onDownloadStart?: () => void): Promise<void> {
  // Disabled in Expo Go and in development builds, where there is nothing to fetch.
  if (__DEV__ || !Updates.isEnabled) return;

  const startedAt = Date.now();
  try {
    const check = await withDeadline(Updates.checkForUpdateAsync(), UPDATE_BUDGET_MS);
    if (!check?.isAvailable) return;

    const remaining = UPDATE_BUDGET_MS - (Date.now() - startedAt);
    if (remaining <= 0) return;

    onDownloadStart?.();
    const fetched = await withDeadline(Updates.fetchUpdateAsync(), remaining);
    if (!fetched?.isNew) return;

    await Updates.reloadAsync();
  } catch {
    /* Keep running the version already on the device. */
  }
}
