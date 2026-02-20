/**
 * App-wide language state. Loads from storage on mount; when changed in Settings,
 * updates context so the whole app (dock, screens, etc.) re-renders with new language.
 */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Language } from '../features/prayer/types';
import { loadLanguage, saveLanguage } from '../features/prayer/storage/prayerSettings';

type LanguageContextValue = {
  language: Language;
  setLanguage: (lang: Language) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ar');

  useEffect(() => {
    loadLanguage().then(setLanguageState);
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    saveLanguage(lang);
    setLanguageState(lang);
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
