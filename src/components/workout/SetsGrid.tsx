// src/components/workout/SetsGrid.tsx
// Сетка подходов + чипы RPE + прогрессия (FEAT-1.1) + автостарт отдыха (FEAT-1.2).
// 05.08.2026: инлайн-дубли чипа/ползунка удалены — используются SetFeedbackChip
// и SetFeedbackEditor из SetFeedbackControl.tsx (FEAT-7 v2, тапабельная шкала).
// 06.08.2026 (FEAT-1.1 v2): хинт показывает прошлые данные АКТИВНОГО сета (первого
// незавершённого) и переключается по мере заполнения; прогрессия — чипами
// +2.5/+5/+10/+15/+20 в активный сет; custom-ввод удалён.
// 06.08.2026: чипы в текущих единицах (кг → кг-шаги, lb → реальные lb-номиналы);
// возвращена ручная кнопка «Отдых N с» как фолбэк автостарта (FEAT-1.2).
import { useState, useRef, useMemo, memo, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { TrendingUp, Clock, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { createCardStyles } from '../../styles/components/card';
import { SetData, SetFeedbackPatch, UserRejectionReason } from '../../types/workout';
import { useTimerSettings } from '../../hooks/useTimerSettings';
import { useRpeSettings } from '../../hooks/useRpeSettings';
import { useRecommendationFeedback } from '../../hooks/useRecommendationFeedback';

import {
  WeightUnit,
  weightToDisplay,
  weightFromDisplay,
  weightPlaceholder,
} from '../../hooks/useUnitPreferences';
import { SetFeedbackChip, SetFeedbackEditor } from './SetFeedbackControl';
import {
  calculateProgression,
  explainProgression,
  applySafetyPrecedence,
  applyReadinessContext,
  ProgressionResult,
  ExplanationItem,
  SafetyContext,
  SafetyOverride,
  ReadinessContext,
  ReadinessOverride,
} from '../../engine/progression';
import { RecommendationCard } from './RecommendationCard';

// COACH-3: фиксированный набор причин отклонения (ROADMAP C2).
// Коды — machine-readable (для аналитики), лейблы — user-facing.
const REJECTION_REASONS: { code: UserRejectionReason; label: string }[] = [
  { code: 'tired', label: 'устал' },
  { code: 'too_heavy', label: 'слишком тяжело' },
  { code: 'pain', label: 'боль' },
  { code: 'want_easier', label: 'хочу легче' },
  { code: 'other', label: 'другое' },
];

// COACH-3: состояние prompt-а причины отклонения.
// 'idle' — ничего не спрашиваем; 'reasonPrompt' — показываем чипы причин;
// 'resolved' — ответ записан, prompt скрыт.
type FeedbackState =
  | { status: 'idle' }
  | { status: 'reasonPrompt' }
  | { status: 'resolved' };

// Чистая функция вне компонента — не зависит от props/state.
const getSetRowsConfig = (total: number): number[] => {
  if (total <= 4) return [total];
  if (total === 5) return [3, 2];
  if (total === 6) return [3, 3];
  if (total === 7) return [4, 3];
  if (total === 8) return [4, 4];
  if (total === 9) return [3, 3, 3];
  if (total === 10) return [4, 3, 3];
  if (total === 11) return [4, 4, 3];
  if (total === 12) return [4, 4, 4];
  return [3];
};

// ============================================================================
// SET INPUT (вес/повторы)
// ============================================================================
interface SetInputProps {
  value: string;
  placeholder: string;
  keyboardType: 'decimal-pad' | 'number-pad';
  completed: boolean;
  onChangeText: (v: string) => void;
  colors: any;
  cardStyles: ReturnType<typeof createCardStyles>;
}

const SetInput = memo(function SetInput({
  value,
  placeholder,
  keyboardType,
  completed,
  onChangeText,
  colors,
  cardStyles,
}: SetInputProps) {
  const [local, setLocal] = useState(value);
  const focusedRef = useRef(false);
  const lastSentRef = useRef(value);

  useEffect(() => {
    if (focusedRef.current) return;
    if (value !== lastSentRef.current) {
      setLocal(value);
      lastSentRef.current = value;
    }
  }, [value]);

  const isFilled = local.trim() !== '';

  return (
    <View
      style={[
        cardStyles.setInputContainer,
        {
          backgroundColor:
            isFilled || completed ? colors.successLight : colors.surfaceSecondary,
        },
      ]}
    >
      <TextInput
        style={[cardStyles.setInput, { color: colors.textPrimary }]}
        placeholder={placeholder}
        value={local}
        onChangeText={(v) => {
          setLocal(v);
          lastSentRef.current = v;
        }}
        onFocus={() => {
          focusedRef.current = true;
        }}
        onBlur={() => {
          focusedRef.current = false;
          onChangeText(local);
        }}
        keyboardType={keyboardType}
        placeholderTextColor={colors.textTertiary}
        blurOnSubmit={false}
      />
    </View>
  );
});

// ============================================================================
// SET ROW (вынесен в memo для предотвращения ре-рендеров)
// ============================================================================
interface SetRowProps {
  rowSets: SetData[];
  startIndex: number;
  rowIndex: number;
  exerciseIndex: number;
  updateSet: (exIndex: number, setIndex: number, field: 'weight' | 'reps', value: string) => void;
  isSetCompleted: (set: SetData) => boolean;
  unit: WeightUnit;
  toDisplay: (kg: string) => string;
  fromDisplay: (disp: string) => string;
  colors: any;
  cardStyles: ReturnType<typeof createCardStyles>;
  onOpenFeedback: (setIndex: number) => void;
  // ENG-13: toggle warmup flag for a set
  onToggleWarmup: (setIndex: number) => void;
  // UX-7: predicate для показа чипа RPE (already-filled всегда показываются)
  shouldShowRpeChip: (set: SetData, setIndex: number) => boolean;
}

const SetRow = memo(function SetRow({
  rowSets,
  startIndex,
  rowIndex,
  exerciseIndex,
  updateSet,
  isSetCompleted,
  unit,
  toDisplay,
  fromDisplay,
  colors,
  cardStyles,
  onOpenFeedback,
  onToggleWarmup,
  shouldShowRpeChip,
}: SetRowProps) {
  return (
    <View key={rowIndex} style={cardStyles.setRow}>
      <View style={cardStyles.setNumbersRow}>
        {rowSets.map((_, si) => (
          <View key={si} style={cardStyles.setNumber}>
            <Text style={[cardStyles.setNumberText, { color: colors.textPrimary }]}>
              {startIndex + si + 1}
            </Text>
          </View>
        ))}
      </View>

      <View style={cardStyles.setInputsRow}>
        {rowSets.map((set, si) => (
          <SetInput
            key={`w-${startIndex + si}-${unit}`}
            value={toDisplay(set.weight)}
            placeholder={weightPlaceholder(unit)}
            keyboardType="decimal-pad"
            completed={isSetCompleted(set)}
            onChangeText={(v) =>
              updateSet(exerciseIndex, startIndex + si, 'weight', fromDisplay(v))
            }
            colors={colors}
            cardStyles={cardStyles}
          />
        ))}
      </View>
      <View style={cardStyles.setInputsRow}>
        {rowSets.map((set, si) => (
          <SetInput
            key={`r-${startIndex + si}-${unit}`}
            value={set.reps}
            placeholder="повт."
            keyboardType="number-pad"
            completed={isSetCompleted(set)}
            onChangeText={(v) => updateSet(exerciseIndex, startIndex + si, 'reps', v)}
            colors={colors}
            cardStyles={cardStyles}
          />
        ))}
      </View>
      <View style={cardStyles.setInputsRow}>
        {rowSets.map((set, si) => (
          <View key={`fb-${startIndex + si}`} style={{ flex: 1, minWidth: 0, gap: 4 }}>
            {shouldShowRpeChip(set, startIndex + si) && (
              <SetFeedbackChip
                rpe={set.rpe ?? null}
                onPress={() => onOpenFeedback(startIndex + si)}
                colors={colors}
              />
            )}
            {/* ENG-13: Warmup chip — toggle per-set warmup flag */}
            <TouchableOpacity
              onPress={() => onToggleWarmup(startIndex + si)}
              activeOpacity={0.7}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: SPACING.xs,
                paddingVertical: 4,
                borderRadius: BORDER_RADIUS.sm,
                backgroundColor: set.isWarmup ? colors.primary : colors.surfaceSecondary,
                borderWidth: 1,
                borderColor: set.isWarmup ? colors.primary : colors.border,
              }}
            >
              <Text
                style={[
                  typography.captionSmall,
                  {
                    color: set.isWarmup ? colors.textInverse : colors.textSecondary,
                    fontWeight: '600',
                  },
                ]}
              >
                Разминка
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
});

// ============================================================================
// SETS GRID (основной компонент)
// ============================================================================
interface SetsGridProps {
  exerciseIndex: number;
  sets: SetData[];
  /** ENG-13: базовое количество подходов (до пометки разминочными) для расчёта автодобавления. */
  targetSets: number;
  restSeconds: number;
  /** ENG-1: диапазон повторов для прогрессии. null = no target (fallback to RPE only). */
  repsRange?: string | null;
  /** ENG-4: safety context (pain/injury). Engine применяет precedence к рекомендации. */
  safetyContext?: SafetyContext | null;
  /** ENG-3: readiness context (optional signal). Применяется после safety. */
  readinessContext?: ReadinessContext | null;
  unit: WeightUnit;
  updateSet: (exIndex: number, setIndex: number, field: 'weight' | 'reps', value: string) => void;
  updateSetFeedback: (exIndex: number, setIndex: number, patch: SetFeedbackPatch) => void;
  /** ENG-13: добавить новый сет (для warmup toggle auto-add) */
  addSet: (exerciseIndex: number) => void;
  // FEAT-1.1 v2: прогрессия пер-сет через updateSet; applyProgression оставлен
  // в сигнатуре опционально для совместимости с ExerciseCard (не вызывается).
  applyProgression?: (exerciseIndex: number, newWeight: number) => void;
  isSetCompleted: (set: SetData) => boolean;
  startRestTimer: (seconds: number) => void;
  colors: any;
  cardStyles: ReturnType<typeof createCardStyles>;
  // COACH-3: идентификаторы для записи feedback (пробрасываются из ExerciseCard).
  workoutId: string;
  exerciseId: string;
}

export const SetsGrid = memo(function SetsGrid({
  exerciseIndex,
  sets,
  targetSets,
  restSeconds,
  repsRange,
  safetyContext,
  readinessContext,
  unit,
  updateSet,
  updateSetFeedback,
  addSet,
  isSetCompleted,
  startRestTimer,
  colors,
  cardStyles,
  workoutId,
  exerciseId,
}: SetsGridProps) {
  // COACH-3: fire-and-forget запись feedback (ошибки глотаются тихо).
  const { submitFeedback } = useRecommendationFeedback();
  // UX-7: настройка частоты запроса RPE
  const { settings: rpeSettings } = useRpeSettings();

  // UX-7: predicate для показа чипа RPE.
  // Уже введённое значение (rpe != null) — показываем всегда (filled style).
  // Новый запрос (rpe == null) — зависит от prompt:
  //   always   — во всех completed сетах
  //   last-set — только в последнем сете
  //   off      — не показывать (уже введённые остаются)
  const shouldShowRpeChip = useCallback(
    (set: SetData, setIndex: number): boolean => {
      if (set.rpe != null) return true;
      if (!isSetCompleted(set)) return false;
      const prompt = rpeSettings.prompt;
      if (prompt === 'off') return false;
      if (prompt === 'always') return true;
      if (prompt === 'last-set') return setIndex === sets.length - 1;
      return true;
    },
    [rpeSettings.prompt, sets.length, isSetCompleted],
  );

  const [feedbackSetIndex, setFeedbackSetIndex] = useState<number | null>(null);
  const setRowsConfig = useMemo(() => getSetRowsConfig(sets.length), [sets.length]);

  // ✅ Мемоизация вычислений
  const completedSets = useMemo(
    () => sets.filter((s) => isSetCompleted(s)).length,
    [sets, isSetCompleted],
  );
  const allSetsDone = sets.length > 0 && completedSets === sets.length;

  // FEAT-1.2: автостарт таймера отдыха
  const { settings: timerSettings } = useTimerSettings();
  const restStartedRef = useRef<number>(-1);

  useEffect(() => {
    // Сброс флага при смене упражнения
    restStartedRef.current = -1;
  }, [exerciseIndex]);

  useEffect(() => {
    const shouldStart =
      timerSettings.autoStartAfterEverySet ||
      (timerSettings.autoStartRest && allSetsDone);

    if (
      shouldStart &&
      completedSets > 0 &&
      completedSets !== restStartedRef.current &&
      restSeconds > 0
    ) {
      restStartedRef.current = completedSets;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      startRestTimer(restSeconds);
    }
  }, [
    completedSets,
    timerSettings.autoStartAfterEverySet,
    timerSettings.autoStartRest,
    allSetsDone,
    restSeconds,
    startRestTimer,
  ]);

  // ✅ Стабильные функции конвертации
  const toDisplay = useCallback(
    (kgStr: string) => weightToDisplay(kgStr, unit),
    [unit],
  );
  const fromDisplay = useCallback(
    (disp: string) => weightFromDisplay(disp, unit),
    [unit],
  );

  // ✅ Мемоизация активного сета (для редактора RPE)
  const activeSet = useMemo(
    () =>
      feedbackSetIndex !== null && feedbackSetIndex < sets.length
        ? sets[feedbackSetIndex]
        : null,
    [feedbackSetIndex, sets],
  );

  // FEAT-1.1 v2: активный сет = первый незавершённый; хинт показывает ЕГО прошлые
  // данные и переключается по мере заполнения сетов.
  const progressionSetIndex = useMemo(() => {
    const idx = sets.findIndex((s) => !isSetCompleted(s));
    return idx === -1 ? null : idx;
  }, [sets, isSetCompleted]);

  const progressionSet = progressionSetIndex !== null ? sets[progressionSetIndex] : null;
  const prevWeight = progressionSet?.previousWeight ?? null;
  const prevReps = progressionSet?.previousReps ?? null;
  const prevRpe = progressionSet?.previousRpe ?? null;

  // FEAT-1.1 v2: шаги в текущих единицах — в lb показываем реальные lb-номиналы
  // (конверсия кг-шагов, округлённая до стандартных блинов: 5/10/25/35/45)
  const PROGRESSION_STEPS = unit === 'kg' ? [2.5, 5, 10, 15, 20] : [5, 10, 25, 35, 45];

  // ✅ Чип прогрессии применяется к АКТИВНОМУ сету (пер-сет, а не ко всем)
  const handleProgressionStep = useCallback(
    (step: number) => {
      if (progressionSetIndex === null || prevWeight === null) return;
      const stepKg = parseFloat(fromDisplay(String(step))); // шаг в текущих единицах → кг
      const newKg = Math.round((prevWeight + stepKg) * 100) / 100;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      updateSet(exerciseIndex, progressionSetIndex, 'weight', String(newKg));
    },
    [progressionSetIndex, prevWeight, fromDisplay, updateSet, exerciseIndex],
  );

  // ============================================================================
  // ENG-1: детерминированная рекомендация прогрессии
  // ENG-4: safety precedence (pain/injury > recommendation)
  // ENG-13: targetSetIndex для per-set recommendation + warmup filtering
  // ============================================================================
  const recommendation = useMemo<(ProgressionResult & {
    safetyOverride?: SafetyOverride | null;
    readinessOverride?: ReadinessOverride | null;
  }) | null>(() => {
    if (sets.length === 0) return null;
    const base = calculateProgression({
      sets,
      repsRange: repsRange ?? null,
      targetSetIndex: progressionSetIndex ?? undefined,
    });
    const afterSafety = applySafetyPrecedence(base, safetyContext ?? null);
    // ENG-3: readiness — после safety (PRODUCT.md §8: боль > усталость)
    return applyReadinessContext(afterSafety, readinessContext ?? null);
  }, [sets, repsRange, safetyContext, readinessContext, progressionSetIndex]);

  // Подсветка smallest chip (+2.5 кг / +5 lb) при action=increase,
  // но НЕ при safety override (ENG-4: не предлагаем +2.5 при боли/травме)
  const highlightedChip: number | null =
    recommendation?.action === 'increase' && !recommendation?.safetyOverride
      ? (unit === 'kg' ? 2.5 : 5)
      : null;

  // Иконка + цвет рекомендации
  // ENG-4: при safety override (downgrade increase → hold) используем warning color,
  // чтобы визуально отделить от обычного hold (CONSOLIDATE/HIGH_RPE_HOLD).
  // Suppressed (no_data) — не рендерится.
  // ENG-3/ENG-4: любой системный override (safety ИЛИ readiness) использует warning color
  const isSystemDowngrade = !!(recommendation?.safetyOverride || recommendation?.readinessOverride);
  // (удалено — иконку действия рендерит RecommendationCard)
  const recommendationColor = isSystemDowngrade
    ? colors.warning
    : recommendation?.action === 'increase'
      ? colors.success
      : recommendation?.action === 'decrease'
        ? colors.warning
        : colors.primary;

  // ============================================================================
  // ENG-2 + COACH-1: recommendation UX — expand / dismiss / chips-open state
  // COACH-3: feedbackState для inline-запроса причины отклонения
  // ============================================================================
  const [expanded, setExpanded] = useState(false);
  // dismissed — скрывает recommendation на сессию (не persist — COACH-3 territory)
  const [dismissed, setDismissed] = useState(false);
  // COACH-1: chips are hidden by default and revealed by the "Изменить" button
  // inside the RecommendationCard. Reduces L1 noise (PRODUCT.md §3.3).
  const [chipsOpen, setChipsOpen] = useState(false);
  // COACH-3: состояние prompt-а причины отклонения.
  // 'reasonPrompt' показывается после «Скрыть» — inline-чипы причин + пропустить.
  const [feedbackState, setFeedbackState] = useState<FeedbackState>({ status: 'idle' });

  // Reset expand/dismiss/chipsOpen/feedbackState state when exercise changes
  useEffect(() => {
    setExpanded(false);
    setDismissed(false);
    setChipsOpen(false);
    setFeedbackState({ status: 'idle' });
  }, [exerciseIndex]);

  const explanationItems = useMemo<ExplanationItem[]>(() => {
    if (!recommendation || recommendation.action === 'no_data') return [];
    return explainProgression(recommendation);
  }, [recommendation]);

  const toggleExpanded = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded((v) => !v);
  }, []);

  // COACH-3: «Скрыть» → показываем inline-чипы причин (reasonPrompt).
  // Сам feedback запишется позже — при выборе причины или пропуске.
  const handleDismiss = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDismissed(true);
    setExpanded(false);
    setChipsOpen(false);
    // Только при наличии активного сета и валидной рекомендации показываем prompt
    if (progressionSetIndex !== null && recommendation && recommendation.action !== 'no_data') {
      setFeedbackState({ status: 'reasonPrompt' });
    } else {
      setFeedbackState({ status: 'resolved' });
    }
  }, [progressionSetIndex, recommendation]);

  // COACH-1: «Изменить» toggles visibility of progression chips (they are the
  // manual weight-adjustment tool). Chips hidden by default — lower L1 noise.
  const handleChipsToggle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setChipsOpen((v) => !v);
  }, []);

  // COACH-1: «Принять» writes suggestedWeight (+ suggestedReps if provided)
  // into the first incomplete set (progressionSetIndex). Uses the existing
  // updateSet mutation + scheduleFlush chain — no new server call,
  // no new prop drilling. After the set fills, the recommendation naturally
  // recomputes for the next incomplete set (per-set progression, FEAT-1.1 v2).
  // COACH-3: тихая запись accepted feedback (fire-and-forget).
  const handleAccept = useCallback(() => {
    if (
      progressionSetIndex === null ||
      !recommendation ||
      recommendation.action === 'no_data' ||
      recommendation.suggestedWeight == null
    ) {
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Weight: engine returns kg (storage unit) → write directly to set.weight
    // (set.weight stores kg regardless of display unit; flushPendingLogs
    // parses it as weight_kg).
    updateSet(
      exerciseIndex,
      progressionSetIndex,
      'weight',
      String(recommendation.suggestedWeight),
    );
    if (recommendation.suggestedReps != null) {
      updateSet(
        exerciseIndex,
        progressionSetIndex,
        'reps',
        String(recommendation.suggestedReps),
      );
    }
    // Close chips to reduce noise after acceptance; card stays visible until
    // the next set's recommendation is computed.
    setChipsOpen(false);

    // COACH-3: fire-and-forget запись accepted feedback.
    // appliedWeight = вес, который только что записали в сет.
    submitFeedback({
      workoutId,
      exerciseId,
      setNumber: progressionSetIndex + 1,
      decision: 'accepted',
      userReasonCode: null,
      engineAction: recommendation.action,
      engineReasonCode: recommendation.reason.code,
      suggestedWeight: recommendation.suggestedWeight,
      suggestedReps: recommendation.suggestedReps ?? null,
      appliedWeight: recommendation.suggestedWeight,
    });
  }, [
    progressionSetIndex,
    recommendation,
    exerciseIndex,
    updateSet,
    workoutId,
    exerciseId,
    submitFeedback,
  ]);

  // COACH-3: выбор причины отклонения → запись rejected + userReasonCode.
  const handleReasonSelect = useCallback(
    (reasonCode: UserRejectionReason) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (
        progressionSetIndex === null ||
        !recommendation ||
        recommendation.action === 'no_data'
      ) {
        setFeedbackState({ status: 'resolved' });
        return;
      }
      submitFeedback({
        workoutId,
        exerciseId,
        setNumber: progressionSetIndex + 1,
        decision: 'rejected',
        userReasonCode: reasonCode,
        engineAction: recommendation.action,
        engineReasonCode: recommendation.reason.code,
        suggestedWeight: recommendation.suggestedWeight ?? null,
        suggestedReps: recommendation.suggestedReps ?? null,
        appliedWeight: null,
      });
      setFeedbackState({ status: 'resolved' });
    },
    [progressionSetIndex, recommendation, workoutId, exerciseId, submitFeedback],
  );

  // COACH-3: пропустить причину → запись rejected без userReasonCode.
  const handleSkipReason = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (
      progressionSetIndex === null ||
      !recommendation ||
      recommendation.action === 'no_data'
    ) {
      setFeedbackState({ status: 'resolved' });
      return;
    }
    submitFeedback({
      workoutId,
      exerciseId,
      setNumber: progressionSetIndex + 1,
      decision: 'rejected',
      userReasonCode: null,
      engineAction: recommendation.action,
      engineReasonCode: recommendation.reason.code,
      suggestedWeight: recommendation.suggestedWeight ?? null,
      suggestedReps: recommendation.suggestedReps ?? null,
      appliedWeight: null,
    });
    setFeedbackState({ status: 'resolved' });
  }, [progressionSetIndex, recommendation, workoutId, exerciseId, submitFeedback]);

  const handleOpenFeedback = useCallback((setIndex: number) => {
    setFeedbackSetIndex(setIndex);
  }, []);

  // ENG-13: toggle warmup flag for a set
  // Auto-add new working sets to maintain the original number of working sets.
  // Formula: added sets = current warmup count (after toggle).
  // Example: target=4. Mark 1 as warmup -> +1 set (total 5: 1 warmup + 4 working).
  // Mark 2 as warmup -> +2 sets (total 6: 2 warmup + 4 working), etc.
  const handleToggleWarmup = useCallback(
    (setIndex: number) => {
      const set = sets[setIndex];
      const newIsWarmup = !set.isWarmup;
      
      // Сначала обновляем флаг
      updateSetFeedback(exerciseIndex, setIndex, { isWarmup: newIsWarmup });

      if (newIsWarmup) {
        // Считаем, сколько будет разминочных подходов ПОСЛЕ обновления
        const warmupCount = sets.filter((s, idx) => idx === setIndex || s.isWarmup).length;
        
        // Целевое общее количество подходов = базовое (targetSets) + количество разминочных
        const targetTotalSets = targetSets + warmupCount;
        
        // Сколько нужно добавить, чтобы достичь целевого количества
        const toAdd = targetTotalSets - sets.length;
        
        if (toAdd > 0) {
          for (let i = 0; i < toAdd; i++) {
            addSet(exerciseIndex);
          }
        }
      }
    },
    [sets, exerciseIndex, updateSetFeedback, addSet, targetSets],
  );

  return (
    <View
      style={[
        cardStyles.setsContainer,
        { backgroundColor: colors.surfaceSecondary, borderWidth: 0 },
      ]}
    >
      <View style={[cardStyles.setsHeader, { backgroundColor: 'transparent' }]}>
        <TrendingUp size={16} color={colors.primary} strokeWidth={2} />
        <Text style={[cardStyles.setsHeaderText, { color: colors.textPrimary }]}>
          Подходы
        </Text>
        <Text
          style={[
            typography.captionSmall,
            {
              color: allSetsDone ? colors.success : colors.textTertiary,
              fontWeight: '700',
              marginLeft: 'auto',
            },
          ]}
        >
          {allSetsDone ? '✓ ' : ''}
          {completedSets}/{sets.length}
        </Text>
      </View>

      <View style={[cardStyles.setsContent, { backgroundColor: colors.surface }]}>
        {/* FEAT-1.1 v2: хинт активного сета + чипы прогрессии */}
        {progressionSetIndex !== null && prevWeight !== null && (
          <View
            style={{
              marginBottom: SPACING.sm,
              padding: SPACING.sm,
              backgroundColor: colors.primary + '08',
              borderRadius: BORDER_RADIUS.sm,
              borderWidth: 1,
              borderColor: colors.primary + '20',
            }}
          >
            <View
              style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: SPACING.sm }}
            >
              <TrendingUp size={14} color={colors.primary} strokeWidth={2} />
              <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>
                Подход {progressionSetIndex + 1} · прошлый раз:{' '}
                <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                  {toDisplay(String(prevWeight))} {unit}
                </Text>
                {prevReps != null && (
                  <>
                    {' × '}
                    <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{prevReps}</Text>
                  </>
                )}
                {prevRpe != null && (
                  <>
                    {' · RPE '}
                    <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{prevRpe}</Text>
                  </>
                )}
              </Text>
            </View>
            {/* COACH-1: Recommendation Card (replaces ENG-2 one-liner + expandable) */}
            {recommendation && recommendation.action !== 'no_data' && !dismissed && (
            <RecommendationCard
            recommendation={recommendation}
            explanationItems={explanationItems}
            accentColor={recommendationColor}
            colors={colors}
            toDisplay={toDisplay}
            unit={unit}
            expanded={expanded}
            onToggleExpand={toggleExpanded}
            onAccept={handleAccept}
            onChange={handleChipsToggle}
            onDismiss={handleDismiss}
            acceptDisabled={progressionSetIndex === null}
            chipsOpen={chipsOpen}
            />
            )}
            {/* COACH-3: Reason prompt — inline-чипы причин после «Скрыть».
                PRODUCT.md §3.2: L2 по запросу, не sheet и не modal.
                «×» справа = пропустить причину (записать rejected без userReasonCode). */}
            {dismissed && feedbackState.status === 'reasonPrompt' && (
              <View style={{ marginTop: SPACING.sm, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: colors.primary + '20' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: SPACING.xs }}>
                  <Text style={[typography.captionSmall, { color: colors.textSecondary, fontWeight: '500' }]}>
                    Почему? (не обязательно)
                  </Text>
                  {REJECTION_REASONS.map((reason) => (
                    <TouchableOpacity
                      key={reason.code}
                      onPress={() => handleReasonSelect(reason.code)}
                      activeOpacity={0.7}
                      style={{
                        paddingHorizontal: SPACING.sm,
                        paddingVertical: 4,
                        borderRadius: BORDER_RADIUS.sm,
                        backgroundColor: colors.surfaceSecondary,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Text style={[typography.captionSmall, { color: colors.textPrimary, fontWeight: '600' }]}>
                        {reason.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    onPress={handleSkipReason}
                    activeOpacity={0.7}
                    style={{
                      paddingHorizontal: 6,
                      paddingVertical: 4,
                      borderRadius: BORDER_RADIUS.sm,
                    }}
                  >
                    <X size={14} color={colors.textTertiary} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {/* COACH-1: Progression chips — hidden by default, revealed by "Изменить" */}
            {chipsOpen && (
            <View
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginTop: SPACING.sm }}
            >
            {PROGRESSION_STEPS.map((step) => {
            const isHighlighted = step === highlightedChip;
            return (
            <TouchableOpacity
            key={step}
                onPress={() => handleProgressionStep(step)}
                activeOpacity={0.7}
              style={{
                paddingHorizontal: SPACING.sm,
                paddingVertical: 4,
                borderRadius: BORDER_RADIUS.sm,
              backgroundColor: isHighlighted ? colors.success : colors.primary,
                borderWidth: isHighlighted ? 1 : 0,
                  borderColor: isHighlighted ? colors.success : 'transparent',
                  }}
                    >
                  <Text
                    style={[typography.captionSmall, { color: colors.textInverse, fontWeight: '700' }]}
                >
                +{step} {unit}
            </Text>
            </TouchableOpacity>
            );
            })}
            </View>
            )}
          </View>
        )}

        {/* Ряды подходов через вынесенный memo SetRow */}
        {setRowsConfig.map((rowSize, rowIndex) => {
          const startIndex = setRowsConfig.slice(0, rowIndex).reduce((s, n) => s + n, 0);
          const rowSets = sets.slice(startIndex, startIndex + rowSize);
          return (
            <SetRow
              key={rowIndex}
              rowSets={rowSets}
              startIndex={startIndex}
              rowIndex={rowIndex}
              exerciseIndex={exerciseIndex}
              updateSet={updateSet}
              isSetCompleted={isSetCompleted}
              unit={unit}
              toDisplay={toDisplay}
              fromDisplay={fromDisplay}
              colors={colors}
              cardStyles={cardStyles}
              onOpenFeedback={handleOpenFeedback}
              onToggleWarmup={handleToggleWarmup}
              shouldShowRpeChip={shouldShowRpeChip}
            />
          );
        })}

        {/* FEAT-7 v2: редактор RPE (тапабельная шкала, «Готово» = коммит) */}
        {feedbackSetIndex !== null && activeSet !== null && isSetCompleted(activeSet) && (
          <SetFeedbackEditor
            key={feedbackSetIndex}
            setNumber={feedbackSetIndex + 1}
            rpe={activeSet.rpe ?? null}
            onChange={(patch) => updateSetFeedback(exerciseIndex, feedbackSetIndex, patch)}
            onClose={() => setFeedbackSetIndex(null)}
            colors={colors}
          />
        )}

        {/* FEAT-1.2: ручной старт отдыха — фолбэк, когда автостарт выключен */}
        <TouchableOpacity
          style={[cardStyles.restButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            startRestTimer(restSeconds);
          }}
        >
          <Clock size={16} color={colors.textInverse} strokeWidth={2} />
          <Text style={cardStyles.restButtonText}>Отдых {restSeconds}с</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});