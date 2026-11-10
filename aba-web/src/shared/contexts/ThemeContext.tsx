'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CustomThemeProvider as baseTheme } from '@/shared/theme/ThemeProvider';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeContextProvider');
  }
  return context;
};

export const ThemeContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setMode] = useState<ThemeMode>('light');

  // Read persisted preference once on mount — never write here to avoid
  // overwriting a stored value before the state update is processed.
  useEffect(() => {
    const stored = localStorage.getItem('theme-mode') as ThemeMode | null;
    if (stored === 'light' || stored === 'dark') {
      setMode(stored);
    } else {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setMode(systemPrefersDark ? 'dark' : 'light');
    }
  }, []);

  const toggleTheme = () => {
    const next: ThemeMode = mode === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme-mode', next);
    setMode(next);
  };

  // Create theme dynamically based on current mode
  const theme = useMemo(() => {
    return createTheme({
      ...baseTheme,
      palette: {
        mode, // this is the key – MUI will generate all appropriate colors
      },
    });
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};