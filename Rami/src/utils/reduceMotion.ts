/**
 * UX 2.0: Respect Reduce Motion. When true, disable continuous animations (breathing, pulse).
 * __DEV__: set DEV_SKIP_ANIMATIONS true to disable animations in dev.
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

const DEV_SKIP_ANIMATIONS = false;

export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => sub.remove();
  }, []);

  return reduce;
}

/** If true, skip decorative/continuous animations. Pass from useReduceMotion + __DEV__ check. */
export function shouldSkipContinuousAnimations(reduceMotion: boolean): boolean {
  return reduceMotion || (typeof __DEV__ !== 'undefined' && __DEV__ && DEV_SKIP_ANIMATIONS);
}
