import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, Modal, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import {
  Settings, ChevronRight, ChevronDown, TrendingUp, Clock, RotateCcw,
  AlertTriangle, ShieldAlert, X, Minus, Plus, BookOpen, Dumbbell, Sparkles,
} from 'lucide-react-native';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import * as Haptics from 'expo-haptics';
import { createCardStyles } from '../../styles/components/card';
import { getMuscleColor } from '../../constants/muscleColors';
import { EquipmentIcon } from '../EquipmentIcon';
import { TechniqueMediaSlider } from './TechniqueMediaSlider';
import { ExerciseData, AlternativeExercise, SetData } from '../../types/workout';
import { useTheme } from '../../hooks/useTheme';

// ✅ Мост к данным, которые придут после патча types/workout.ts (reps_range).
//    Локальный опциональный тип позволяет компоненту компилироваться и работать
//    ДО применения патча (поле просто не отобразится, пока не придёт из БД).
type RepsRangeHolder = { reps_range?: string };

// ===== Внутренние компоненты =====
type SectionKey = 'technique' | 'info' | 'benefits' | 'risks' | 'injuries';

function ExpandableBody({ expanded, maxHeight, children }: {
  expanded: boolean; maxHeight: number; children: React.ReactNode;
}) {
  const progress = useSharedValue(expanded ? 1 : 0);
  useEffect(() => {
    progress.value = withTiming(expanded ? 1 : 0, { duration: 280, easing: Easing.out(Easing.cubic) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);
  const style = useAnimatedStyle(() => ({
    maxHeight: progress.value * maxHeight,
    opacity: 0.1 + progress.value * 0.9,
    transform: [{ translateY: (1 - progress.value) * -6 }],
  }));
  return (
    <Animated.View pointerEvents={expanded ? 'auto' : 'none'} style={[{ overflow: 'hidden' }, style]}>
      <View style={{ paddingTop: SPACING.sm, paddingBottom: SPACING.xs, paddingHorizontal: 2 }}>{children}</View>
    </Animated.View>
  );
}

function InfoAccordion({ icon, title, titleColor, expanded, onToggle, maxHeight = 400, children }: {
  icon: React.ReactNode; title: string; titleColor: string;
  expanded: boolean; onToggle: () => void; maxHeight?: number; children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ marginTop: SPACING.sm }}>
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.7}
        style={{
          flexDirection: 'row', alignItems: 'center',
          paddingVertical: SPACING.xs + 2, paddingHorizontal: SPACING.sm,
          borderRadius: BORDER_RADIUS.md, backgroundColor: colors.surfaceSecondary,
        }}
      >
        {icon}
        <Text style={[typography.captionSmall, {
          color: titleColor, fontWeight: '700', marginLeft: 6, flex: 1,
          textTransform: 'uppercase', letterSpacing: 0.5,
        }]}>
          {title}
        </Text>
        <View style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}>
          <ChevronDown size={14} color={colors.textTertiary} />
        </View>
      </TouchableOpacity>
      <ExpandableBody expanded={expanded} maxHeight={maxHeight}>{children}</ExpandableBody>
    </View>
  );
}

const formatEquipmentName = (name: string) =>
  name.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

// ✅ Вынесена из компонента: чистая функция, не зависит от props/state.
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

// ✅ Липкий инпут подхода. Controlled-TextInput в RN иногда откатывает несохранённый
//    символ при ре-рендере карточки (особенно когда ячейка уже «completed»/зелёная
//    из-за заполненного веса) → «не могу ничего вписать». Локальный буфер + коммит по
//    onBlur делают ввод детерминированным: во время фокуса внешнее value игнорируется,
//    на onBlur финальное значение отправляется в стейт повторно (страховка от «проглоченного» onChangeText).
interface SetInputProps {
  value: string;
  placeholder: string;
  keyboardType: 'decimal-pad' | 'number-pad';
  completed: boolean;
  onChangeText: (v: string) => void;
  colors: any;
  cardStyles: ReturnType<typeof createCardStyles>;
}

