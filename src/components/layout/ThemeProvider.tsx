// ============================================================================
// ACE Educational Hub — Theme Provider (Light Mode Only)
// ============================================================================

import { createContext, useContext, useEffect, type ReactNode } from 'react';

interface ThemeContextValue {
  theme: 'light';
  resolvedTheme: 'light';
  setTheme: (_theme: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Force light mode — remove any dark class
    const root = document.documentElement;
    root.classList.remove('dark');
    root.classList.add('light');
    localStorage.removeItem('ace-edu-theme');
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: 'light', resolvedTheme: 'light', setTheme: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
