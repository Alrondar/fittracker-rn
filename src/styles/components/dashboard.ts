import { Dimensions } from 'react-native';
import { SPACING, BORDER_RADIUS, fontScale } from '../../constants/theme';

// Локальный alias, чтобы не тянуть import в каждое поле; fontScale уже учитывает ширину.
const fs = fontScale;

export const createDashboardStyles = (colors: any) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Шапка
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fs(28),
    fontWeight: '700' as const,
    color: colors.textPrimary,
    marginBottom: SPACING.xs,
  },
  headerSubtitle: {
    fontSize: fs(14),
    color: colors.textSecondary,
  },
  // Карточка программы (Hero)
  programCard: {
    backgroundColor: colors.primary,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
  },
  programTitle: {
    fontSize: fs(20),
    fontWeight: '700' as const,
    color: colors.textInverse,
    marginBottom: SPACING.xs,
  },
  programDay: {
    fontSize: fs(16),
    color: 'rgba(255,255,255,0.9)',
    marginBottom: SPACING.lg,
  },
  programProgress: {
    height: 8,
    backgroundColor: colors.textInverse + '30',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  programProgressBar: {
    height: '100%',
    backgroundColor: colors.textInverse,
    borderRadius: 4,
  },
  programButtonText: {
    fontSize: fs(16),
    fontWeight: '600' as const,
    color: colors.textInverse,
    textAlign: 'center' as const,
  },
  // Секции
  section: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  sectionTitle: {
    fontSize: fs(18),
    fontWeight: '700' as const,
    color: colors.textPrimary,
    marginBottom: SPACING.md,
  },
  // Календарь активности (оставлен для обратной совместимости)
  calendarCard: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  calendarGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 4,
  },
  calendarDay: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  calendarDayEmpty: {
    backgroundColor: colors.surfaceSecondary,
  },
  calendarDayActive: {
    backgroundColor: colors.success,
  },
  calendarDayLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: colors.textInverse,
  },
  // Статистика недели
  statsRow: {
    flexDirection: 'row' as const,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: fs(24),
    fontWeight: '700' as const,
    color: colors.textPrimary,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: fs(12),
    color: colors.textSecondary,
  },
  // Прогресс упражнений
  progressCard: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: SPACING.md,
  },
});