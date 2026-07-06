import { useState, createContext, useContext, ReactNode, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  lightTheme, 
  darkTheme, 
  themes,
  themeGroups,
  Theme,
  ThemeKey,
  ThemeAccent,
  ThemeColors,
  ThemeGradients,  // ← ИМПОРТ
} from '../constants/theme';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  colors: ThemeColors;
  gradients: ThemeGradients;  // ← ДОБАВИТЬ
  themeMode: ThemeMode;
  themeAccent: ThemeAccent;
  themeKey: ThemeKey;
  setThemeMode: (mode: ThemeMode) => void;
  setThemeAccent: (accent: ThemeAccent) => void;
  availableAccents: { key: ThemeAccent; label: string; keys: ThemeKey[] }[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_MODE_KEY = '@fittracker_theme_mode';
const THEME_ACCENT_KEY = '@fittracker_theme_accent';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [themeAccent, setThemeAccentState] = useState<ThemeAccent>('purple');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadSavedSettings();
  }, []);

  const loadSavedSettings = async () => {
    try {
      const savedMode = await AsyncStorage.getItem(THEME_MODE_KEY);
      const savedAccent = await AsyncStorage.getItem(THEME_ACCENT_KEY);
      
      if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) {
        setThemeModeState(savedMode as ThemeMode);
      }
      
      if (savedAccent && themeGroups[savedAccent]) {
        setThemeAccentState(savedAccent as ThemeAccent);
      }
    } catch (error) {
      console.error('Failed to load theme settings:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(THEME_MODE_KEY, mode);
    } catch (error) {
      console.error('Failed to save theme mode:', error);
    }
  };

  const setThemeAccent = async (accent: ThemeAccent) => {
    setThemeAccentState(accent);
    try {
      await AsyncStorage.setItem(THEME_ACCENT_KEY, accent);
    } catch (error) {
      console.error('Failed to save theme accent:', error);
    }
  };

  const getTheme = (): Theme => {
    const isDarkMode = themeMode === 'dark' || 
      (themeMode === 'system' && systemColorScheme === 'dark');
    
    const suffix = isDarkMode ? '-dark' : '-light';
    const themeKey = `${themeAccent}${suffix}` as ThemeKey;
    
    return themes[themeKey] || themes['purple-light'];
  };

  const theme = getTheme();
  const isDark = theme.mode === 'dark';
  const themeKey = `${themeAccent}${isDark ? '-dark' : '-light'}` as ThemeKey;

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors.background);
  }, [theme.colors.background]);

  useEffect(() => {
    if (isLoaded) {
      console.log('🎨 Theme:', {
        mode: themeMode,
        accent: themeAccent,
        themeKey,
        theme: theme.name,
        isDark,
      });
    }
  }, [themeMode, themeAccent, theme, isDark, isLoaded]);

  const availableAccents = Object.entries(themeGroups).map(([key, group]) => ({
    key: key as ThemeAccent,
    label: group.label,
    keys: group.keys as ThemeKey[],
  }));

  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark,
        colors: theme.colors,
        gradients: theme.gradients,  // ← ДОБАВИТЬ
        themeMode,
        themeAccent,
        themeKey,
        setThemeMode,
        setThemeAccent,
        availableAccents,
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