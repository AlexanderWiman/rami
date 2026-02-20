/**
 * Listens to AppState and reschedules prayer notifications when app returns to foreground.
 * Mitigates Samsung/Android battery optimization that can clear scheduled alarms.
 */
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { reschedulePrayerNotificationsFromStorage } from '../hooks/usePrayerTimes';

export function PrayerNotificationRescheduler() {
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        reschedulePrayerNotificationsFromStorage();
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, []);

  return null;
}
