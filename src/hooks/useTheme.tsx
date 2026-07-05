import { useState, createContext, useContext, ReactNode, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { lightTheme, darkTheme } from '../constants/theme';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: typeof lightTheme;
  isDark: boolean;
  colors: typeof lightTheme.colors;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');

  // Определяем, темная ли тема
  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemColorScheme === 'dark');
  const theme = isDark ? darkTheme : lightTheme;

  // Синхронизируем системный UI (Android navigation bar, status bar background)
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors.background);
  }, [theme.colors.background]);

  useEffect(() => {
    console.log('🎨 Theme Debug:', {
      systemColorScheme,
      themeMode,
      isDark,
      themeType: isDark ? 'DARK' : 'LIGHT'
    });
  }, [systemColorScheme, themeMode, isDark]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark,
        colors: theme.colors,
        themeMode,
        setThemeMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}