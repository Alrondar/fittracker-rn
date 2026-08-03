import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {
  Settings,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  Clock,
  RotateCcw,
  AlertTriangle,
  ShieldAlert,
  BookOpen,
  Dumbbell,
  Sparkles,
} from 'lucide-react-native';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { createCardStyles } from '../../styles/components/card';
import { getMuscleColor } from '../../constants/muscleColors';
import { EquipmentIcon } from '../EquipmentIcon';
import { TechniqueMediaSlider } from './TechniqueMediaSlider';
import { ExerciseData, AlternativeExercise, SetData } from '../../types/workout';
import { useTheme } from '../../hooks/useTheme';
import {
  WeightUnit,
  weightToDisplay,
  weightFromDisplay,
  weightPlaceholder,
} from '../../hooks/useUnitPreferences';

// Мост к reps_range (поле опционально — компонент компилируется и без него).
type RepsRangeHolder = { reps_range?: string };

type SectionKey = 'technique' | 'info' | 'benefits' | 'risks' | 'injuries';

function ExpandableBody({
  expanded,
  maxHeight,
  children,
}: {
  expanded: boolean;
  maxHeight: number;
  children: React.ReactNode;
}) {
  const progress = useSharedValue(expanded ? 1 : 0);
  useEffect(() => {
    progress.value = withTiming(expanded ? 1 : 0, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);
  const style = useAnimatedStyle(() => ({
    maxHeight: progress.value * maxHeight,
    opacity: 0.1 + progress.value * 0.9,
    transform: [{ translateY: (1 - progress.value) * -6 }],
  }));
  return (
    <Animated.View
      pointerEvents={expanded ? 'auto' : 'none'}
      style={[{ overflow: 'hidden' }, style]}
    >
      <View
        style={{
          paddingTop: SPACING.sm,
          paddingBottom: SPACING.xs,
          paddingHorizontal: 2,
        }}
      >
        {children}
      </View>
    </Animated.View>
  );
}

function InfoAccordion({
  icon,
  title,
  titleColor,
  expanded,
  onToggle,
  maxHeight = 400,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  titleColor: string;
  expanded: boolean;
  onToggle: () => void;
  maxHeight?: number;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ marginTop: SPACING.sm }}>
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.7}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: SPACING.xs + 2,
          paddingHorizontal: SPACING.sm,
          borderRadius: BORDER_RADIUS.md,
          backgroundColor: colors.surfaceSecondary,
        }}
      >
        {icon}
        <Text
          style={[
            typography.captionSmall,
            {
              color: titleColor,
              fontWeight: '700',
              marginLeft: 6,
              flex: 1,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            },
          ]}
        >
          {title}
        </Text>
        <View style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}>
          <ChevronDown size={14} color={colors.textTertiary} />
        </View>
      </TouchableOpacity>
      <ExpandableBody expanded={expanded} maxHeight={maxHeight}>
        {children}
      </ExpandableBody>
    </View>
  );
}

const formatEquipmentName = (name: string) =>
  name.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

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

interface SetInputProps {
  value: string;
  placeholder: string;
  keyboardType: 'decimal-pad' | 'number-pad';
  completed: boolean;
  onChangeText: (v: string) => void;
  colors: any;
  cardStyles: ReturnType<typeof createCardStyles>;
}

/**
 * Ввод детерминирован: во время фокуса внешний value игнорируется и наверх ничего
 * не летит — родитель (и весь FlatList) НЕ ре-рендерится на каждый символ.
 * Коммит в стейт — только onBlur. Фон ячейки — по локальному буферу (isFilled),
 * чтобы не было «ввёл, но розовое».
 */
function SetInput({
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
          // наверх НЕ пробрасываем во время печати — обрываем каскад ре-рендеров
        }}
        onFocus={() => {
          focusedRef.current = true;
        }}
        onBlur={() => {
          focusedRef.current = false;
          onChangeText(local); // единственный коммит в родитель
        }}
        keyboardType={keyboardType}
        placeholderTextColor={colors.textTertiary}
        blurOnSubmit={false}
      />
    </View>
  );
}

