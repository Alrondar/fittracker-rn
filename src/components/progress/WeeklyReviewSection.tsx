import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { ChevronRight, AlertTriangle, TrendingUp, Activity, Heart, Calendar } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { AppCard } from '../ui/AppCard';
import { SheetShell } from '../ui/SheetShell';
import { useWeeklySummary } from '../../hooks/useWeeklySummary';
import type { WeeklyInsight, InsightSeverity } from '../../engine/weeklySummary';

interface WeeklyReviewSectionProps {
  userId: string | null;
}

const severityOrder: Record<InsightSeverity, number> = {
  warning: 0,
  positive: 1,
  caution: 2,
  neutral: 3,
};

const severityColors: Record<InsightSeverity, { bg: string; icon: string; border: string }> = {
  warning: { bg: 'warningLight', icon: 'warning', border: 'warning' },
  positive: { bg: 'successLight', icon: 'success', border: 'success' },
  caution: { bg: 'warningLight', icon: 'warning', border: 'warning' },
  neutral: { bg: 'surfaceSecondary', icon: 'textSecondary', border: 'border' },
} as const;

export function WeeklyReviewSection({ userId }: WeeklyReviewSectionProps) {
  const { colors } = useTheme();
  const [showDetails, setShowDetails] = useState(false);

  const { data, isPending, isError, error, refetch } = useWeeklySummary(userId, 0);

  const sortedInsights = useMemo(() => {
    if (!data?.insights) return [];
    return [...data.insights].sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
    );
  }, [data?.insights]);

  const topInsights = sortedInsights.slice(0, 2);

  if (isPending) {
    return (
      <AppCard variant="compact">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            Анализируем твою неделю…
          </Text>
        </View>
      </AppCard>
    );
  }

  if (isError) {
    return (
      <AppCard variant="compact">
        <View style={{ alignItems: 'center', gap: SPACING.sm }}>
          <Text style={[typography.body, { color: colors.error, textAlign: 'center' }]}>
            Не удалось загрузить обзор недели
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            style={{
              paddingHorizontal: SPACING.md,
              paddingVertical: SPACING.xs,
              backgroundColor: colors.primary,
              borderRadius: BORDER_RADIUS.md,
            }}
          >
            <Text style={[typography.captionSmall, { color: colors.textInverse, fontWeight: '600' }]}>
              Повторить
            </Text>
          </TouchableOpacity>
        </View>
      </AppCard>
    );
  }

  if (!data || data.current.workoutsCount === 0) {
    return (
      <AppCard variant="compact">
        <View style={{ alignItems: 'center', gap: SPACING.sm }}>
          <Calendar size={24} color={colors.textTertiary} />
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
            Недостаточно данных за эту неделю
          </Text>
          <Text style={[typography.captionSmall, { color: colors.textTertiary, textAlign: 'center' }]}>
            Заверши хотя бы одну тренировку, чтобы увидеть обзор.
          </Text>
        </View>
      </AppCard>
    );
  }

  const getIcon = (severity: InsightSeverity) => {
    switch (severity) {
      case 'warning':
        return <AlertTriangle size={18} color={colors.warning} />;
      case 'positive':
        return <TrendingUp size={18} color={colors.success} />;
      case 'caution':
        return <Activity size={18} color={colors.warning} />;
      default:
        return <Activity size={18} color={colors.textSecondary} />;
    }
  };

  return (
    <>
      <AppCard
        variant="default"
        style={{ marginBottom: SPACING.lg }}
        onPress={() => setShowDetails(true)}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md }}>
          <Text style={[typography.h5, { color: colors.textPrimary }]}>Твоя неделя</Text>
          <ChevronRight size={20} color={colors.textTertiary} />
        </View>

        <View style={{ gap: SPACING.sm }}>
          {topInsights.map((insight) => {
            const colorMap = severityColors[insight.severity];
            return (
              <View
                key={insight.code}
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: SPACING.sm,
                  padding: SPACING.sm,
                  backgroundColor: (colors as any)[colorMap.bg] + '40',
                  borderRadius: BORDER_RADIUS.md,
                  borderLeftWidth: 3,
                  borderLeftColor: (colors as any)[colorMap.border],
                }}
              >
                <View style={{ marginTop: 2 }}>{getIcon(insight.severity)}</View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.label, { color: colors.textPrimary, fontWeight: '600' }]}>
                    {insight.title}
                  </Text>
                  {insight.subtitle && (
                    <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                      {insight.subtitle}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Text style={[typography.captionSmall, { color: colors.textTertiary, textAlign: 'center' }]}>
            Нажми, чтобы увидеть детали: объём, восстановление и прогресс
          </Text>
        </View>
      </AppCard>

      <SheetShell
        visible={showDetails}
        title="Детали недели"
        onClose={() => setShowDetails(false)}
      >
        <View style={{ gap: SPACING.lg }}>
          {/* Consistency */}
          <DetailBlock
            icon={<Calendar size={20} color={colors.primary} />}
            title="Регулярность"
            color={colors.primary}
          >
            <Text style={[typography.body, { color: colors.textPrimary }]}>
              {data.current.workoutsCount} тренировок за неделю
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: SPACING.xs }]}>
              Дни: {data.current.workoutDays.map(d => d.slice(8)).join(', ')}
            </Text>
          </DetailBlock>

          {/* Performance */}
          <DetailBlock
            icon={<TrendingUp size={20} color={colors.success} />}
            title="Прогресс"
            color={colors.success}
          >
            {data.current.prs.length > 0 ? (
              <>
                <Text style={[typography.body, { color: colors.textPrimary }]}>
                  {data.current.prs.length} новых рекордов
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: SPACING.xs }]}>
                  {data.current.prs.map(p => p.exerciseName).join(', ')}
                </Text>
              </>
            ) : (
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                Пока без новых рекордов, но ты продолжаешь работать!
              </Text>
            )}
          </DetailBlock>

          {/* Training Load */}
          <DetailBlock
            icon={<Activity size={20} color={colors.warning} />}
            title="Нагрузка"
            color={colors.warning}
          >
            <Text style={[typography.body, { color: colors.textPrimary }]}>
              Объём: {data.current.totalVolume.toLocaleString()} кг
            </Text>
            {data.previous.totalVolume > 0 && (
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: SPACING.xs }]}>
                Прошлая неделя: {data.previous.totalVolume.toLocaleString()} кг
              </Text>
            )}
            {data.current.rpe.avg != null && (
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: SPACING.xs }]}>
                Средний RPE: {data.current.rpe.avg.toFixed(1)} (на {data.current.rpe.count} подходах)
              </Text>
            )}
          </DetailBlock>

          {/* Recovery */}
          <DetailBlock
            icon={<Heart size={20} color={colors.error} />}
            title="Восстановление"
            color={colors.error}
          >
            {data.current.readiness.daysLogged >= 3 && data.current.readiness.avg != null ? (
              <>
                <Text style={[typography.body, { color: colors.textPrimary }]}>
                  Средний readiness: {data.current.readiness.avg.toFixed(1)} / 5
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: SPACING.xs }]}>
                  Отмечено за {data.current.readiness.daysLogged} дней
                </Text>
              </>
            ) : (
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                Недостаточно данных readiness для анализа. Отмечай самочувствие ежедневно для точных выводов.
              </Text>
            )}
            {data.current.pain.count > 0 && (
              <View style={{ marginTop: SPACING.sm, padding: SPACING.sm, backgroundColor: colors.errorLight, borderRadius: BORDER_RADIUS.md }}>
                <Text style={[typography.caption, { color: colors.error, fontWeight: '600' }]}>
                  ⚠️ {data.current.pain.count} событий боли за неделю
                </Text>
              </View>
            )}
          </DetailBlock>
        </View>
      </SheetShell>
    </>
  );
}

function DetailBlock({
  icon,
  title,
  color,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm }}>
        {icon}
        <Text style={[typography.labelBold, { color: colors.textPrimary }]}>{title}</Text>
      </View>
      <View style={{ paddingLeft: SPACING.xl, borderLeftWidth: 2, borderLeftColor: color + '40' }}>
        {children}
      </View>
    </View>
  );
}
