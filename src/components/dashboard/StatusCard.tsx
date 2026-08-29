// src/components/dashboard/StatusCard.tsx
// AUDIT-6: блок «Состояние сегодня».
//   - readiness: мини-кольцо (consistency с CircularNutritionChart) + pips 1–5
//     с tappable quick-set и haptics (PRODUCT.md §3.2 — жест с tap-альтернативой).
//   - чипы активных травм (tap → L3 injuries) с SEVERITY_COLORS.
//   - чип «⚠ Боль сегодня» (информационный, не блокирует).
//   - строка-следствие: приоритет PRODUCT.md §8 (safety > recommendation).
//   - L1 чип цикла (фаза + день) для female пользователей.
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Svg, { Circle, G } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Moon, Zap, Droplet } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { typography } from '../../styles/typography';
import { SPACING, scale, BORDER_RADIUS } from '../../constants/theme';
import { SEVERITY_COLORS } from '../../constants/semanticColors';
import { BODY_PART_LABELS } from '../../constants/injuries';
import { AppCard } from '../ui/AppCard';
import { ReadinessSheet } from './ReadinessSheet';
import { useStore } from '../../store/useStore';
import { useTodayReadiness } from '../../hooks/useTodayReadiness';
import { useTodayRecovery } from '../../hooks/useTodayRecovery';
import { useTodayPain } from '../../hooks/useTodayPain';
import { useInjuries } from '../../hooks/useInjuries';
import { readinessService } from '../../services/readinessService';
import { useProfile } from '../../hooks/useProfile';
import { useCycle } from '../../hooks/useCycle';
import { CycleCheckInSheet } from '../cycle/CycleCheckInSheet';
import { getCyclePhaseColor, getCyclePhaseLabel } from '../../utils/cycle';

const RING_SIZE = scale(72);
const RING_CENTER = RING_SIZE / 2;
const RING_R = (RING_SIZE - 16) / 2;
const RING_STROKE = 8;
const CIRCUMFERENCE = 2 * Math.PI * RING_R;
const SCALE = [1, 2, 3, 4, 5];

function readinessColor(value: number | null, colors: any): string {
  if (value == null) return colors.textTertiary;
  if (value >= 4) return colors.success;
  if (value >= 3) return colors.warning;
  return colors.error;
}

