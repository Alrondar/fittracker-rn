// src/components/workout/SetsGrid.tsx
// Сетка подходов + чипы RPE + прогрессия (FEAT-1.1) + автостарт отдыха (FEAT-1.2).
// 05.08.2026: инлайн-дубли чипа/ползунка удалены — используются SetFeedbackChip
// и SetFeedbackEditor из SetFeedbackControl.tsx (FEAT-7 v2, тапабельная шкала).
// 06.08.2026 (FEAT-1.1 v2): хинт показывает прошлые данные АКТИВНОГО сета (первого
// незавершённого) и переключается по мере заполнения; прогрессия — чипами
// +2.5/+5/+10/+15/+20 в активный сет; custom-ввод удалён.
// 06.08.2026: чипы в текущих единицах (кг → кг-шаги, lb → реальные lb-номиналы);
// возвращена ручная кнопка «Отдых N с» как фолбэк автостарта (FEAT-1.2).
import React, { useState, useRef, useMemo, memo, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { TrendingUp, TrendingDown, Minus, Target, Clock, ChevronDown, EyeOff } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { createCardStyles } from '../../styles/components/card';
import { SetData, SetFeedbackPatch } from '../../types/workout';
import { useTimerSettings } from '../../hooks/useTimerSettings';
import { useRpeSettings } from '../../hooks/useRpeSettings';

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
          <View key={`fb-${startIndex + si}`} style={{ flex: 1, minWidth: 0 }}>
            {shouldShowRpeChip(set, startIndex + si) && (
              <SetFeedbackChip
                rpe={set.rpe ?? null}
                onPress={() => onOpenFeedback(startIndex + si)}
                colors={colors}
              />
            )}
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
  // FEAT-1.1 v2: прогрессия пер-сет через updateSet; applyProgression оставлен
  // в сигнатуре опционально для совместимости с ExerciseCard (не вызывается).
  applyProgression?: (exerciseIndex: number, newWeight: number) => void;
  isSetCompleted: (set: SetData) => boolean;
  startRestTimer: (seconds: number) => void;
  colors: any;
  cardStyles: ReturnType<typeof createCardStyles>;
}

export const SetsGrid = memo(function SetsGrid({
  exerciseIndex,
  sets,
  restSeconds,
  repsRange,
  safetyContext,
  readinessContext,
  unit,
  updateSet,
  updateSetFeedback,
  isSetCompleted,
  startRestTimer,
  colors,
  cardStyles,
}: SetsGridProps) {
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
  // ============================================================================
  const recommendation = useMemo<(ProgressionResult & {
    safetyOverride?: SafetyOverride | null;
    readinessOverride?: ReadinessOverride | null;
  }) | null>(() => {
    if (sets.length === 0) return null;
    const base = calculateProgression({ sets, repsRange: repsRange ?? null });
    const afterSafety = applySafetyPrecedence(base, safetyContext ?? null);
    // ENG-3: readiness — после safety (PRODUCT.md §8: боль > усталость)
    return applyReadinessContext(afterSafety, readinessContext ?? null);
  }, [sets, repsRange, safetyContext, readinessContext]);

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
  const recommendationIcon =
    recommendation?.action === 'increase'
      ? Target
      : recommendation?.action === 'decrease'
        ? TrendingDown
        : Minus;
  const recommendationColor = isSystemDowngrade
    ? colors.warning
    : recommendation?.action === 'increase'
      ? colors.success
      : recommendation?.action === 'decrease'
        ? colors.warning
        : colors.primary;

  // ============================================================================
  // ENG-2: structured reasons — expand/collapse + dismiss
  // ============================================================================
  const [expanded, setExpanded] = useState(false);
  // dismissed — скрывает recommendation на сессию (не persist — COACH-3 territory)
  const [dismissed, setDismissed] = useState(false);

  // Reset expand/dismiss state when exercise changes
  useEffect(() => {
    setExpanded(false);
    setDismissed(false);
  }, [exerciseIndex]);

  const explanationItems = useMemo<ExplanationItem[]>(() => {
    if (!recommendation || recommendation.action === 'no_data') return [];
    return explainProgression(recommendation);
  }, [recommendation]);

  const toggleExpanded = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded((v) => !v);
  }, []);

  const handleDismiss = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDismissed(true);
    setExpanded(false);
  }, []);

  const handleOpenFeedback = useCallback((setIndex: number) => {
    setFeedbackSetIndex(setIndex);
  }, []);

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
            {/* ENG-2: one-liner recommendation + expandable «Почему?» */}
            {recommendation && recommendation.action !== 'no_data' && !dismissed && (
              <View style={{ marginTop: SPACING.xs }}>
                {/* Tap target: one-liner + chevron → expand/collapse */}
                <TouchableOpacity
                  onPress={toggleExpanded}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingVertical: 4,
                  }}
                >
                  {React.createElement(recommendationIcon, {
                    size: 14,
                    color: recommendationColor,
                    strokeWidth: 2,
                  })}
                                                      <Text
                    style={[
                      typography.captionSmall,
                      { color: recommendationColor, fontWeight: '700', flex: 1 },
                    ]}
                  >
                    {recommendation.safetyOverride?.ruText ??
                      recommendation.readinessOverride?.ruText ??
                      recommendation.reason.ruText}
                  </Text>
                  <ChevronDown
                    size={14}
                    color={colors.textTertiary}
                    strokeWidth={2}
                    style={{
                      transform: [{ rotate: expanded ? '180deg' : '0deg' }],
                    }}
                  />
                </TouchableOpacity>

                {/* Expanded: structured facts + Dismiss */}
                {expanded && (
                  <View
                    style={{
                      marginTop: SPACING.xs,
                      paddingTop: SPACING.sm,
                      paddingLeft: SPACING.sm,
                      borderLeftWidth: 2,
                      borderLeftColor: recommendationColor + '60',
                    }}
                  >
                    {explanationItems.map((item, idx) => {
                      const color =
                        item.emphasis === 'success'
                          ? colors.success
                          : item.emphasis === 'warning'
                            ? colors.warning
                            : item.emphasis === 'primary'
                              ? colors.primary
                              : colors.textSecondary;
                      const isConclusion = item.kind === 'conclusion';
                      return (
                        <View
                          key={idx}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'flex-start',
                            gap: 6,
                            marginBottom: 4,
                          }}
                        >
                          <Text
                            style={[
                              typography.captionSmall,
                              {
                                color: colors.textTertiary,
                                fontWeight: '600',
                                minWidth: 90,
                              },
                            ]}
                          >
                            {item.label}
                          </Text>
                          <Text
                            style={[
                              typography.captionSmall,
                              {
                                color,
                                fontWeight: isConclusion ? '700' : '400',
                                flex: 1,
                              },
                            ]}
                          >
                            {item.value}
                          </Text>
                        </View>
                      );
                    })}

                    {/* Dismiss button */}
                    <TouchableOpacity
                      onPress={handleDismiss}
                      activeOpacity={0.7}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        marginTop: SPACING.xs,
                        paddingVertical: 2,
                        alignSelf: 'flex-start',
                      }}
                    >
                      <EyeOff size={12} color={colors.textTertiary} strokeWidth={2} />
                      <Text
                        style={[
                          typography.captionSmall,
                          { color: colors.textTertiary, fontWeight: '500' },
                        ]}
                      >
                        Скрыть
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
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