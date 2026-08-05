import React, { useState, useRef, useMemo, memo, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { TrendingUp, Clock, X } from 'lucide-react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { createCardStyles } from '../../styles/components/card';
import { SetData, SetFeedbackPatch, Difficulty } from '../../types/workout';
import { useTimerSettings } from '../../hooks/useTimerSettings';
import {
  WeightUnit,
  weightToDisplay,
  weightFromDisplay,
  weightPlaceholder,
} from '../../hooks/useUnitPreferences';
import {
  RPE_DESCRIPTIONS,
  rpeZone,
  deriveRir,
  deriveDifficulty,
  DIFFICULTY_LABELS,
} from '../../utils/rpe';

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

  React.useEffect(() => {
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
// ЧИП RPE
// ============================================================================
interface SetFeedbackChipProps {
  rpe: number | null;
  onPress: () => void;
  colors: any;
}

const SetFeedbackChip = memo(function SetFeedbackChip({
  rpe,
  onPress,
  colors,
}: SetFeedbackChipProps) {
  const filled = rpe != null;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        alignItems: 'center',
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.sm,
        backgroundColor: filled ? colors.primary + '15' : colors.surfaceSecondary,
        borderWidth: 1,
        borderColor: filled ? colors.primary + '40' : colors.border,
      }}
    >
      <Text
        style={[
          typography.captionSmall,
          {
            color: filled ? colors.primary : colors.textTertiary,
            fontWeight: '700',
          },
        ]}
      >
        {filled ? `RPE ${rpe}` : 'RPE?'}
      </Text>
    </TouchableOpacity>
  );
});

// ============================================================================
// ПОЛЗУНОК RPE
// ============================================================================
interface SetFeedbackSliderProps {
  setNumber: number;
  rpe: number | null;
  rir: number | null;
  difficulty: Difficulty | null;
  onChange: (patch: SetFeedbackPatch) => void;
  onClose: () => void;
  colors: any;
}

