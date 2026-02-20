/**
 * Sacred Dock visibility: visible by default so the menu is always findable.
 * Can still hide/show via scroll or tap if we add that later.
 */
import React, { createContext, useCallback, useContext, useState } from 'react';

type DockVisibilityContextValue = {
  dockVisible: boolean;
  showDock: () => void;
  hideDock: () => void;
  toggleDock: () => void;
};

const DockVisibilityContext = createContext<DockVisibilityContextValue | null>(null);

export function DockVisibilityProvider({ children }: { children: React.ReactNode }) {
  const [dockVisible, setDockVisible] = useState(true);
  const showDock = useCallback(() => setDockVisible(true), []);
  const hideDock = useCallback(() => setDockVisible(false), []);
  const toggleDock = useCallback(() => setDockVisible((v) => !v), []);
  return (
    <DockVisibilityContext.Provider value={{ dockVisible, showDock, hideDock, toggleDock }}>
      {children}
    </DockVisibilityContext.Provider>
  );
}

export function useDockVisibility(): DockVisibilityContextValue {
  const ctx = useContext(DockVisibilityContext);
  if (!ctx) throw new Error('useDockVisibility must be used within DockVisibilityProvider');
  return ctx;
}
