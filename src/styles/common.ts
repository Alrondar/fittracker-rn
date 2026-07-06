import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { SPACING, BORDER_RADIUS } from '../constants/theme';
import { typography } from './typography';

export const commonStyles = StyleSheet.create({
  // Контейнеры
  container: {
    flex: 1,
  } as ViewStyle,
  
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,

  // Шапка страницы
  header: {
    padding: SPACING.lg,
    paddingBottom: SPACING.md,
  } as ViewStyle,
  
  headerTitle: {
    ...typography.h2,
    marginBottom: 4,
  } as TextStyle,
  
  headerSubtitle: {
    ...typography.body,
  } as TextStyle,

  // Секции
  section: {
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
  } as ViewStyle,
  
  sectionTitle: {
    ...typography.h4,
    marginBottom: SPACING.md,
  } as TextStyle,

  // Приветствие
  greeting: {
    ...typography.h1,
  } as TextStyle,
  
  subtitle: {
    ...typography.body,
    marginTop: SPACING.xs,
  } as TextStyle,

  // Пустые состояния
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxl,
    marginTop: 40,
  } as ViewStyle,
  
  emptyTitle: {
    ...typography.h3,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  } as TextStyle,
  
  emptyText: {
    ...typography.body,
    textAlign: 'center',
  } as TextStyle,

  // Loading
  loadingText: {
    marginTop: 12,
  } as TextStyle,

  // Scroll
  scrollView: {
    flex: 1,
  } as ViewStyle,
  
  scrollContent: {
    flexGrow: 1,
  } as ViewStyle,

  // FAB
  fab: {
    position: 'absolute',
    bottom: SPACING.xl,
    right: SPACING.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  } as ViewStyle,

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.lg,
    borderTopWidth: 1,
  } as ViewStyle,

  // Back button
  backButton: {
    padding: SPACING.sm,
  } as ViewStyle,
  
  backText: {
    ...typography.labelBold,
  } as TextStyle,

  // Divider
  divider: {
    height: 1,
    marginVertical: SPACING.md,
  } as ViewStyle,

  // Header с навигацией
  navHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
  } as ViewStyle,

// Статистика
statsContainer: {
  flexDirection: 'row',
  paddingHorizontal: SPACING.xl,
  marginBottom: SPACING.xl,
  gap: SPACING.md,
} as ViewStyle,

statCard: {
  flex: 1,
  padding: SPACING.lg,
  borderRadius: BORDER_RADIUS.lg,
  elevation: 2,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
} as ViewStyle,

statValue: {
  fontSize: 24,
  fontWeight: 'bold',
  marginBottom: SPACING.xs,
} as TextStyle,

statLabel: {
  fontSize: 12,
} as TextStyle,

// Прогресс-бар
progressBarContainer: {
  marginBottom: SPACING.lg,
} as ViewStyle,

progressBarBackground: {
  height: 6,
  backgroundColor: 'rgba(255,255,255,0.2)',
  borderRadius: 3,
  overflow: 'hidden',
  marginBottom: SPACING.xs,
} as ViewStyle,

progressBarFill: {
  height: '100%',
  backgroundColor: 'white',
  borderRadius: 3,
} as ViewStyle,

progressText: {
  fontSize: 11,
  textAlign: 'right',
} as TextStyle,

// Быстрые действия
quickActions: {
  flexDirection: 'row',
  gap: SPACING.md,
} as ViewStyle,

quickAction: {
  flex: 1,
  padding: SPACING.lg,
  borderRadius: BORDER_RADIUS.lg,
  alignItems: 'center',
  elevation: 2,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 4,
} as ViewStyle,

quickActionText: {
  fontSize: 12,
  fontWeight: '600',
  marginTop: SPACING.sm,
} as TextStyle,

// Недавние тренировки
recentCard: {
  padding: SPACING.lg,
  borderRadius: BORDER_RADIUS.lg,
  marginBottom: SPACING.sm,
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  elevation: 2,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 4,
} as ViewStyle,

recentInfo: {
  flex: 1,
} as ViewStyle,

recentName: {
  fontSize: 16,
  fontWeight: '600',
  marginBottom: SPACING.xs,
} as TextStyle,

recentDate: {
  fontSize: 14,
} as TextStyle,


});

export type CommonStyleKey = keyof typeof commonStyles;