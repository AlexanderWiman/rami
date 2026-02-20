/**
 * Quran audio context — keeps playback state when navigating away.
 * Enables pause/resume so user doesn't have to start from beginning.
 */
import React, { createContext, useContext } from 'react';
import { useQuranAudio } from '../hooks/useQuranAudio';
type QuranAudioContextValue = ReturnType<typeof useQuranAudio>;

const QuranAudioContext = createContext<QuranAudioContextValue | null>(null);

export function QuranAudioProvider({ children }: { children: React.ReactNode }) {
  const value = useQuranAudio();
  return <QuranAudioContext.Provider value={value}>{children}</QuranAudioContext.Provider>;
}

export function useQuranAudioContext(): QuranAudioContextValue {
  const ctx = useContext(QuranAudioContext);
  if (!ctx) {
    throw new Error('useQuranAudioContext must be used within QuranAudioProvider');
  }
  return ctx;
}
