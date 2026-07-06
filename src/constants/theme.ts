// ============================================================
// ТИПЫ
// ============================================================

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  success: string;
  successLight: string;
  error: string;
  errorLight: string;
  warning: string;
  warningLight: string;
  info: string;
  background: string;
  surface: string;
  surfaceSecondary: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  border: string;
  borderLight: string;
  shadow: string;
  overlay: string;
}

export interface Theme {
  colors: ThemeColors;
  name: string;
  mode: 'light' | 'dark';
  accent: string; // для идентификации цветовой схемы
}

// ============================================================
// ФИОЛЕТОВАЯ ТЕМА (оригинальная)
// ============================================================

export const purpleLightTheme: Theme = {
  name: 'Светлая',
  mode: 'light',
  accent: 'purple',
  colors: {
    primary: '#7c3aed',
    primaryLight: '#ede9fe',
    primaryDark: '#6b21a8',
    success: '#10b981',
    successLight: '#d1fae5',
    error: '#ef4444',
    errorLight: '#fee2e2',
    warning: '#f59e0b',
    warningLight: '#fef3c7',
    info: '#3b82f6',
    background: '#faf5ff',
    surface: '#ffffff',
    surfaceSecondary: '#f9fafb',
    textPrimary: '#1f2937',
    textSecondary: '#6b7280',
    textTertiary: '#9ca3af',
    textInverse: '#ffffff',
    border: '#e5e7eb',
    borderLight: '#f3f4f6',
    shadow: 'rgba(0, 0, 0, 0.1)',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
};

export const purpleDarkTheme: Theme = {
  name: 'Тёмная',
  mode: 'dark',
  accent: 'purple',
  colors: {
    primary: '#8b5cf6',
    primaryLight: '#4c1d95',
    primaryDark: '#a78bfa',
    success: '#34d399',
    successLight: '#064e3b',
    error: '#f87171',
    errorLight: '#7f1d1d',
    warning: '#fbbf24',
    warningLight: '#78350f',
    info: '#60a5fa',
    background: '#0f172a',
    surface: '#1e293b',
    surfaceSecondary: '#334155',
    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
    textTertiary: '#64748b',
    textInverse: '#0f172a',
    border: '#334155',
    borderLight: '#475569',
    shadow: 'rgba(0, 0, 0, 0.5)',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
};

// ============================================================
// ОРАНЖЕВАЯ ТЕМА (Энергия)
// ============================================================

export const orangeLightTheme: Theme = {
  name: 'Энергия',
  mode: 'light',
  accent: 'orange',
  colors: {
    primary: '#FF6B35',
    primaryLight: '#FFF0EB',
    primaryDark: '#E85D2A',
    success: '#2ECC71',
    successLight: '#E8F8F0',
    error: '#EB4D4B',
    errorLight: '#FDEDEC',
    warning: '#F9CA24',
    warningLight: '#FEF9E7',
    info: '#004E89',
    background: '#FFFFFF',
    surface: '#FFF8F5',
    surfaceSecondary: '#F5F5F5',
    textPrimary: '#2D3436',
    textSecondary: '#636E72',
    textTertiary: '#B2BEC3',
    textInverse: '#FFFFFF',
    border: '#E8E0DC',
    borderLight: '#F5F0ED',
    shadow: 'rgba(232, 93, 42, 0.12)',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
};

export const orangeDarkTheme: Theme = {
  name: 'Энергия (тёмная)',
  mode: 'dark',
  accent: 'orange',
  colors: {
    primary: '#FF8C5A',
    primaryLight: '#3D1F14',
    primaryDark: '#FF6B35',
    success: '#2ECC71',
    successLight: '#0D2B1A',
    error: '#FF6B6B',
    errorLight: '#2D1010',
    warning: '#F9CA24',
    warningLight: '#2D2608',
    info: '#5BA4D9',
    background: '#1A1412',
    surface: '#2A211E',
    surfaceSecondary: '#3D302C',
    textPrimary: '#F5F0ED',
    textSecondary: '#B8ADA8',
    textTertiary: '#7A6F6A',
    textInverse: '#1A1412',
    border: '#3D302C',
    borderLight: '#4A3D38',
    shadow: 'rgba(255, 107, 53, 0.2)',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
};

// ============================================================
// СИНЯЯ ТЕМА (Профи)
// ============================================================

export const blueLightTheme: Theme = {
  name: 'Профи',
  mode: 'light',
  accent: 'blue',
  colors: {
    primary: '#0984E3',
    primaryLight: '#E3F2FD',
    primaryDark: '#075985',
    success: '#00CE7C',
    successLight: '#E6F9F1',
    error: '#FF4757',
    errorLight: '#FFE5E8',
    warning: '#FFA502',
    warningLight: '#FFF4E6',
    info: '#0984E3',
    background: '#F8F9FA',
    surface: '#FFFFFF',
    surfaceSecondary: '#E8F4F8',
    textPrimary: '#2F3542',
    textSecondary: '#747D8C',
    textTertiary: '#A4B0BE',
    textInverse: '#FFFFFF',
    border: '#DFE4EA',
    borderLight: '#F1F2F6',
    shadow: 'rgba(9, 132, 227, 0.1)',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
};

export const blueDarkTheme: Theme = {
  name: 'Профи (тёмная)',
  mode: 'dark',
  accent: 'blue',
  colors: {
    primary: '#74B9FF',
    primaryLight: '#0A2540',
    primaryDark: '#0984E3',
    success: '#55EFC4',
    successLight: '#0A2B22',
    error: '#FF7675',
    errorLight: '#2D0F0F',
    warning: '#FDCB6E',
    warningLight: '#2D2608',
    info: '#74B9FF',
    background: '#0A1628',
    surface: '#132238',
    surfaceSecondary: '#1E3350',
    textPrimary: '#F1F5F9',
    textSecondary: '#94A3B8',
    textTertiary: '#64748B',
    textInverse: '#0A1628',
    border: '#1E3350',
    borderLight: '#2A4263',
    shadow: 'rgba(116, 185, 255, 0.15)',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
};

// ============================================================
// НЕОНОВАЯ ТЕМА (Кибер)
// ============================================================

export const neonLightTheme: Theme = {
  name: 'Кибер',
  mode: 'light',
  accent: 'neon',
  colors: {
    primary: '#00CC6A',
    primaryLight: '#E6FFF2',
    primaryDark: '#009E52',
    success: '#00CC6A',
    successLight: '#E6FFF2',
    error: '#FF3366',
    errorLight: '#FFE5EC',
    warning: '#FFAA00',
    warningLight: '#FFF4E0',
    info: '#00D9FF',
    background: '#F5FFF9',
    surface: '#FFFFFF',
    surfaceSecondary: '#F0FFF6',
    textPrimary: '#0F2419',
    textSecondary: '#3D6B52',
    textTertiary: '#7FA892',
    textInverse: '#FFFFFF',
    border: '#C8F0D9',
    borderLight: '#E6FFF2',
    shadow: 'rgba(0, 204, 106, 0.15)',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
};

export const neonDarkTheme: Theme = {
  name: 'Кибер (тёмная)',
  mode: 'dark',
  accent: 'neon',
  colors: {
    primary: '#00FF88',
    primaryLight: '#003D22',
    primaryDark: '#00CC6A',
    success: '#00FF88',
    successLight: '#003D22',
    error: '#FF3366',
    errorLight: '#3D0018',
    warning: '#FFAA00',
    warningLight: '#3D2900',
    info: '#00D9FF',
    background: '#0A0A0A',
    surface: '#141414',
    surfaceSecondary: '#1F1F1F',
    textPrimary: '#FFFFFF',
    textSecondary: '#B0B0B0',
    textTertiary: '#707070',
    textInverse: '#0A0A0A',
    border: '#2A2A2A',
    borderLight: '#333333',
    shadow: 'rgba(0, 255, 136, 0.2)',
    overlay: 'rgba(0, 0, 0, 0.8)',
  },
};

// ============================================================
// РОЗОВАЯ ТЕМА (Закат) — бонус
// ============================================================

export const pinkLightTheme: Theme = {
  name: 'Закат',
  mode: 'light',
  accent: 'pink',
  colors: {
    primary: '#E91E63',
    primaryLight: '#FCE4EC',
    primaryDark: '#C2185B',
    success: '#4CAF50',
    successLight: '#E8F5E9',
    error: '#F44336',
    errorLight: '#FFEBEE',
    warning: '#FF9800',
    warningLight: '#FFF3E0',
    info: '#2196F3',
    background: '#FFF5F8',
    surface: '#FFFFFF',
    surfaceSecondary: '#FCE4EC',
    textPrimary: '#2C1820',
    textSecondary: '#6B4A55',
    textTertiary: '#A87A88',
    textInverse: '#FFFFFF',
    border: '#F5D5DE',
    borderLight: '#FAE8EE',
    shadow: 'rgba(233, 30, 99, 0.12)',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
};

export const pinkDarkTheme: Theme = {
  name: 'Закат (тёмная)',
  mode: 'dark',
  accent: 'pink',
  colors: {
    primary: '#FF5C8D',
    primaryLight: '#3D0F1F',
    primaryDark: '#E91E63',
    success: '#66BB6A',
    successLight: '#0F2B12',
    error: '#EF5350',
    errorLight: '#2D0F0F',
    warning: '#FFB74D',
    warningLight: '#2D1F0A',
    info: '#64B5F6',
    background: '#1A0F14',
    surface: '#2A1A22',
    surfaceSecondary: '#3D2630',
    textPrimary: '#FCE4EC',
    textSecondary: '#B88A99',
    textTertiary: '#7A5A66',
    textInverse: '#1A0F14',
    border: '#3D2630',
    borderLight: '#4A3038',
    shadow: 'rgba(255, 92, 141, 0.2)',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
};

// ============================================================
// МАППИНГ ВСЕХ ТЕМ
// ============================================================

export const themes: Record<string, Theme> = {
  // Фиолетовая
  'purple-light': purpleLightTheme,
  'purple-dark': purpleDarkTheme,
  // Оранжевая
  'orange-light': orangeLightTheme,
  'orange-dark': orangeDarkTheme,
  // Синяя
  'blue-light': blueLightTheme,
  'blue-dark': blueDarkTheme,
  // Неоновая
  'neon-light': neonLightTheme,
  'neon-dark': neonDarkTheme,
  // Розовая
  'pink-light': pinkLightTheme,
  'pink-dark': pinkDarkTheme,
};

// Группировка тем по акценту (для UI выбора)
export const themeGroups: Record<string, { label: string; keys: string[] }> = {
  purple: {
    label: 'Фиолетовая',
    keys: ['purple-light', 'purple-dark'],
  },
  orange: {
    label: 'Оранжевая',
    keys: ['orange-light', 'orange-dark'],
  },
  blue: {
    label: 'Синяя',
    keys: ['blue-light', 'blue-dark'],
  },
  neon: {
    label: 'Неон',
    keys: ['neon-light', 'neon-dark'],
  },
  pink: {
    label: 'Розовая',
    keys: ['pink-light', 'pink-dark'],
  },
};

export type ThemeKey = keyof typeof themes;
export type ThemeAccent = keyof typeof themeGroups;

// Алиасы для обратной совместимости (старый код продолжает работать)
export const lightTheme = purpleLightTheme;
export const darkTheme = purpleDarkTheme;

// ============================================================
// КОНСТАНТЫ (без изменений)
// ============================================================

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const BORDER_RADIUS = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const FONTS = {
  regular: { fontSize: 14 },
  small: { fontSize: 12 },
  title: { fontSize: 20, fontWeight: 'bold' as const },
  subtitle: { fontSize: 16 },
};

export const GRADIENTS = {
  // Фиолетовые
  primary: ['#7c3aed', '#5b21b6'] as const,
  hero: ['#8b5cf6', '#3b82f6'] as const,
  // Оранжевые
  orange: ['#FF6B35', '#E85D2A'] as const,
  orangeDark: ['#FF8C5A', '#FF6B35'] as const,
  // Синие
  blue: ['#0984E3', '#075985'] as const,
  blueDark: ['#74B9FF', '#0984E3'] as const,
  // Неоновые
  neon: ['#00FF88', '#00CC6A'] as const,
  neonDark: ['#00FF88', '#00D9FF'] as const,
  // Розовые
  pink: ['#E91E63', '#C2185B'] as const,
  pinkDark: ['#FF5C8D', '#E91E63'] as const,
  // Общие
  success: ['#10b981', '#059669'] as const,
  warning: ['#f59e0b', '#d97706'] as const,
  danger: ['#ef4444', '#dc2626'] as const,
  dark: ['#1e293b', '#0f172a'] as const,
};