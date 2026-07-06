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
});

export type CommonStyleKey = keyof typeof commonStyles;