function SetInput({ value, placeholder, keyboardType, completed, onChangeText, colors, cardStyles }: SetInputProps) {
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
  return (
    <View style={[cardStyles.setInputContainer, { backgroundColor: completed ? colors.successLight : colors.surfaceSecondary }]}>
      <TextInput
        style={[cardStyles.setInput, { color: colors.textPrimary }]}
        placeholder={placeholder}
        value={local}
        onChangeText={(v) => {
          setLocal(v);
          lastSentRef.current = v;
          onChangeText(v);
        }}
        onFocus={() => { focusedRef.current = true; }}
        onBlur={() => {
          focusedRef.current = false;
          onChangeText(local); // ✅ форсируем сохранение введённого (страховка)
        }}
        keyboardType={keyboardType}
        placeholderTextColor={colors.textTertiary}
        blurOnSubmit={false}
      />
    </View>
  );
}

// ===== Основной компонент =====
interface ExerciseCardProps {
  exercise: ExerciseData | AlternativeExercise;
  isMain: boolean;
  isReplaced: boolean;
  exerciseIndex: number;
  alternatives: AlternativeExercise[];
  updateSet: (exIndex: number, setIndex: number, field: 'weight' | 'reps', value: string) => void;
  isSetCompleted: (set: SetData) => boolean;
  replaceExercise: (exIndex: number, altId: string) => void;
  startRestTimer: (seconds: number) => void;
  getIntensityInfo: (intensity: string) => { label: string; color: string; bgColor: string; icon: React.ReactNode };
  updateExerciseSettings: (exIndex: number, setsCount: number, restSeconds: number) => void;
  colors: any;
  cardStyles: ReturnType<typeof createCardStyles>;
  warning?: { level: 'avoid' | 'caution'; message: string } | null;
}