interface ExerciseCardProps {
  exercise: ExerciseData | AlternativeExercise;
  isMain: boolean;
  isReplaced: boolean;
  exerciseIndex: number;
  alternatives: AlternativeExercise[];
  updateSet: (
    exIndex: number,
    setIndex: number,
    field: 'weight' | 'reps',
    value: string,
  ) => void;
  isSetCompleted: (set: SetData) => boolean;
  replaceExercise: (exIndex: number, altId: string) => void;
  startRestTimer: (seconds: number) => void;
  getIntensityInfo: (intensity: string) => {
    label: string;
    color: string;
    bgColor: string;
    icon: React.ReactNode;
  };
  // ✅ ВОЛНА 3: карточка больше не держит модалку — она только просит экран открыть
  //    единственную общую модалку настроек, передав индекс + текущие параметры.
  //    updateExerciseSettings УБРАН из пропсов (модалка живёт на экране).
  onOpenSettings: (
    exerciseIndex: number,
    setsCount: number,
    restSeconds: number,
  ) => void;
  colors: any;
  cardStyles: ReturnType<typeof createCardStyles>;
  unit: WeightUnit; // единица отображения веса (стейт/БД всегда в кг)
  warning?: { level: 'avoid' | 'caution'; message: string } | null;
}

export const ExerciseCard = memo(function ExerciseCard({
  exercise,
  isMain,
  isReplaced,
  exerciseIndex,
  alternatives,
  updateSet,
  isSetCompleted,
  replaceExercise,
  startRestTimer,
  getIntensityInfo,
  onOpenSettings,
  colors,
  cardStyles,
  unit,
  warning = null,
}: ExerciseCardProps) {
  const [openSection, setOpenSection] = useState<SectionKey | null>(null);
  const [everOpened, setEverOpened] = useState<Set<SectionKey>>(new Set());

  const toggleSection = (key: SectionKey) => {
    setEverOpened((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
    setOpenSection((prev) => (prev === key ? null : key));
  };

  const hasSets = 'sets' in exercise;
  const sets = hasSets ? (exercise as ExerciseData).sets : [];
  const restSeconds = hasSets ? (exercise as ExerciseData).rest_seconds : 0;
  const intensity = hasSets ? (exercise as ExerciseData).intensity : 'medium';
  const repsRange = (exercise as RepsRangeHolder).reps_range;

  const intensityInfo = useMemo(
    () => getIntensityInfo(intensity),
    [getIntensityInfo, intensity],
  );
  const setRowsConfig = useMemo(() => getSetRowsConfig(sets.length), [sets.length]);

  const mediaUrl = exercise.media_url ?? null;
  const settingsText = exercise.settings || '';
  const hasTechniqueContent = !!(exercise.technique || mediaUrl);
  const hasEquipmentContent = exercise.equipment.length > 0 || !!settingsText;

  const completedSets = sets.filter((s) => isSetCompleted(s)).length;
  const allSetsDone = hasSets && sets.length > 0 && completedSets === sets.length;

  const borderColor =
    warning?.level === 'avoid'
      ? colors.error
      : warning?.level === 'caution'
      ? colors.warning
      : isReplaced
      ? colors.primary
      : allSetsDone
      ? colors.success + '60'
      : colors.border;

  // Конвертация ТОЛЬКО на границе ввода/вывода. Стейт и БД — всегда кг.
  const toDisplay = (kgStr: string) => weightToDisplay(kgStr, unit);
  const fromDisplay = (disp: string) => weightFromDisplay(disp, unit);

  const warningColor = warning?.level === 'avoid' ? colors.error : colors.warning;

  return (
    <View
      style={[
        cardStyles.container,
        cardStyles.workoutExerciseCard,
        { borderWidth: 1, borderColor },
      ]}
    >
      {/* Шапка: имя СВЕРХУ во всю ширину карточки, все иконки и бейджи — рядом ниже. */}
      <View
        style={[
          cardStyles.workoutExerciseHeader,
          { flexDirection: 'column', alignItems: 'stretch', gap: SPACING.sm },
        ]}
      >
        <Text
          style={[cardStyles.workoutExerciseName, { color: colors.textPrimary }]}
          numberOfLines={2}
        >
          {exercise.name}
        </Text>

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: SPACING.xs,
          }}
        >
          {isMain && alternatives.length > 0 && (
            <View
              style={[
                cardStyles.workoutSwipeIcon,
                { backgroundColor: colors.surfaceSecondary },
              ]}
            >
              <ChevronRight size={16} color={colors.textSecondary} strokeWidth={2} />
            </View>
          )}
          {isMain && (
            <TouchableOpacity
              // ✅ ВОЛНА 3: шестерёнка просит экран открыть общую модалку настроек.
              onPress={() => onOpenSettings(exerciseIndex, sets.length, restSeconds)}
              style={[
                cardStyles.workoutSettingsButton,
                { backgroundColor: colors.surfaceSecondary },
              ]}
            >
              <Settings size={18} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          )}
          {!!repsRange && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.surfaceSecondary,
                paddingHorizontal: SPACING.sm,
                paddingVertical: 4,
                borderRadius: BORDER_RADIUS.full,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text
                style={[
                  typography.captionSmall,
                  { color: colors.textSecondary, fontWeight: '700' },
                ]}
              >
                {repsRange} повт.
              </Text>
            </View>
          )}
          <View
            style={[
              cardStyles.workoutIntensityBadge,
              { backgroundColor: intensityInfo.bgColor },
            ]}
          >
            {intensityInfo.icon}
            <Text style={[cardStyles.workoutIntensityText, { color: intensityInfo.color }]}>
              {intensityInfo.label}
            </Text>
          </View>
        </View>
      </View>

      {warning && isMain && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            backgroundColor: warningColor + '15',
            borderColor: warningColor,
            borderWidth: 1,
            borderRadius: BORDER_RADIUS.sm,
            padding: SPACING.sm,
            marginBottom: SPACING.md,
          }}
        >
          <ShieldAlert
            size={16}
            color={warningColor}
            strokeWidth={2}
            style={{ marginRight: SPACING.xs, marginTop: 1 }}
          />
          <Text
            style={{
              color: warningColor,
              flex: 1,
              fontSize: 12,
              fontWeight: '600',
              lineHeight: 16,
            }}
          >
            {warning.message}
          </Text>
        </View>
      )}

      {exercise.primary_muscles.length > 0 && (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 6,
            marginBottom: exercise.secondary_muscles.length > 0 ? 6 : SPACING.md,
          }}
        >
          {exercise.primary_muscles.map((m, i) => {
            const c = getMuscleColor(m);
            return (
              <View
                key={`p-${i}`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: c + '1A',
                  borderWidth: 1,
                  borderColor: c + '55',
                  paddingHorizontal: SPACING.sm,
                  paddingVertical: 3,
                  borderRadius: BORDER_RADIUS.full,
                }}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: c,
                    marginRight: 5,
                  }}
                />
                <Text style={[typography.captionSmall, { color: c, fontWeight: '700' }]}>
                  {m}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {exercise.secondary_muscles.length > 0 && (
        <View
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: SPACING.md }}
        >
          {exercise.secondary_muscles.map((m, i) => {
            const c = getMuscleColor(m);
            return (
              <View
                key={`s-${i}`}
                style={{
                  backgroundColor: colors.surfaceSecondary,
                  borderWidth: 1,
                  borderColor: c + '40',
                  paddingHorizontal: SPACING.sm,
                  paddingVertical: 3,
                  borderRadius: BORDER_RADIUS.full,
                }}
              >
                <Text
                  style={[
                    typography.captionSmall,
                    { color: colors.textSecondary, fontWeight: '600' },
                  ]}
                >
                  {m}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {hasTechniqueContent || hasEquipmentContent ? (
        <InfoAccordion
          icon={
            hasTechniqueContent ? (
              <BookOpen size={14} color={colors.primary} />
            ) : (
              <Dumbbell size={14} color={colors.primary} />
            )
          }
          title={
            hasTechniqueContent ? 'Техника выполнения' : 'Оборудование и настройки'
          }
          titleColor={colors.primary}
          expanded={openSection === 'technique'}
          onToggle={() => toggleSection('technique')}
          maxHeight={hasTechniqueContent ? 900 : 400}
        >
          {hasTechniqueContent && (
            <>
              {everOpened.has('technique') && (
                <TechniqueMediaSlider
                  mediaUrl={mediaUrl}
                  autoPlay={openSection === 'technique'}
                />
              )}
              {exercise.technique ? (
                <Text
                  style={[
                    typography.bodySmall,
                    {
                      color: colors.textSecondary,
                      lineHeight: 18,
                      marginTop: SPACING.sm,
                    },
                  ]}
                >
                  {exercise.technique}
                </Text>
              ) : null}
            </>
          )}
          {exercise.equipment.length > 0 && (
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
                marginTop: hasTechniqueContent ? SPACING.md : 0,
              }}
            >
              {exercise.equipment.map((eq, i) => (
                <View
                  key={`eq-${i}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: colors.surfaceSecondary,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingHorizontal: SPACING.md,
                    paddingVertical: 6,
                    borderRadius: BORDER_RADIUS.full,
                  }}
                >
                  <EquipmentIcon
                    name={eq}
                    size={32}
                    primaryMuscles={exercise.primary_muscles}
                  />
                  <Text
                    style={[
                      typography.captionSmall,
                      { color: colors.textSecondary, fontWeight: '600' },
                    ]}
                  >
                    {formatEquipmentName(eq)}
                  </Text>
                </View>
              ))}
            </View>
          )}
          {settingsText ? (
            <>
              {(hasTechniqueContent || exercise.equipment.length > 0) && (
                <View
                  style={{
                    height: 1,
                    backgroundColor: colors.border,
                    marginVertical: SPACING.sm,
                  }}
                />
              )}
              <Text
                style={[
                  typography.bodySmall,
                  { color: colors.textSecondary, lineHeight: 18 },
                ]}
              >
                {settingsText}
              </Text>
            </>
          ) : null}
        </InfoAccordion>
      ) : null}

      {isMain &&
        (exercise.benefits ||
          exercise.risks ||
          exercise.injuries.length > 0) && (
          <InfoAccordion
            icon={<ShieldAlert size={14} color={colors.warning} />}
            title="Важно знать"
            titleColor={colors.warning}
            expanded={openSection === 'info'}
            onToggle={() => toggleSection('info')}
            maxHeight={600}
          >
            {exercise.benefits ? (
              <View style={{ marginBottom: SPACING.sm }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    marginBottom: 4,
                  }}
                >
                  <Sparkles size={12} color={colors.success} />
                  <Text
                    style={[
                      typography.captionSmall,
                      { color: colors.success, fontWeight: '700' },
                    ]}
                  >
                    Польза
                  </Text>
                </View>
                <Text
                  style={[
                    typography.bodySmall,
                    { color: colors.textSecondary, lineHeight: 18 },
                  ]}
                >
                  {exercise.benefits}
                </Text>
              </View>
            ) : null}
            {exercise.risks ? (
              <View style={{ marginBottom: SPACING.sm }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    marginBottom: 4,
                  }}
                >
                  <AlertTriangle size={12} color={colors.warning} />
                  <Text
                    style={[
                      typography.captionSmall,
                      { color: colors.warning, fontWeight: '700' },
                    ]}
                  >
                    Риски
                  </Text>
                </View>
                <Text
                  style={[
                    typography.bodySmall,
                    { color: colors.textSecondary, lineHeight: 18 },
                  ]}
                >
                  {exercise.risks}
                </Text>
              </View>
            ) : null}
            {exercise.injuries.length > 0 ? (
              <View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    marginBottom: 4,
                  }}
                >
                  <ShieldAlert size={12} color={colors.error} />
                  <Text
                    style={[
                      typography.captionSmall,
                      { color: colors.error, fontWeight: '700' },
                    ]}
                  >
                    Противопоказания
                  </Text>
                </View>
                {exercise.injuries.map((inj, i) => (
                  <View
                    key={i}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      marginBottom: 4,
                    }}
                  >
                    <Text
                      style={[
                        typography.bodySmall,
                        { color: colors.error, marginRight: 6 },
                      ]}
                    >
                      •
                    </Text>
                    <Text
                      style={[
                        typography.bodySmall,
                        { color: colors.textSecondary, lineHeight: 18, flex: 1 },
                      ]}
                    >
                      {inj}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </InfoAccordion>
        )}

      {!isMain && (
        <>
          {exercise.benefits ? (
            <InfoAccordion
              icon={<Sparkles size={14} color={colors.success} />}
              title="Польза"
              titleColor={colors.success}
              expanded={openSection === 'benefits'}
              onToggle={() => toggleSection('benefits')}
            >
              <Text
                style={[
                  typography.bodySmall,
                  { color: colors.textSecondary, lineHeight: 18 },
                ]}
              >
                {exercise.benefits}
              </Text>
            </InfoAccordion>
          ) : null}
          {exercise.risks ? (
            <InfoAccordion
              icon={<AlertTriangle size={14} color={colors.warning} />}
              title="Риски"
              titleColor={colors.warning}
              expanded={openSection === 'risks'}
              onToggle={() => toggleSection('risks')}
            >
              <Text
                style={[
                  typography.bodySmall,
                  { color: colors.textSecondary, lineHeight: 18 },
                ]}
              >
                {exercise.risks}
              </Text>
            </InfoAccordion>
          ) : null}
          {exercise.injuries.length > 0 ? (
            <InfoAccordion
              icon={<ShieldAlert size={14} color={colors.error} />}
              title="Противопоказания"
              titleColor={colors.error}
              expanded={openSection === 'injuries'}
              onToggle={() => toggleSection('injuries')}
            >
              {exercise.injuries.map((inj, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    marginBottom: 4,
                  }}
                >
                  <Text
                    style={[
                      typography.bodySmall,
                      { color: colors.error, marginRight: 6 },
                    ]}
                  >
                    •
                  </Text>
                  <Text
                    style={[
                      typography.bodySmall,
                      { color: colors.textSecondary, lineHeight: 18, flex: 1 },
                    ]}
                  >
                    {inj}
                  </Text>
                </View>
              ))}
            </InfoAccordion>
          ) : null}
          <TouchableOpacity
            style={[
              cardStyles.replaceButton,
              { borderColor: colors.primary, backgroundColor: colors.primaryLight },
            ]}
            onPress={() => replaceExercise(exerciseIndex, exercise.id)}
          >
            <RotateCcw size={16} color={colors.primary} strokeWidth={2} />
            <Text style={[cardStyles.replaceButtonText, { color: colors.primary }]}>
              Заменить на это
            </Text>
          </TouchableOpacity>
        </>
      )}

      {hasSets && sets.length > 0 && (
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
            {setRowsConfig.map((rowSize, rowIndex) => {
              const startIndex = setRowsConfig
                .slice(0, rowIndex)
                .reduce((s, n) => s + n, 0);
              const rowSets = sets.slice(startIndex, startIndex + rowSize);
              return (
                <View key={rowIndex} style={cardStyles.setRow}>
                  <View style={cardStyles.setNumbersRow}>
                    {rowSets.map((_, si) => (
                      <View key={si} style={cardStyles.setNumber}>
                        <Text
                          style={[
                            cardStyles.setNumberText,
                            { color: colors.textPrimary },
                          ]}
                        >
                          {startIndex + si + 1}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <View style={cardStyles.setInputsRow}>
                    {rowSets.map((set, si) => (
                      <SetInput
                        key={`w-${si}-${unit}`}
                        value={toDisplay(set.weight)}
                        placeholder={weightPlaceholder(unit)}
                        keyboardType="decimal-pad"
                        completed={isSetCompleted(set)}
                        onChangeText={(v) =>
                          updateSet(
                            exerciseIndex,
                            startIndex + si,
                            'weight',
                            fromDisplay(v),
                          )
                        }
                        colors={colors}
                        cardStyles={cardStyles}
                      />
                    ))}
                  </View>
                  <View style={cardStyles.setInputsRow}>
                    {rowSets.map((set, si) => (
                      <SetInput
                        key={`r-${si}-${unit}`}
                        value={set.reps}
                        placeholder="повт."
                        keyboardType="number-pad"
                        completed={isSetCompleted(set)}
                        onChangeText={(v) =>
                          updateSet(exerciseIndex, startIndex + si, 'reps', v)
                        }
                        colors={colors}
                        cardStyles={cardStyles}
                      />
                    ))}
                  </View>
                </View>
              );
            })}
            <TouchableOpacity
              style={[cardStyles.restButton, { backgroundColor: colors.primary }]}
              onPress={() => startRestTimer(restSeconds)}
            >
              <Clock size={16} color={colors.textInverse} strokeWidth={2} />
              <Text style={cardStyles.restButtonText}>Отдых {restSeconds}с</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
});