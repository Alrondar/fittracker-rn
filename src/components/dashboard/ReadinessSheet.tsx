// src/components/dashboard/ReadinessSheet.tsx
// FEAT-1.8: чек-ин состояния перед тренировкой (раз в день).
// RD-UX (30.09): шкалы 1–5 с обратной полярностью заменены вербальными
// чипами (mapping — единый владелец src/constants/readinessScales.ts).
// Пустой state: ничего не предвыбрано; в БД уходят только отвеченные поля
// (patch-семантика upsertToday), readiness считается общей формулой
// calculateReadinessFromDetails — прежняя локальная формула удалена как
// второй источник истины.
import React, { useState, useCallback } from 'react';
import { View, Text, Modal, TextInput, ActivityIndicator } from 'react-native';
import { feedback } from '../../lib/feedback';
import { PressableScale } from '../ui/PressableScale';
import { Droplet } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { SheetShell } from '../ui/SheetShell';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS, withAlpha } from '../../constants/theme';
import { typography } from '../../styles/typography';
import {
  SLEEP_QUALITY_SCALE,
  ENERGY_SCALE,
  SORENESS_SCALE,
  STRESS_SCALE,
  readinessLabel,
  type ReadinessScale,
} from '../../constants/readinessScales';
import { calculateReadinessFromDetails } from '../../utils/readiness';
import { mapError } from '../../utils/errorMapper';
import { readinessService } from '../../services/readinessService';
import { cycleService } from '../../services/cycleService';
import { useCycle } from '../../hooks/useCycle';
import { useQueryClient } from '@tanstack/react-query';
import { CycleCheckInSheet } from '../cycle/CycleCheckInSheet';

function ChipScale({
  scale,
  value,
  onChange,
  colors,
}: {
  scale: ReadinessScale;
  value: number | null;
  onChange: (v: number) => void;
  colors: any;
}) {
  return (
    <View style={{ marginBottom: SPACING.md }}>
      <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.xs }]}>
        {scale.label}
      </Text>
      <View style={{ flexDirection: 'row', gap: SPACING.xs }}>
        {scale.options.map((opt) => {
          const active = value === opt.value;
          return (
            <PressableScale
              key={opt.label}
              onPress={() => onChange(opt.value)}
              accessibilityRole="button"
              accessibilityLabel={`${scale.label}: ${opt.label}`}
              style={{
                flex: 1,
                minHeight: 44,
                paddingVertical: SPACING.sm,
                paddingHorizontal: SPACING.xs,
                borderRadius: BORDER_RADIUS.md,
                borderWidth: active ? 2 : 1,
                borderColor: active ? colors.primary : colors.border,
                backgroundColor: active
                  ? withAlpha(colors.primary, 0.125)
                  : colors.surfaceSecondary,
              }}
            >
              <Text
                style={[
                  typography.captionSmall,
                  {
                    color: active ? colors.primary : colors.textSecondary,
                    fontWeight: '700',
                    textAlign: 'center',
                  },
                ]}
                numberOfLines={2}
              >
                {opt.label}
              </Text>
            </PressableScale>
          );
        })}
      </View>
      {value === null && (
        <Text
          style={[typography.captionSmall, { color: colors.textTertiary, marginTop: SPACING.xs }]}
        >
          не отмечено
        </Text>
      )}
    </View>
  );
}

interface ReadinessSheetProps {
  visible: boolean;
  userId: string | null;
  gender?: string | null;
  onDone: (proceed: boolean) => void;
}

