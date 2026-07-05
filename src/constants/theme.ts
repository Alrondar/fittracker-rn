export const lightTheme = {
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

export const darkTheme = {
  colors: {
    primary: '#8b5cf6', // Чуть светлее для темного фона
    primaryLight: '#4c1d95',
    primaryDark: '#a78bfa',
    
    success: '#34d399',
    successLight: '#064e3b',
    error: '#f87171',
    errorLight: '#7f1d1d',
    warning: '#fbbf24',
    warningLight: '#78350f',
    info: '#60a5fa',
    
    background: '#0f172a', // Темно-синий/серый
    surface: '#1e293b',    // Чуть светлее для карточек
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