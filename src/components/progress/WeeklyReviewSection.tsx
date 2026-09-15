import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  TrendingUp,
  Activity,
  Heart,
  Calendar,
  AlertCircle,
  Dumbbell,
  Moon,
  X,
  Target,
  Zap,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { AppCard } from '../ui/AppCard';
import { PillToggle } from '../ui/PillToggle';
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
  const [isExpanded, setIsExpanded] = useState(false);
  // CI-6: session-local dismiss deload card (без persistence, как COACH-1).
  const [deloadDismissed, setDeloadDismissed] = useState(false);
  // P2: Переключатель режима карты мышц
  const [muscleView, setMuscleView] = useState<'balance' | 'fatigue' | 'strength'>('balance');

  const toggleExpand = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsExpanded(!isExpanded);
  };

  const { data, isPending, isError, error, refetch } = useWeeklySummary(userId, 0);

  // CI-6: количество сработавших сигналов для L1-карточки.
  const deloadSignalCount = useMemo(() => {
    if (!data?.deload) return 0;
    return Object.values(data.deload.signals).filter(Boolean).length;
  }, [data?.deload]);

  const sortedInsights = useMemo(() => {
    if (!data?.insights) return [];
    // CI-5: учитываем goalPriority от engine; если его нет — fallback на severity
    return [...data.insights].sort((a, b) => {
      const pa = a.goalPriority ?? 0;
      const pb = b.goalPriority ?? 0;
      if (pb !== pa) return pb - pa;
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
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
            accessibilityRole="button"
            accessibilityLabel="Повторить попытку загрузки"
            style={{
              paddingHorizontal: SPACING.md,
              paddingVertical: SPACING.xs,
              backgroundColor: colors.primary,
              borderRadius: BORDER_RADIUS.md,
            }}
          >
            <Text
              style={[typography.captionSmall, { color: colors.textInverse, fontWeight: '600' }]}
            >
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
          <Text
            style={[typography.captionSmall, { color: colors.textTertiary, textAlign: 'center' }]}
          >
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
      {/* CI-6 L1: Deload recommendation card (Вариант B — отдельная карточка) */}
      {data.deload.recommended && !deloadDismissed && (
        <AppCard
          variant="default"
          style={{
            marginBottom: SPACING.md,
            borderWidth: 1,
            borderColor: colors.warning,
            backgroundColor: (colors as any).warningLight + '30',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: SPACING.sm,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 }}>
              <Moon size={20} color={colors.warning} />
              <Text style={[typography.h5, { color: colors.textPrimary, flex: 1 }]}>
                Рассмотри разгрузочную неделю
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setDeloadDismissed(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Скрыть предложение"
              accessibilityRole="button"
            >
              <X size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: SPACING.sm }]}>
            Наблюдается {deloadSignalCount} из 4 устойчивых сигналов перегрузки.
          </Text>
          <View style={{ flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md }}>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsExpanded(true);
              }}
              style={{
                flex: 1,
                paddingHorizontal: SPACING.md,
                paddingVertical: SPACING.sm,
                backgroundColor: colors.warning + '20',
                borderRadius: BORDER_RADIUS.md,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: SPACING.xs,
              }}
              accessibilityRole="button"
              accessibilityLabel="Разгрузочная неделя: снижение объёма"
              accessibilityHint="Раскрывает детали плана разгрузки"
            >
              <Moon size={16} color={colors.warning} />
              <Text style={[typography.label, { color: colors.warning, fontWeight: '600' }]}>
                Объём
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsExpanded(true);
              }}
              style={{
                flex: 1,
                paddingHorizontal: SPACING.md,
                paddingVertical: SPACING.sm,
                backgroundColor: colors.primary + '20',
                borderRadius: BORDER_RADIUS.md,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: SPACING.xs,
              }}
              accessibilityRole="button"
              accessibilityLabel="Техническая неделя: снижение веса с акцентом на технику"
              accessibilityHint="Раскрывает детали плана технической недели"
            >
              <Target size={16} color={colors.primary} />
              <Text style={[typography.label, { color: colors.primary, fontWeight: '600' }]}>
                Техника
              </Text>
            </TouchableOpacity>
          </View>
        </AppCard>
      )}

      <AppCard variant="default" style={{ marginBottom: SPACING.lg }}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={toggleExpand}
          accessibilityRole="button"
          accessibilityLabel={isExpanded ? 'Свернуть детали недели' : 'Развернуть детали недели'}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: SPACING.md,
            }}
          >
            <Text style={[typography.h5, { color: colors.textPrimary }]}>Твоя неделя</Text>
            {isExpanded ? (
              <ChevronDown size={20} color={colors.textTertiary} />
            ) : (
              <ChevronRight size={20} color={colors.textTertiary} />
            )}
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
                    <Text
                      style={[typography.label, { color: colors.textPrimary, fontWeight: '600' }]}
                    >
                      {insight.title}
                    </Text>
                    {insight.subtitle && (
                      <Text
                        style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}
                      >
                        {insight.subtitle}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Training Load L1 Block */}
          <View
            style={{
              marginTop: SPACING.md,
              paddingTop: SPACING.md,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: SPACING.sm,
                marginBottom: SPACING.xs,
              }}
            >
              <Activity
                size={16}
                color={
                  data.trainingLoad.level === 'normal'
                    ? colors.success
                    : data.trainingLoad.level === 'elevated'
                      ? colors.warning
                      : colors.error
                }
              />
              <Text style={[typography.labelBold, { color: colors.textPrimary }]}>
                {data.trainingLoad.level === 'normal'
                  ? 'Обычная нагрузка'
                  : data.trainingLoad.level === 'elevated'
                    ? 'Повышенная нагрузка'
                    : 'Высокая нагрузка'}
              </Text>
            </View>
            {data.trainingLoad.level === 'normal' ? (
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                Нагрузка стабильна, объём и RPE в пределах твоей нормы.
              </Text>
            ) : (
              <View style={{ gap: SPACING.xs }}>
                {data.trainingLoad.reasons.slice(0, 2).map((reason, idx) => (
                  <Text key={idx} style={[typography.caption, { color: colors.textSecondary }]}>
                    • {reason}
                  </Text>
                ))}
                {data.trainingLoad.reasons.length > 2 && (
                  <Text style={[typography.captionSmall, { color: colors.textTertiary }]}>
                    и ещё {data.trainingLoad.reasons.length - 2} фактора
                  </Text>
                )}
              </View>
            )}
          </View>

          {!isExpanded && (
            <View
              style={{
                marginTop: SPACING.md,
                paddingTop: SPACING.md,
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}
            >
              <Text
                style={[
                  typography.captionSmall,
                  { color: colors.textTertiary, textAlign: 'center' },
                ]}
              >
                Нажми, чтобы увидеть полные метрики и детали
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* L2: Inline Accordion Content */}
        {isExpanded && (
          <View
            style={{
              gap: SPACING.lg,
              marginTop: SPACING.lg,
              paddingTop: SPACING.lg,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            {/* Consistency */}
            <DetailBlock
              icon={<Calendar size={20} color={colors.primary} />}
              title="Регулярность"
              color={colors.primary}
            >
              <Text style={[typography.body, { color: colors.textPrimary }]}>
                {data.current.workoutsCount} тренировок за неделю
              </Text>
              <Text
                style={[typography.caption, { color: colors.textSecondary, marginTop: SPACING.xs }]}
              >
                Дни: {data.current.workoutDays.map((d) => d.slice(8)).join(', ')}
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
                  <Text
                    style={[
                      typography.caption,
                      { color: colors.textSecondary, marginTop: SPACING.xs },
                    ]}
                  >
                    {data.current.prs.map((p) => p.exerciseName).join(', ')}
                  </Text>
                </>
              ) : (
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Пока без новых рекордов, но ты продолжаешь работать!
                </Text>
              )}
            </DetailBlock>

            {/* Training Load Context */}
            <DetailBlock
              icon={
                <Activity
                  size={20}
                  color={
                    data.trainingLoad.level === 'normal'
                      ? colors.success
                      : data.trainingLoad.level === 'elevated'
                        ? colors.warning
                        : colors.error
                  }
                />
              }
              title="Контекст нагрузки"
              color={
                data.trainingLoad.level === 'normal'
                  ? colors.success
                  : data.trainingLoad.level === 'elevated'
                    ? colors.warning
                    : colors.error
              }
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: SPACING.xs,
                  marginBottom: SPACING.sm,
                }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor:
                      data.trainingLoad.level === 'normal'
                        ? colors.success
                        : data.trainingLoad.level === 'elevated'
                          ? colors.warning
                          : colors.error,
                  }}
                />
                <Text style={[typography.labelBold, { color: colors.textPrimary }]}>
                  {data.trainingLoad.level === 'normal'
                    ? 'Обычная'
                    : data.trainingLoad.level === 'elevated'
                      ? 'Повышенная'
                      : 'Высокая'}
                </Text>
              </View>

              <View style={{ gap: SPACING.xs }}>
                {data.trainingLoad.reasons.map((reason, idx) => (
                  <Text key={idx} style={[typography.caption, { color: colors.textSecondary }]}>
                    • {reason}
                  </Text>
                ))}
              </View>

              <View
                style={{
                  marginTop: SPACING.md,
                  paddingTop: SPACING.md,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                  gap: SPACING.xs,
                }}
              >
                <Text
                  style={[
                    typography.captionSmall,
                    { color: colors.textTertiary, fontWeight: '600' },
                  ]}
                >
                  Метрики:
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Объём: {data.current.totalVolume.toLocaleString()} кг{' '}
                  {data.previous.totalVolume > 0
                    ? `(${Math.round((data.trainingLoad.signals.volumeTrend - 1) * 100)}% к прошлой неделе)`
                    : ''}
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Тренировок: {data.current.workoutsCount}{' '}
                  {data.previous.workoutsCount > 0 ? `(было ${data.previous.workoutsCount})` : ''}
                </Text>
                {data.trainingLoad.signals.intensityTrend != null && (
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    RPE: {data.current.rpe.avg?.toFixed(1) ?? 'N/A'}{' '}
                    {data.previous.rpe.avg != null
                      ? `(было ${data.previous.rpe.avg.toFixed(1)})`
                      : ''}
                  </Text>
                )}
                {data.trainingLoad.signals.readinessTrend != null &&
                  data.current.readiness.avg != null && (
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>
                      Readiness: {data.current.readiness.avg.toFixed(1)}{' '}
                      {data.previous.readiness.avg != null
                        ? `(был ${data.previous.readiness.avg.toFixed(1)})`
                        : ''}
                    </Text>
                  )}
              </View>
            </DetailBlock>

            {/* CI-6: Deload Recommendations (L2) - Volume */}
            {data.deload.recommended && (
              <DetailBlock
                icon={<Moon size={20} color={colors.warning} />}
                title="Разгрузочная неделя (Объём)"
                color={colors.warning}
              >
                <Text
                  style={[
                    typography.label,
                    { color: colors.textPrimary, marginBottom: SPACING.sm },
                  ]}
                >
                  Почему это предложение:
                </Text>
                <View style={{ gap: SPACING.xs, marginBottom: SPACING.md }}>
                  {data.deload.reasons.map((reason, idx) => (
                    <Text key={idx} style={[typography.caption, { color: colors.textSecondary }]}>
                      • {reason}
                    </Text>
                  ))}
                </View>

                <Text
                  style={[
                    typography.label,
                    { color: colors.textPrimary, marginBottom: SPACING.sm },
                  ]}
                >
                  Что обычно включает разгрузочная неделя:
                </Text>
                <View style={{ gap: SPACING.xs, marginBottom: SPACING.md }}>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    • Объём: −40–60% от обычной недели
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    • Интенсивность: лёгкая (RPE ≤ 6–7)
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    • Длительность: обычно 1 неделя
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    • После этого — постепенный возврат к обычным нагрузкам
                  </Text>
                </View>

                <View
                  style={{
                    padding: SPACING.sm,
                    backgroundColor: (colors as any).surfaceSecondary ?? colors.background,
                    borderRadius: BORDER_RADIUS.md,
                  }}
                >
                  <Text style={[typography.caption, { color: colors.textTertiary }]}>
                    Это предложение, не команда. Приложение не изменяет твою программу автоматически
                    — решение всегда за тобой.
                  </Text>
                </View>
              </DetailBlock>
            )}

            {/* CI-6: Deload Recommendations (L2) - Technique */}
            {data.deload.recommended && (
              <DetailBlock
                icon={<Target size={20} color={colors.primary} />}
                title="Техническая неделя"
                color={colors.primary}
              >
                <Text
                  style={[
                    typography.label,
                    { color: colors.textPrimary, marginBottom: SPACING.sm },
                  ]}
                >
                  Почему это предложение:
                </Text>
                <View style={{ gap: SPACING.xs, marginBottom: SPACING.md }}>
                  {data.deload.reasons.map((reason, idx) => (
                    <Text key={idx} style={[typography.caption, { color: colors.textSecondary }]}>
                      • {reason}
                    </Text>
                  ))}
                </View>

                <Text
                  style={[
                    typography.label,
                    { color: colors.textPrimary, marginBottom: SPACING.sm },
                  ]}
                >
                  Что включает техническая неделя:
                </Text>
                <View style={{ gap: SPACING.xs, marginBottom: SPACING.md }}>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    • Вес: −30–35% от рабочего (65–70% от 1ПМ)
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    • Фокус: идеальная техника и контроль движения
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    • RPE: 6–7 (лёгкое выполнение, без усталости)
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    • Подходы: сохраняем количество, снижаем только вес
                  </Text>
                </View>

                <Text
                  style={[
                    typography.label,
                    { color: colors.textPrimary, marginBottom: SPACING.sm },
                  ]}
                >
                  Когда это полезно:
                </Text>
                <View style={{ gap: SPACING.xs, marginBottom: SPACING.md }}>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    • Усталость ЦНС (технический распад)
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    • Восстановление нервной системы без потери навыка
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    • Закрепление правильной техники
                  </Text>
                </View>

                <View
                  style={{
                    padding: SPACING.sm,
                    backgroundColor: (colors as any).surfaceSecondary ?? colors.background,
                    borderRadius: BORDER_RADIUS.md,
                  }}
                >
                  <Text style={[typography.caption, { color: colors.textTertiary }]}>
                    Это предложение, не команда. Приложение не изменяет твою программу автоматически
                    — решение всегда за тобой.
                  </Text>
                </View>
              </DetailBlock>
            )}

            {/* P2: Muscle Map (Balance / Fatigue / Strength) */}
            <DetailBlock
              icon={<Dumbbell size={20} color={colors.primary} />}
              title="Карта мышц"
              color={colors.primary}
            >
              <View style={{ marginBottom: SPACING.md }}>
                <PillToggle
                  options={[
                    { key: 'balance' as const, label: 'Объём' },
                    { key: 'fatigue' as const, label: 'Усталость', icon: Zap },
                    { key: 'strength' as const, label: 'Сила', icon: TrendingUp },
                  ]}
                  value={muscleView}
                  onChange={setMuscleView}
                />
              </View>

              {Object.keys(data.current.muscleVolume).length > 0 ? (
                <View style={{ gap: SPACING.sm }}>
                  {Object.entries(data.current.muscleVolume)
                    .filter(([_, v]) => v >= 4)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([muscle, sets]) => {
                      if (muscleView === 'balance') {
                        const prevSets = data.previous.muscleVolume[muscle] || 0;
                        const diff = sets - prevSets;
                        const diffText =
                          diff > 0
                            ? `↑ +${Math.round(diff)}`
                            : diff < 0
                              ? `↓ ${Math.round(diff)}`
                              : '→';
                        const diffColor =
                          diff > 0 ? colors.success : diff < 0 ? colors.error : colors.textTertiary;

                        return (
                          <View
                            key={muscle}
                            style={{
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <Text style={[typography.body, { color: colors.textPrimary }]}>
                              {muscle}
                            </Text>
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: SPACING.sm,
                              }}
                            >
                              <Text
                                style={[
                                  typography.caption,
                                  { color: diffColor, fontWeight: '600' },
                                ]}
                              >
                                {diffText}
                              </Text>
                              <Text style={[typography.body, { color: colors.textSecondary }]}>
                                {Math.round(sets)} сетов
                              </Text>
                            </View>
                          </View>
                        );
                      }

                      if (muscleView === 'fatigue') {
                        const fatigue = data.current.muscleFatigue?.[muscle] || 0;
                        // Цветовая кодировка: зелёный < 10000, жёлтый 10000–20000, красный > 20000
                        let fatigueColor = colors.success;
                        if (fatigue > 20000) fatigueColor = colors.error;
                        else if (fatigue > 10000) fatigueColor = colors.warning;

                        return (
                          <View key={muscle} style={{ gap: SPACING.xs }}>
                            <View
                              style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <Text style={[typography.body, { color: colors.textPrimary }]}>
                                {muscle}
                              </Text>
                              <Text
                                style={[
                                  typography.caption,
                                  { color: fatigueColor, fontWeight: '600' },
                                ]}
                              >
                                {Math.round(fatigue)}
                              </Text>
                            </View>
                            <View
                              style={{
                                height: 6,
                                backgroundColor: colors.surfaceSecondary,
                                borderRadius: 3,
                                overflow: 'hidden',
                              }}
                            >
                              <View
                                style={{
                                  height: '100%',
                                  width: `${Math.min((fatigue / 25000) * 100, 100)}%`,
                                  backgroundColor: fatigueColor,
                                  borderRadius: 3,
                                }}
                              />
                            </View>
                          </View>
                        );
                      }

                      if (muscleView === 'strength') {
                        const strength = data.current.muscleStrength?.[muscle];
                        if (!strength) return null;

                        return (
                          <View
                            key={muscle}
                            style={{
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <Text style={[typography.body, { color: colors.textPrimary }]}>
                              {muscle}
                            </Text>
                            <Text style={[typography.caption, { color: colors.textSecondary }]}>
                              {Math.round(strength.daysAgo)} дн. назад ·{' '}
                              {Math.round(strength.current1RM)} кг 1RM
                            </Text>
                          </View>
                        );
                      }

                      return null;
                    })}

                  {muscleView === 'balance' &&
                    data.insights.some((i) => i.code === 'MUSCLE_IMBALANCE') && (
                      <View
                        style={{
                          marginTop: SPACING.sm,
                          padding: SPACING.sm,
                          backgroundColor: colors.warningLight,
                          borderRadius: BORDER_RADIUS.md,
                        }}
                      >
                        <Text
                          style={[typography.caption, { color: colors.warning, fontWeight: '600' }]}
                        >
                          ⚠️ Обрати внимание на дисбаланс в распределении нагрузки.
                        </Text>
                      </View>
                    )}

                  {muscleView === 'fatigue' && (
                    <Text
                      style={[
                        typography.captionSmall,
                        { color: colors.textTertiary, marginTop: SPACING.xs },
                      ]}
                    >
                      Усталость рассчитывается с учётом интенсивности и экспоненциально затухает
                      (период полураспада 3 дня).
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Недостаточно данных для анализа нагрузки на мышцы.
                </Text>
              )}
            </DetailBlock>

            {/* CI-3: Plateau Detection */}
            {data.insights.some((i) => i.code === 'PLATEAU_DETECTED') && (
              <DetailBlock
                icon={<AlertCircle size={20} color={colors.warning} />}
                title="Замедление прогресса"
                color={colors.warning}
              >
                <Text
                  style={[typography.body, { color: colors.textPrimary, marginBottom: SPACING.sm }]}
                >
                  Похоже, прогресс в основных упражнениях замедлился. Ты продолжаешь тренироваться
                  регулярно, но результаты не растут, а усилия (RPE) могут увеличиваться.
                </Text>
                <Text
                  style={[
                    typography.label,
                    { color: colors.textPrimary, marginBottom: SPACING.xs },
                  ]}
                >
                  Возможные варианты:
                </Text>
                <View style={{ gap: SPACING.xs }}>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    • Сохранить текущую нагрузку (закрепить результат)
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    • Временно не повышать вес на следующей тренировке
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    • Изменить диапазон повторов (rep range)
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    • Рассмотреть альтернативное упражнение
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    • Рассмотреть разгрузочную неделю (deload), если есть признаки усталости
                  </Text>
                </View>
              </DetailBlock>
            )}

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
                  <Text
                    style={[
                      typography.caption,
                      { color: colors.textSecondary, marginTop: SPACING.xs },
                    ]}
                  >
                    Отмечено за {data.current.readiness.daysLogged} дней
                  </Text>
                </>
              ) : (
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Недостаточно данных readiness для анализа. Отмечай самочувствие ежедневно для
                  точных выводов.
                </Text>
              )}
              {data.current.pain.count > 0 && (
                <View
                  style={{
                    marginTop: SPACING.sm,
                    padding: SPACING.sm,
                    backgroundColor: colors.errorLight,
                    borderRadius: BORDER_RADIUS.md,
                  }}
                >
                  <Text style={[typography.caption, { color: colors.error, fontWeight: '600' }]}>
                    ⚠️ {data.current.pain.count} событий боли за неделю
                  </Text>
                </View>
              )}
            </DetailBlock>

            {/* Кнопка свернуть */}
            <TouchableOpacity
              onPress={toggleExpand}
              style={{
                marginTop: SPACING.md,
                paddingVertical: SPACING.md,
                alignItems: 'center',
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}
              accessibilityRole="button"
              accessibilityLabel="Свернуть детали недели"
            >
              <Text style={[typography.label, { color: colors.primary, fontWeight: '600' }]}>
                Свернуть
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </AppCard>
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
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.sm,
          marginBottom: SPACING.sm,
        }}
      >
        {icon}
        <Text style={[typography.labelBold, { color: colors.textPrimary }]}>{title}</Text>
      </View>
      <View style={{ paddingLeft: SPACING.xl, borderLeftWidth: 2, borderLeftColor: color + '40' }}>
        {children}
      </View>
    </View>
  );
}