export function ReadinessSheet({ visible, userId, gender, onDone }: ReadinessSheetProps) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  // CYC-1 (29.09): реальные события цикла — иначе из этой шторки никогда не
  // видны «Обновить/Удалить отметку» (шторка строит их по events).
  const { events: cycleEvents } = useCycle(gender);

  const [cycleCheckInOpen, setCycleCheckInOpen] = useState(false);

  const handleSaveCycleEvent = async (eventType: any, date: string, isStart: boolean) => {
    if (!userId) return;
    const actualEventType = isStart ? eventType : (eventType.replace('_start', '_end') as any);
    await cycleService.upsertCycleEvent(userId, actualEventType, date);
    queryClient.invalidateQueries({ queryKey: ['cycleEvents', userId] });
  };

  const handleDeleteCycleEvent = async (eventId: string) => {
    if (!userId) return;
    await cycleService.deleteCycleEvent(eventId);
    queryClient.invalidateQueries({ queryKey: ['cycleEvents', userId] });
  };
  // RD-UX: пустой старт — null = «не отмечено», дефолтные 3 больше не пишутся.
  const [sleepHours, setSleepHours] = useState('');
  const [sleepQuality, setSleepQuality] = useState<number | null>(null);
  // ENERGY_SCALE.value — это fatigue для БД (1 — свежий), семантика колонки не менялась.
  const [fatigue, setFatigue] = useState<number | null>(null);
  const [soreness, setSoreness] = useState<number | null>(null);
  const [stress, setStress] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const parsedSleep = parseFloat(sleepHours.replace(',', '.'));
  // DB CHECK: sleep_hours numeric(3,1) 0..24 — за границей Postgres отдаёт
  // сырую ошибку 23514 прямо в алерт. Не клампим молча: считаем ввод
  // недействительным и подсвечиваем под полем.
  const sleepInvalid = Number.isFinite(parsedSleep) && (parsedSleep < 0 || parsedSleep > 24);
  const sleepHoursValue = Number.isFinite(parsedSleep) && !sleepInvalid ? parsedSleep : null;
  const answeredCount =
    (sleepHoursValue !== null ? 1 : 0) +
    (sleepQuality !== null ? 1 : 0) +
    (fatigue !== null ? 1 : 0) +
    (soreness !== null ? 1 : 0) +
    (stress !== null ? 1 : 0);
  // Единая формула (utils/readiness.ts) — превью и service-автопуть считают одно и то же.
  const readiness = calculateReadinessFromDetails(
    sleepHoursValue,
    sleepQuality,
    stress,
    soreness,
    fatigue
  );
  const readinessColor =
    readiness == null
      ? colors.textTertiary
      : readiness <= 2
        ? colors.error
        : readiness === 3
          ? colors.warning
          : colors.success;

  const handleSave = useCallback(async () => {
    if (!userId) {
      onDone(true);
      return;
    }
    if (answeredCount === 0) {
      feedback.alert('Ничего не отмечено', 'Отметь хотя бы один пункт — или нажми «Пропустить»');
      return;
    }
    setSaving(true);
    try {
      // readiness не отправляем: upsertToday досчитает его той же общей формулой
      // (единый владелец) и включит в patch только отвеченные поля.
      await readinessService.upsertToday(userId, {
        sleepHours: sleepHoursValue,
        sleepQuality,
        fatigue,
        soreness,
        stress,
        readiness: null,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // AUDIT-6: инвалидация кэша, чтобы StatusCard и ContextInsightCard
      // обновились сразу после сохранения check-in.
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['todayReadiness', userId] });
        // VF-9: sleep/stress читаются движком через ['todayRecovery'] — инвалидировать вместе
        queryClient.invalidateQueries({ queryKey: ['todayRecovery', userId] });
      }
      if (readiness !== null && readiness <= 2) {
        feedback.alert(
          'Готовность низкая',
          'Сегодня лучше снизить рабочие веса ~на 10% или выбрать лёгкие варианты упражнений'
        );
      }
      onDone(true);
    } catch (e: any) {
      // CLAUDE.md §2: user-facing errors — через mapError, сырой строки из
      // Supabase не показываем.
      feedback.alert('Ошибка', mapError(e));
    } finally {
      setSaving(false);
    }
  }, [
    userId,
    answeredCount,
    sleepHoursValue,
    sleepQuality,
    fatigue,
    soreness,
    stress,
    readiness,
    onDone,
    queryClient,
  ]);

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={() => onDone(true)}>
      <SheetShell isModal title="Как ты сегодня?" onClose={() => onDone(true)}>
        <Text
          style={[typography.caption, { color: colors.textSecondary, marginBottom: SPACING.md }]}
        >
          30 секунд — и тренировка адаптируется под твоё состояние. Отмечай только то, что знаешь:
          неотмеченное не сохраняется.
        </Text>

        <Text
          style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.sm }]}
        >
          Сон, часов
        </Text>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: BORDER_RADIUS.md,
            backgroundColor: colors.surfaceSecondary,
            color: colors.textPrimary,
            padding: SPACING.md,
            marginBottom: SPACING.xs,
          }}
          keyboardType="decimal-pad"
          value={sleepHours}
          onChangeText={setSleepHours}
          placeholder="например, 7"
          placeholderTextColor={colors.textTertiary}
        />
        {sleepInvalid && (
          <Text
            style={[typography.captionSmall, { color: colors.error, marginBottom: SPACING.md }]}
          >
            Укажи значение от 0 до 24 часов
          </Text>
        )}
        {sleepHoursValue !== null && sleepHoursValue < 6 && (
          <Text
            style={[typography.captionSmall, { color: colors.warning, marginBottom: SPACING.md }]}
          >
            ⚠ Менее 6ч сна — система не предложит повышение веса
          </Text>
        )}

        <ChipScale
          scale={SLEEP_QUALITY_SCALE}
          value={sleepQuality}
          onChange={setSleepQuality}
          colors={colors}
        />
        <ChipScale scale={ENERGY_SCALE} value={fatigue} onChange={setFatigue} colors={colors} />
        <ChipScale scale={SORENESS_SCALE} value={soreness} onChange={setSoreness} colors={colors} />
        <ChipScale scale={STRESS_SCALE} value={stress} onChange={setStress} colors={colors} />
        {stress !== null && stress >= 4 && (
          <Text
            style={[typography.captionSmall, { color: colors.warning, marginBottom: SPACING.md }]}
          >
            ⚠ Высокий стресс — закрепляем вес для безопасности
          </Text>
        )}

        {gender === 'female' && (
          <View
            style={{
              marginTop: SPACING.md,
              paddingTop: SPACING.md,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            <PressableScale
              onPress={() => setCycleCheckInOpen(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: SPACING.md,
                borderRadius: BORDER_RADIUS.md,
                backgroundColor: withAlpha(colors.primary, 0.082),
                borderWidth: 1,
                borderColor: withAlpha(colors.primary, 0.251),
              }}
            >
              <Droplet size={20} color={colors.primary} style={{ marginRight: SPACING.xs }} />
              <Text style={[typography.labelBold, { color: colors.primary }]}>Отметить цикл</Text>
            </PressableScale>
          </View>
        )}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: SPACING.sm,
            marginBottom: SPACING.lg,
          }}
        >
          <Text style={[typography.labelBold, { color: colors.textPrimary }]}>Готовность</Text>
          {readiness == null ? (
            <Text style={[typography.caption, { color: colors.textTertiary }]}>
              отметь хотя бы одно поле
            </Text>
          ) : (
            <Text style={[typography.h3, { color: readinessColor, fontWeight: '800' }]}>
              {readiness}/5 · {readinessLabel(readiness)}
            </Text>
          )}
        </View>

        <PressableScale
          onPress={handleSave}
          disabled={saving || answeredCount === 0}
          style={{
            paddingVertical: SPACING.md,
            borderRadius: BORDER_RADIUS.lg,
            backgroundColor: answeredCount === 0 ? colors.surfaceSecondary : readinessColor,
            alignItems: 'center',
            opacity: answeredCount === 0 ? 0.6 : 1,
          }}
          haptic="none"
        >
          {saving ? (
            <ActivityIndicator color={colors.textInverse} size="small" />
          ) : (
            <Text
              style={[
                typography.button,
                { color: answeredCount === 0 ? colors.textTertiary : colors.textInverse },
              ]}
            >
              Сохранить
            </Text>
          )}
        </PressableScale>
        <PressableScale
          onPress={() => onDone(true)}
          style={{ marginTop: SPACING.sm, paddingVertical: SPACING.md, alignItems: 'center' }}
        >
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Пропустить</Text>
        </PressableScale>

        <CycleCheckInSheet
          visible={cycleCheckInOpen}
          onClose={() => setCycleCheckInOpen(false)}
          events={cycleEvents}
          onSave={handleSaveCycleEvent}
          onDelete={handleDeleteCycleEvent}
        />
      </SheetShell>
    </Modal>
  );
}