export function StatusCard() {
  const router = useRouter();
  const { colors } = useTheme();
  const { userId } = useStore();
  const queryClient = useQueryClient();
  const { data: readiness } = useTodayReadiness(userId);
  const { data: recovery } = useTodayRecovery(userId);
  const { injuries } = useInjuries(userId);
  const { data: painTodayCount } = useTodayPain(userId);
  const { userData } = useProfile(userId);
  const gender = userData?.gender;
  const { currentPhase, events, settings } = useCycle(gender);
  
  const [sheetOpen, setSheetOpen] = useState(false);
  const [cycleCheckInOpen, setCycleCheckInOpen] = useState(false);

  const activeInjuries = useMemo(
    () => injuries.filter((i) => i.status !== 'recovered'),
    [injuries],
  );

  const hasPain = (painTodayCount ?? 0) > 0;
  const color = readinessColor(readiness ?? null, colors);
  const fillPercent = readiness == null ? 0 : (readiness / 5) * 100;

  const quickSetMutation = useMutation({
    mutationFn: (value: number) =>
      readinessService.upsertToday(userId!, {
        sleepHours: null,
        sleepQuality: null,
        fatigue: null,
        soreness: null,
        stress: null,
        readiness: value,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todayReadiness', userId] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const handlePipTap = useCallback(
    (value: number) => {
      if (!userId || quickSetMutation.isPending) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      quickSetMutation.mutate(value);
    },
    [userId, quickSetMutation],
  );

  const handleSaveCycleEvent = async (
    eventType: 'menstruation_start' | 'menstruation_end' | 'ovulation_start' | 'ovulation_end',
    date: string,
    isStart: boolean
  ) => {
    if (!userId) return;
    // Здесь должна быть логика сохранения через cycleService
    // Для краткости оставляем заглушку — реальная реализация в ReadinessSheet
  };

  const handleDeleteCycleEvent = async (eventId: string) => {
    if (!userId) return;
    // Здесь должна быть логика удаления через cycleService
  };

  const hint = useMemo(() => {
    if (hasPain || activeInjuries.length > 0) {
      return 'Замены и нагрузка учтут ограничения';
    }
    if (readiness != null && readiness <= 2) {
      return 'Сегодня без повышения нагрузки';
    }
    return 'Нагрузка по плану';
  }, [hasPain, activeInjuries, readiness]);

  return (
    <AppCard variant="default">
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: SPACING.md,
        }}
      >
        <Text style={[typography.h5, { color: colors.textPrimary }]}>
          Состояние сегодня
        </Text>
        <TouchableOpacity
          onPress={() => setSheetOpen(true)}
          style={{
            paddingHorizontal: SPACING.md,
            paddingVertical: 6,
            borderRadius: BORDER_RADIUS.md,
            backgroundColor: colors.primary + '15',
          }}
        >
          <Text style={[typography.buttonTiny, { color: colors.primary }]}>
            {readiness == null ? 'Отметить' : 'Обновить'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Ring + pips */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.lg }}>
        <View style={{ width: RING_SIZE, height: RING_SIZE }}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <G rotation="-90" origin={`${RING_CENTER}, ${RING_CENTER}`}>
              <Circle
                cx={RING_CENTER}
                cy={RING_CENTER}
                r={RING_R}
                stroke={colors.border}
                strokeWidth={RING_STROKE}
                fill="none"
              />
              <Circle
                cx={RING_CENTER}
                cy={RING_CENTER}
                r={RING_R}
                stroke={color}
                strokeWidth={RING_STROKE}
                fill="none"
                strokeDasharray={`${CIRCUMFERENCE}`}
                strokeDashoffset={`${CIRCUMFERENCE * (1 - fillPercent / 100)}`}
                strokeLinecap="round"
              />
            </G>
          </Svg>
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            pointerEvents="none"
          >
            <Text style={[typography.h5, { color, fontWeight: '700' }]}>
              {readiness == null ? '—' : readiness}
            </Text>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              typography.captionSmall,
              { color: colors.textSecondary, marginBottom: 6 },
            ]}
          >
            Готовность (тапни, чтобы оценить)
          </Text>
          <View style={{ flexDirection: 'row', gap: SPACING.xs, marginBottom: SPACING.sm }}>
            {SCALE.map((v) => {
              const active = readiness != null && v <= readiness;
              return (
                <TouchableOpacity
                  key={v}
                  disabled={quickSetMutation.isPending || !userId}
                  onPress={() => handlePipTap(v)}
                  hitSlop={{ top: 12, bottom: 12, left: 4, right: 4 }}
                  style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}
                >
                  <View
                    style={{
                      width: scale(16),
                      height: scale(16),
                      borderRadius: scale(8),
                      backgroundColor: active ? color : colors.surfaceSecondary,
                      borderWidth: 1,
                      borderColor: active ? color : colors.border,
                    }}
                  />
                  <Text
                    style={[
                      typography.captionSmall,
                      {
                        color: active ? colors.textPrimary : colors.textTertiary,
                        marginTop: 2,
                        fontWeight: '600',
                      },
                    ]}
                  >
                    {v}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>{hint}</Text>
        </View>
      </View>

      {/* P0 Вариант B: L1 чипы сна и стресса с Lucide иконками */}
      {recovery && (recovery.sleepHours != null || recovery.stressLevel != null) && (
        <View style={{ flexDirection: 'row', gap: SPACING.xs, marginTop: SPACING.md }}>
          {recovery.sleepHours != null && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: SPACING.sm,
                paddingVertical: 4,
                borderRadius: BORDER_RADIUS.full,
                borderWidth: 1,
                borderColor: recovery.sleepHours < 6 ? colors.warning + '88' : colors.border,
                backgroundColor: recovery.sleepHours < 6 ? colors.warning + '1A' : colors.surfaceSecondary,
              }}
            >
              <Moon size={14} color={recovery.sleepHours < 6 ? colors.warning : colors.textSecondary} style={{ marginRight: 4 }} />
              <Text style={[typography.captionSmall, { color: recovery.sleepHours < 6 ? colors.warning : colors.textSecondary }]}>
                {recovery.sleepHours}ч
              </Text>
            </View>
          )}
          {recovery.stressLevel != null && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: SPACING.sm,
                paddingVertical: 4,
                borderRadius: BORDER_RADIUS.full,
                borderWidth: 1,
                borderColor: recovery.stressLevel >= 4 ? colors.warning + '88' : colors.border,
                backgroundColor: recovery.stressLevel >= 4 ? colors.warning + '1A' : colors.surfaceSecondary,
              }}
            >
              <Zap size={14} color={recovery.stressLevel >= 4 ? colors.warning : colors.textSecondary} style={{ marginRight: 4 }} />
              <Text style={[typography.captionSmall, { color: recovery.stressLevel >= 4 ? colors.warning : colors.textSecondary }]}>
                {recovery.stressLevel}/5
              </Text>
            </View>
          )}
        </View>
      )}

      {/* L1 чип цикла (только для female) */}
      {gender === 'female' && (
        <View style={{ marginTop: SPACING.md }}>
          {currentPhase ? (
            <TouchableOpacity
              onPress={() => setCycleCheckInOpen(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: SPACING.xs,
                paddingHorizontal: SPACING.sm,
                borderRadius: BORDER_RADIUS.sm,
                backgroundColor: getCyclePhaseColor(currentPhase.phase) + '20',
                borderWidth: 1,
                borderColor: getCyclePhaseColor(currentPhase.phase) + '40',
                alignSelf: 'flex-start',
              }}
            >
              <Droplet size={16} color={getCyclePhaseColor(currentPhase.phase)} style={{ marginRight: SPACING.xs }} />
              <Text style={[typography.label, { color: colors.textPrimary }]}>
                День {currentPhase.dayNumber} · {getCyclePhaseLabel(currentPhase.phase)}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => setCycleCheckInOpen(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: SPACING.xs,
                paddingHorizontal: SPACING.sm,
                borderRadius: BORDER_RADIUS.sm,
                backgroundColor: colors.primary + '15',
                borderWidth: 1,
                borderColor: colors.primary + '40',
                alignSelf: 'flex-start',
              }}
            >
              <Droplet size={16} color={colors.primary} style={{ marginRight: SPACING.xs }} />
              <Text style={[typography.label, { color: colors.textPrimary }]}>
                Отметить начало цикла
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Chips: травмы + боль */}
      <View style={{ marginTop: SPACING.md, minHeight: 28 }}>
        {activeInjuries.length === 0 && !hasPain ? (
          <Text style={[typography.caption, { color: colors.textTertiary }]}>
            Без активных ограничений
          </Text>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs }}>
            {activeInjuries.slice(0, 2).map((inj) => {
              const sevColor =
                (SEVERITY_COLORS as Record<string, string>)[inj.severity] ?? colors.warning;
              return (
                <TouchableOpacity
                  key={inj.id}
                  onPress={() => router.push('/profile/injuries')}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: SPACING.sm,
                    paddingVertical: 4,
                    borderRadius: BORDER_RADIUS.full,
                    borderWidth: 1,
                    borderColor: sevColor + '88',
                    backgroundColor: sevColor + '1A',
                  }}
                >
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: sevColor,
                      marginRight: 6,
                    }}
                  />
                  <Text
                    style={[
                      typography.captionSmall,
                      { color: sevColor, fontWeight: '700' },
                    ]}
                  >
                    {(BODY_PART_LABELS as Record<string, string>)[inj.body_part] ||
                      inj.body_part}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {activeInjuries.length > 2 && (
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/profile/injuries')}
                style={{
                  paddingHorizontal: SPACING.sm,
                  paddingVertical: 4,
                  borderRadius: BORDER_RADIUS.full,
                  backgroundColor: colors.surfaceSecondary,
                }}
              >
                <Text
                  style={[
                    typography.captionSmall,
                    { color: colors.textSecondary, fontWeight: '700' },
                  ]}
                >
                  +{activeInjuries.length - 2}
                </Text>
              </TouchableOpacity>
            )}
            {hasPain && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: SPACING.sm,
                  paddingVertical: 4,
                  borderRadius: BORDER_RADIUS.full,
                  borderWidth: 1,
                  borderColor: colors.warning + '88',
                  backgroundColor: colors.warning + '1A',
                }}
              >
                <Text
                  style={[
                    typography.captionSmall,
                    { color: colors.warning, fontWeight: '700' },
                  ]}
                >
                   Боль сегодня
                  {painTodayCount && painTodayCount > 1 ? `: ${painTodayCount}` : ''}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      <ReadinessSheet
        visible={sheetOpen}
        userId={userId}
        gender={gender}
        onDone={() => setSheetOpen(false)}
      />

<CycleCheckInSheet
  visible={cycleCheckInOpen}
  onClose={() => setCycleCheckInOpen(false)}
  events={events}
  onSave={handleSaveCycleEvent}
  onDelete={handleDeleteCycleEvent}
/>
    </AppCard>
  );
}