const SetFeedbackSlider = memo(function SetFeedbackSlider({
  setNumber,
  rpe,
  rir,
  difficulty,
  onChange,
  onClose,
  colors,
}: SetFeedbackSliderProps) {
  const [local, setLocal] = useState<number>(rpe ?? 6);
  const translateX = useSharedValue((rpe ?? 6) - 1);
  const sliderWidth = 280;
  const stepWidth = sliderWidth / 9;

  React.useEffect(() => {
    if (rpe != null) {
      setLocal(rpe);
      translateX.value = rpe - 1;
    }
  }, [rpe, translateX]);

  const zoneColor = (v: number): string => {
    const z = rpeZone(v);
    return z === 'easy' ? colors.success : z === 'hard' ? colors.warning : colors.error;
  };
  const zc = zoneColor(local);

  const commitValue = useCallback(
    (value: number) => {
      const v = Math.round(value);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange({ rpe: v, rir: deriveRir(v), difficulty: deriveDifficulty(v) });
    },
    [onChange],
  );

  const updateLocalValue = useCallback((value: number) => {
    setLocal(value);
  }, []);

  const panGesture = Gesture.Pan()
    .simultaneousWithExternalGesture(Gesture.Native())
    .onUpdate((event) => {
      'worklet';
      const clampedX = Math.max(0, Math.min(event.x, sliderWidth));
      translateX.value = clampedX / stepWidth;
      const value = Math.round(clampedX / stepWidth) + 1;
      runOnJS(updateLocalValue)(value);
    })
    .onEnd(() => {
      'worklet';
      const snappedX = Math.round(translateX.value);
      translateX.value = withSpring(snappedX);
      const value = snappedX + 1;
      runOnJS(commitValue)(value);
    });

  const animatedThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value * stepWidth }],
  }));

  const animatedTrackStyle = useAnimatedStyle(() => ({
    width: translateX.value * stepWidth,
  }));

  const reset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange({ rpe: null, rir: null, difficulty: null });
    translateX.value = 5;
    setLocal(6);
  };

  return (
    <View
      style={{
        marginTop: SPACING.sm,
        padding: SPACING.sm,
        borderRadius: BORDER_RADIUS.sm,
        backgroundColor: colors.surfaceSecondary,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: SPACING.xs,
        }}
      >
        <Text
          style={[
            typography.captionSmall,
            { color: colors.textSecondary, fontWeight: '700', flex: 1 },
          ]}
        >
          Подход {setNumber} — как далось?
        </Text>
        {rpe != null && (
          <TouchableOpacity
            onPress={reset}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ marginRight: SPACING.sm }}
          >
            <Text style={[typography.captionSmall, { color: colors.textTertiary }]}>
              Сбросить
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <X size={14} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
        <Text style={[typography.captionSmall, { color: colors.textTertiary }]}>1</Text>
        <View style={{ flex: 1, height: 40 }}>
          <GestureDetector gesture={panGesture}>
            <View
              style={{
                width: '100%',
                height: '100%',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  height: 4,
                  backgroundColor: zc + '40',
                  borderRadius: 2,
                }}
              />
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    left: 0,
                    height: 4,
                    backgroundColor: zc,
                    borderRadius: 2,
                  },
                  animatedTrackStyle,
                ]}
              />
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: zc,
                    borderWidth: 2,
                    borderColor: colors.textInverse,
                    shadowColor: colors.shadow,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 5,
                  },
                  animatedThumbStyle,
                ]}
              />
            </View>
          </GestureDetector>
        </View>
        <Text style={[typography.captionSmall, { color: colors.textTertiary }]}>10</Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: 4,
          paddingHorizontal: 12,
        }}
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
          <Text
            key={v}
            style={{
              fontSize: 9,
              color: local === v ? zc : colors.textTertiary,
              fontWeight: local === v ? '700' : '400',
            }}
          >
            {v}
          </Text>
        ))}
      </View>

      <Text
        style={[
          typography.captionSmall,
          { color: colors.textSecondary, marginTop: SPACING.xs, lineHeight: 16 },
        ]}
      >
        {`RPE ${local} — ${RPE_DESCRIPTIONS[local]} · сложность: ${
          DIFFICULTY_LABELS[difficulty ?? deriveDifficulty(local)]
        } · RIR ${rir ?? deriveRir(local)}`}
      </Text>
      <Text
        style={[typography.captionSmall, { color: colors.textTertiary, marginTop: 2 }]}
      >
        1 — легко · 10 — отказ
      </Text>
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
            {isSetCompleted(set) && (
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
  unit: WeightUnit;
  updateSet: (exIndex: number, setIndex: number, field: 'weight' | 'reps', value: string) => void;
  updateSetFeedback: (exIndex: number, setIndex: number, patch: SetFeedbackPatch) => void;
  applyProgression: (exerciseIndex: number, newWeight: number) => void;
  isSetCompleted: (set: SetData) => boolean;
  startRestTimer: (seconds: number) => void;
  colors: any;
  cardStyles: ReturnType<typeof createCardStyles>;
}

export const SetsGrid = memo(function SetsGrid({
  exerciseIndex,
  sets,
  restSeconds,
  unit,
  updateSet,
  updateSetFeedback,
  applyProgression,
  isSetCompleted,
  startRestTimer,
  colors,
  cardStyles,
}: SetsGridProps) {
  const [feedbackSetIndex, setFeedbackSetIndex] = useState<number | null>(null);
  const [showCustomWeight, setShowCustomWeight] = useState(false);
  const setRowsConfig = useMemo(() => getSetRowsConfig(sets.length), [sets.length]);

  
  // ✅ OPTIMIZED: мемоизация вычислений
  const completedSets = useMemo(
    () => sets.filter((s) => isSetCompleted(s)).length,
    [sets, isSetCompleted],
  );
  const allSetsDone = sets.length > 0 && completedSets === sets.length;

  // FEAT-1.2: автостарт таймера отдыха
const { settings: timerSettings } = useTimerSettings();
const restStartedRef = useRef(false);

useEffect(() => {
  // Сброс флага при смене упражнения
  restStartedRef.current = false;
}, [exerciseIndex]);

useEffect(() => {
  if (
    allSetsDone &&
    timerSettings.autoStartRest &&
    !restStartedRef.current &&
    restSeconds > 0
  ) {
    restStartedRef.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    startRestTimer(restSeconds);
  }
}, [allSetsDone, timerSettings.autoStartRest, restSeconds, startRestTimer]);

  // ✅ OPTIMIZED: стабильные функции конвертации
  const toDisplay = useCallback(
    (kgStr: string) => weightToDisplay(kgStr, unit),
    [unit],
  );
  const fromDisplay = useCallback(
    (disp: string) => weightFromDisplay(disp, unit),
    [unit],
  );

  // ✅ OPTIMIZED: мемоизация активного сета
  const activeSet = useMemo(
    () =>
      feedbackSetIndex !== null && feedbackSetIndex < sets.length
        ? sets[feedbackSetIndex]
        : null,
    [feedbackSetIndex, sets],
  );

  // FEAT-1.1: данные из последнего подхода
  const previousWeight = sets[0]?.previousWeight ?? null;
  const previousReps = sets[0]?.previousReps ?? null;
  const previousRpe = sets[0]?.previousRpe ?? null;

  // ✅ OPTIMIZED: мемоизация обработчиков
  const handleProgression = useCallback(() => {
    if (previousWeight == null) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    applyProgression(exerciseIndex, previousWeight + 2.5);
  }, [previousWeight, exerciseIndex, applyProgression]);

  const handleCustomWeightSubmit = useCallback(
    (text: string) => {
      const weight = parseFloat(text);
      if (!isNaN(weight) && weight > 0) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        applyProgression(exerciseIndex, weight);
        setShowCustomWeight(false);
      }
    },
    [exerciseIndex, applyProgression],
  );

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
        {/* FEAT-1.1: подсказка прогрессии */}
        {previousWeight != null && (
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
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: SPACING.sm,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 180 }}>
                <TrendingUp size={14} color={colors.primary} strokeWidth={2} />
                <Text
                  style={[
                    typography.captionSmall,
                    { color: colors.textSecondary, marginLeft: SPACING.xs },
                  ]}
                >
                  Прошлый раз:{' '}
                  <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                    {previousWeight} кг
                  </Text>
                  {previousReps != null && (
                    <>
                      {' × '}
                      <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                        {previousReps}
                      </Text>
                    </>
                  )}
                  {previousRpe != null && (
                    <Text style={{ color: colors.textTertiary }}> (RPE {previousRpe})</Text>
                  )}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleProgression}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.primary,
                  paddingHorizontal: SPACING.sm,
                  paddingVertical: 4,
                  borderRadius: BORDER_RADIUS.sm,
                  gap: 4,
                }}
              >
                <Text
                  style={[
                    typography.captionSmall,
                    { color: colors.textInverse, fontWeight: '700' },
                  ]}
                >
                  +2.5 кг
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowCustomWeight(!showCustomWeight)}
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
                <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>
                  Свой вес
                </Text>
              </TouchableOpacity>
            </View>

            {showCustomWeight && (
              <View style={{ marginTop: SPACING.sm }}>
                <TextInput
                  style={{
                    backgroundColor: colors.surfaceSecondary,
                    borderRadius: BORDER_RADIUS.sm,
                    padding: SPACING.sm,
                    color: colors.textPrimary,
                    borderWidth: 1,
                    borderColor: colors.border,
                    fontSize: 14,
                  }}
                  placeholder="Введите вес в кг"
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  onSubmitEditing={(e) => handleCustomWeightSubmit(e.nativeEvent.text)}
                  autoFocus
                />
              </View>
            )}
          </View>
        )}

        {/* ✅ OPTIMIZED: рендер рядов через вынесенный memo SetRow */}
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
            />
          );
        })}

        {/* FEAT-7: ползунок RPE */}
        {feedbackSetIndex !== null &&
          activeSet !== null &&
          isSetCompleted(activeSet) && (
            <SetFeedbackSlider
              key={feedbackSetIndex}
              setNumber={feedbackSetIndex + 1}
              rpe={activeSet.rpe ?? null}
              rir={activeSet.rir ?? null}
              difficulty={activeSet.difficulty ?? null}
              onChange={(patch) =>
                updateSetFeedback(exerciseIndex, feedbackSetIndex, patch)
              }
              onClose={() => setFeedbackSetIndex(null)}
              colors={colors}
            />
          )}

        <TouchableOpacity
          style={[cardStyles.restButton, { backgroundColor: colors.primary }]}
          onPress={() => startRestTimer(restSeconds)}
        >
          <Clock size={16} color={colors.textInverse} strokeWidth={2} />
          <Text style={cardStyles.restButtonText}>Отдых {restSeconds}с</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});