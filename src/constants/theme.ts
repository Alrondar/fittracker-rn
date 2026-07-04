// Единая тема приложения — все цвета здесь
export const COLORS = {
  // Основные
  primary: '#7c3aed',        // Фиолетовый (бренд)
  primaryLight: '#ede9fe',   // Светло-фиолетовый
  primaryDark: '#6b21a8',    // Тёмно-фиолетовый
  
  // Семантические
  success: '#10b981',        // Зелёный (успех)
  successLight: '#d1fae5',   // Светло-зелёный
  error: '#ef4444',          // Красный (ошибка)
  errorLight: '#fee2e2',     // Светло-красный
  warning: '#f59e0b',        // Оранжевый (предупреждение)
  warningLight: '#fef3c7',   // Светло-оранжевый
  info: '#3b82f6',           // Синий (инфо)
  
  // Фоны
  background: '#faf5ff',     // Основной фон (светло-фиолетовый)
  surface: '#ffffff',        // Поверхности (карточки)
  surfaceSecondary: '#f9fafb', // Вторичные поверхности
  
  // Текст
  textPrimary: '#1f2937',    // Основной текст
  textSecondary: '#6b7280',  // Вторичный текст
  textTertiary: '#9ca3af',   // Третичный текст (подсказки)
  textInverse: '#ffffff',    // Текст на тёмном фоне
  
  // Границы
  border: '#e5e7eb',         // Обычная граница
  borderLight: '#f3f4f6',    // Светлая граница
  
  // Прочее
  shadow: 'rgba(0, 0, 0, 0.1)',
  overlay: 'rgba(0, 0, 0, 0.5)',
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
  regular: { fontSize: 14, color: COLORS.textPrimary },
  small: { fontSize: 12, color: COLORS.textSecondary },
  title: { fontSize: 20, fontWeight: 'bold' as const, color: COLORS.textPrimary },
  subtitle: { fontSize: 16, color: COLORS.textSecondary },
};