export const ExerciseCard = memo(function ExerciseCard({
  exercise, isMain, isReplaced, exerciseIndex, alternatives,
  updateSet, isSetCompleted, replaceExercise, startRestTimer,
  getIntensityInfo, updateExerciseSettings, colors, cardStyles,
  warning = null,
}: ExerciseCardProps) {
  const [openSection, setOpenSection] = useState<SectionKey | null>(null);
  const [everOpened, setEverOpened] = useState<Set<SectionKey>>(new Set());
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [localSets, setLocalSets] = useState(0);
  const [localRest, setLocalRest] = useState(0);

  const toggleSection = (key: SectionKey) => {
    setEverOpened(prev => (prev.has(key) ? prev : new Set(prev).add(key)));
    setOpenSection(prev => (prev === key ? null : key));
  };

  const hasSets = 'sets' in exercise;
  const sets = hasSets ? (exercise as ExerciseData).sets : [];
  const restSeconds = hasSets ? (exercise as ExerciseData).rest_seconds : 0;
  const intensity = hasSets ? (exercise as ExerciseData).intensity : 'medium';

  // ✅ Безопасное чтение reps_range (поле придёт после патча types/workout.ts + useWorkoutSession).
  const repsRange = (exercise as RepsRangeHolder).reps_range;

  // ✅ ФИКС быстродействия: мемоизация тяжёлых вычислений.
  const intensityInfo = useMemo(() => getIntensityInfo(intensity), [getIntensityInfo, intensity]);
  const setRowsConfig = useMemo(() => getSetRowsConfig(sets.length), [sets.length]);

  const mediaUrl = exercise.media_url ?? null;
  const settingsText = exercise.settings || '';
  const hasTechniqueContent = !!(exercise.technique || mediaUrl);
  const hasEquipmentContent = exercise.equipment.length > 0 || !!settingsText;

  const completedSets = sets.filter(s => isSetCompleted(s)).length;
  const allSetsDone = hasSets && sets.length > 0 && completedSets === sets.length;

  // Живая обводка карточки (единый дизайн-язык)
  const borderColor = warning?.level === 'avoid'
    ? colors.error
    : warning?.level === 'caution'
      ? colors.warning
      : isReplaced
        ? colors.primary
        : allSetsDone
          ? colors.success + '60'
          : colors.border;

  const openSettingsSheet = () => {
    setLocalSets(sets.length);
    setLocalRest(restSeconds);
    setShowSettingsSheet(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const saveSettings = () => {
    if (localSets < sets.length) {
      const removed = sets.slice(localSets);
      if (removed.some(s => s.weight !== '' || s.reps !== '')) {
        Alert.alert('Удалить подходы?', `Будут удалены подходы ${localSets + 1}-${sets.length} с данными.`, [
          { text: 'Отмена', style: 'cancel' },
          { text: 'Удалить', onPress: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); updateExerciseSettings(exerciseIndex, localSets, localRest); setShowSettingsSheet(false); } },
        ]);
        return;
      }
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateExerciseSettings(exerciseIndex, localSets, localRest);
    setShowSettingsSheet(false);
  };

  const changeSets = (d: number) => {
    const v = Math.max(1, Math.min(10, localSets + d));
    if (v !== localSets) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLocalSets(v); }
  };
  const changeRest = (d: number) => {
    const v = Math.max(30, Math.min(300, localRest + d));
    if (v !== localRest) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLocalRest(v); }
  };

  const warningColor = warning?.level === 'avoid' ? colors.error : colors.warning;

  return (
    <View style={[cardStyles.container, cardStyles.workoutExerciseCard, { borderWidth: 1, borderColor }]}>
      {/* Шапка: полное название + управление */}
      <View style={cardStyles.workoutExerciseHeader}>
        <Text style={[cardStyles.workoutExerciseName, { color: colors.textPrimary }]}>
          {exercise.name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
          {/* ✅ Статичный индикатор свайпа (НЕ кнопка): подсказка, что есть замены.
                 Альтернативы теперь грузятся автоматически в ExerciseSlider. */}
          {isMain && alternatives.length > 0 && (
            <View style={[cardStyles.workoutSwipeIcon, { backgroundColor: colors.surfaceSecondary }]}>
              <ChevronRight size={16} color={colors.textSecondary} strokeWidth={2} />
            </View>
          )}
          {isMain && (
            <TouchableOpacity onPress={openSettingsSheet} style={[cardStyles.workoutSettingsButton, { backgroundColor: colors.surfaceSecondary }]}>
              <Settings size={18} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          )}
          {/* ✅ Бейдж reps_range рядом с интенсивностью */}
          {!!repsRange && (
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: colors.surfaceSecondary,
              paddingHorizontal: SPACING.sm, paddingVertical: 4,
              borderRadius: BORDER_RADIUS.full,
              borderWidth: 1, borderColor: colors.border,
            }}>
              <Text style={[typography.captionSmall, { color: colors.textSecondary, fontWeight: '700' }]}>
                {repsRange} повт.
              </Text>
            </View>
          )}
          <View style={[cardStyles.workoutIntensityBadge, { backgroundColor: intensityInfo.bgColor }]}>
            {intensityInfo.icon}
            <Text style={[cardStyles.workoutIntensityText, { color: intensityInfo.color }]}>{intensityInfo.label}</Text>
          </View>
        </View>
      </View>

      {/* Баннер предупреждения о травме (темизованный) */}
      {warning && isMain && (
        <View style={{
          flexDirection: 'row', alignItems: 'flex-start',
          backgroundColor: warningColor + '15', borderColor: warningColor,
          borderWidth: 1, borderRadius: BORDER_RADIUS.sm, padding: SPACING.sm, marginBottom: SPACING.md,
        }}>
          <ShieldAlert size={16} color={warningColor} strokeWidth={2} style={{ marginRight: SPACING.xs, marginTop: 1 }} />
          <Text style={{ color: warningColor, flex: 1, fontSize: 12, fontWeight: '600', lineHeight: 16 }}>
            {warning.message}
          </Text>
        </View>
      )}

      {/* Баблы мышц с цветами групп */}
      {exercise.primary_muscles.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: exercise.secondary_muscles.length > 0 ? 6 : SPACING.md }}>
          {exercise.primary_muscles.map((m, i) => {
            const c = getMuscleColor(m);
            return (
              <View key={`p-${i}`} style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: c + '1A', borderWidth: 1, borderColor: c + '55',
                paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: BORDER_RADIUS.full,
              }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c, marginRight: 5 }} />
                <Text style={[typography.captionSmall, { color: c, fontWeight: '700' }]}>{m}</Text>
              </View>
            );
          })}
        </View>
      )}
      {exercise.secondary_muscles.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: SPACING.md }}>
          {exercise.secondary_muscles.map((m, i) => {
            const c = getMuscleColor(m);
            return (
              <View key={`s-${i}`} style={{
                backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: c + '40',
                paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: BORDER_RADIUS.full,
              }}>
                <Text style={[typography.captionSmall, { color: colors.textSecondary, fontWeight: '600' }]}>{m}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* ✅ Техника выполнения + Оборудование (32px) + Настройки — в ОДНОМ аккордеоне.
             Заголовок/иконка адаптивные: есть техника/медиа → «Техника выполнения»,
             иначе (только оборудование/настройки) → «Оборудование и настройки». */}
      {(hasTechniqueContent || hasEquipmentContent) ? (
        <InfoAccordion
          icon={hasTechniqueContent
            ? <BookOpen size={14} color={colors.primary} />
            : <Dumbbell size={14} color={colors.primary} />}
          title={hasTechniqueContent ? 'Техника выполнения' : 'Оборудование и настройки'}
          titleColor={colors.primary}
          expanded={openSection === 'technique'}
          onToggle={() => toggleSection('technique')}
          maxHeight={hasTechniqueContent ? 900 : 400}
        >
          {hasTechniqueContent && (
            <>
              {everOpened.has('technique') && (
                <TechniqueMediaSlider mediaUrl={mediaUrl} autoPlay={openSection === 'technique'} />
              )}
              {exercise.technique ? (
                <Text style={[typography.bodySmall, { color: colors.textSecondary, lineHeight: 18, marginTop: SPACING.sm }]}>
                  {exercise.technique}
                </Text>
              ) : null}
            </>
          )}
          {/* Оборудование — крупные баблы 32px */}
          {exercise.equipment.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: hasTechniqueContent ? SPACING.md : 0 }}>
              {exercise.equipment.map((eq, i) => (
                <View key={`eq-${i}`} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 8,
                  backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border,
                  paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: BORDER_RADIUS.full,
                }}>
                  <EquipmentIcon name={eq} size={32} primaryMuscles={exercise.primary_muscles} />
                  <Text style={[typography.captionSmall, { color: colors.textSecondary, fontWeight: '600' }]}>
                    {formatEquipmentName(eq)}
                  </Text>
                </View>
              ))}
            </View>
          )}
          {/* Настройки */}
          {settingsText ? (
            <>
              {(hasTechniqueContent || exercise.equipment.length > 0) && (
                <View style={{ height: 1, backgroundColor: colors.border, marginVertical: SPACING.sm }} />
              )}
              <Text style={[typography.bodySmall, { color: colors.textSecondary, lineHeight: 18 }]}>
                {settingsText}
              </Text>
            </>
          ) : null}
        </InfoAccordion>
      ) : null}

      {/* ✅ Объединённый аккордеон «Важно знать» — ТОЛЬКО для основного упражнения.
             Ранее эти секции были скрыты для isMain (баг UX: риски не показывались). */}
      {isMain && (exercise.benefits || exercise.risks || exercise.injuries.length > 0) && (
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <Sparkles size={12} color={colors.success} />
                <Text style={[typography.captionSmall, { color: colors.success, fontWeight: '700' }]}>Польза</Text>
              </View>
              <Text style={[typography.bodySmall, { color: colors.textSecondary, lineHeight: 18 }]}>
                {exercise.benefits}
              </Text>
            </View>
          ) : null}
          {exercise.risks ? (
            <View style={{ marginBottom: SPACING.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <AlertTriangle size={12} color={colors.warning} />
                <Text style={[typography.captionSmall, { color: colors.warning, fontWeight: '700' }]}>Риски</Text>
              </View>
              <Text style={[typography.bodySmall, { color: colors.textSecondary, lineHeight: 18 }]}>
                {exercise.risks}
              </Text>
            </View>
          ) : null}
          {exercise.injuries.length > 0 ? (
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <ShieldAlert size={12} color={colors.error} />
                <Text style={[typography.captionSmall, { color: colors.error, fontWeight: '700' }]}>Противопоказания</Text>
              </View>
              {exercise.injuries.map((inj, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 }}>
                  <Text style={[typography.bodySmall, { color: colors.error, marginRight: 6 }]}>•</Text>
                  <Text style={[typography.bodySmall, { color: colors.textSecondary, lineHeight: 18, flex: 1 }]}>{inj}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </InfoAccordion>
      )}

      {/* Секции альтернативного упражнения (раздельные аккордеоны, как раньше) */}
      {!isMain && (
        <>
          {exercise.benefits ? (
            <InfoAccordion
              icon={<Sparkles size={14} color={colors.success} />}
              title="Польза" titleColor={colors.success}
              expanded={openSection === 'benefits'} onToggle={() => toggleSection('benefits')}
            >
              <Text style={[typography.bodySmall, { color: colors.textSecondary, lineHeight: 18 }]}>{exercise.benefits}</Text>
            </InfoAccordion>
          ) : null}
          {exercise.risks ? (
            <InfoAccordion
              icon={<AlertTriangle size={14} color={colors.warning} />}
              title="Риски" titleColor={colors.warning}
              expanded={openSection === 'risks'} onToggle={() => toggleSection('risks')}
            >
              <Text style={[typography.bodySmall, { color: colors.textSecondary, lineHeight: 18 }]}>{exercise.risks}</Text>
            </InfoAccordion>
          ) : null}
          {exercise.injuries.length > 0 ? (
            <InfoAccordion
              icon={<ShieldAlert size={14} color={colors.error} />}
              title="Противопоказания" titleColor={colors.error}
              expanded={openSection === 'injuries'} onToggle={() => toggleSection('injuries')}
            >
              {exercise.injuries.map((inj, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 }}>
                  <Text style={[typography.bodySmall, { color: colors.error, marginRight: 6 }]}>•</Text>
                  <Text style={[typography.bodySmall, { color: colors.textSecondary, lineHeight: 18, flex: 1 }]}>{inj}</Text>
                </View>
              ))}
            </InfoAccordion>
          ) : null}
          <TouchableOpacity
            style={[cardStyles.replaceButton, { borderColor: colors.primary, backgroundColor: colors.primaryLight }]}
            onPress={() => replaceExercise(exerciseIndex, exercise.id)}
          >
            <RotateCcw size={16} color={colors.primary} strokeWidth={2} />
            <Text style={[cardStyles.replaceButtonText, { color: colors.primary }]}>Заменить на это</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Подходы (только основная карточка) */}
      {hasSets && sets.length > 0 && (
        <View style={[cardStyles.setsContainer, { backgroundColor: colors.surfaceSecondary, borderWidth: 0 }]}>
          <View style={[cardStyles.setsHeader, { backgroundColor: 'transparent' }]}>
            <TrendingUp size={16} color={colors.primary} strokeWidth={2} />
            <Text style={[cardStyles.setsHeaderText, { color: colors.textPrimary }]}>Подходы</Text>
            <Text style={[typography.captionSmall, {
              color: allSetsDone ? colors.success : colors.textTertiary, fontWeight: '700', marginLeft: 'auto',
            }]}>
              {allSetsDone ? '✓ ' : ''}{completedSets}/{sets.length}
            </Text>
          </View>
          <View style={[cardStyles.setsContent, { backgroundColor: colors.surface }]}>
            {setRowsConfig.map((rowSize, rowIndex) => {
              const startIndex = setRowsConfig.slice(0, rowIndex).reduce((s, n) => s + n, 0);
              const rowSets = sets.slice(startIndex, startIndex + rowSize);
              return (
                <View key={rowIndex} style={cardStyles.setRow}>
                  <View style={cardStyles.setNumbersRow}>
                    {rowSets.map((_, si) => (
                      <View key={si} style={cardStyles.setNumber}>
                        <Text style={[cardStyles.setNumberText, { color: colors.textPrimary }]}>{startIndex + si + 1}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={cardStyles.setInputsRow}>
                    {rowSets.map((set, si) => (
                      <SetInput
                        key={`w-${si}`}
                        value={set.weight}
                        placeholder="вес (кг)"
                        keyboardType="decimal-pad"
                        completed={isSetCompleted(set)}
                        onChangeText={(v) => updateSet(exerciseIndex, startIndex + si, 'weight', v)}
                        colors={colors}
                        cardStyles={cardStyles}
                      />
                    ))}
                  </View>
                  <View style={cardStyles.setInputsRow}>
                    {rowSets.map((set, si) => (
                      <SetInput
                        key={`r-${si}`}
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
                </View>
              );
            })}
            <TouchableOpacity style={[cardStyles.restButton, { backgroundColor: colors.primary }]} onPress={() => startRestTimer(restSeconds)}>
              <Clock size={16} color={colors.textInverse} strokeWidth={2} />
              <Text style={cardStyles.restButtonText}>Отдых {restSeconds}с</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Модалка настроек (только основная карточка) */}
      {isMain && (
        <Modal visible={showSettingsSheet} transparent animationType="fade" onRequestClose={() => setShowSettingsSheet(false)}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={() => setShowSettingsSheet(false)}>
            <Pressable style={[cardStyles.settingsSheetContainer, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
              <View style={cardStyles.settingsSheetHeader}>
                <Text style={[cardStyles.settingsSheetTitle, { color: colors.textPrimary }]}>Настройки упражнения</Text>
                <TouchableOpacity onPress={() => setShowSettingsSheet(false)}><X size={20} color={colors.textSecondary} strokeWidth={2} /></TouchableOpacity>
              </View>
              <View style={cardStyles.settingsSheetField}>
                <Text style={[cardStyles.settingsSheetLabel, { color: colors.textSecondary }]}>Количество подходов</Text>
                <View style={cardStyles.settingsSheetCounter}>
                  <TouchableOpacity onPress={() => changeSets(-1)} disabled={localSets <= 1} style={[cardStyles.settingsSheetCounterButton, { backgroundColor: localSets <= 1 ? colors.surfaceSecondary : colors.primaryLight, opacity: localSets <= 1 ? 0.5 : 1 }]}>
                    <Minus size={20} color={localSets <= 1 ? colors.textTertiary : colors.primary} strokeWidth={2} />
                  </TouchableOpacity>
                  <Text style={[cardStyles.settingsSheetCounterText, { color: colors.textPrimary }]}>{localSets}</Text>
                  <TouchableOpacity onPress={() => changeSets(1)} disabled={localSets >= 10} style={[cardStyles.settingsSheetCounterButton, { backgroundColor: localSets >= 10 ? colors.surfaceSecondary : colors.primaryLight, opacity: localSets >= 10 ? 0.5 : 1 }]}>
                    <Plus size={20} color={localSets >= 10 ? colors.textTertiary : colors.primary} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={cardStyles.settingsSheetField}>
                <Text style={[cardStyles.settingsSheetLabel, { color: colors.textSecondary }]}>Отдых между подходами</Text>
                <View style={cardStyles.settingsSheetCounter}>
                  <TouchableOpacity onPress={() => changeRest(-15)} disabled={localRest <= 30} style={[cardStyles.settingsSheetCounterButton, { backgroundColor: localRest <= 30 ? colors.surfaceSecondary : colors.primaryLight, opacity: localRest <= 30 ? 0.5 : 1 }]}>
                    <Minus size={20} color={localRest <= 30 ? colors.textTertiary : colors.primary} strokeWidth={2} />
                  </TouchableOpacity>
                  <Text style={[cardStyles.settingsSheetCounterText, { color: colors.textPrimary, minWidth: 80 }]}>{localRest}с</Text>
                  <TouchableOpacity onPress={() => changeRest(15)} disabled={localRest >= 300} style={[cardStyles.settingsSheetCounterButton, { backgroundColor: localRest >= 300 ? colors.surfaceSecondary : colors.primaryLight, opacity: localRest >= 300 ? 0.5 : 1 }]}>
                    <Plus size={20} color={localRest >= 300 ? colors.textTertiary : colors.primary} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity onPress={saveSettings} style={[cardStyles.settingsSheetSaveButton, { backgroundColor: colors.primary }]}>
                <Text style={cardStyles.settingsSheetSaveButtonText}>Сохранить</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
});