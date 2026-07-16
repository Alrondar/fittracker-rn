import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, Modal, Pressable } from 'react-native';
import { Settings, ChevronRight, TrendingUp, Clock, RotateCcw, CheckCircle, AlertTriangle, AlertCircle, Wrench, X, Minus, Plus, ShieldAlert } from 'lucide-react-native';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import * as Haptics from 'expo-haptics';
import { createCardStyles } from '../../styles/components/card';
import { CollapsibleSection } from './CollapsibleSection';
import { GroupedSection } from './GroupedSection';
import { ExerciseData, AlternativeExercise, SetData } from '../../types/workout';

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
  loadingAlts: boolean;
  getIntensityInfo: (intensity: string) => { label: string; color: string; bgColor: string; icon: React.ReactNode };
  updateExerciseSettings: (exIndex: number, setsCount: number, restSeconds: number) => void;
  colors: any;
  cardStyles: ReturnType<typeof createCardStyles>;
  // НОВОЕ: предупреждение о травме
  warning?: { level: 'avoid' | 'caution'; message: string } | null;
}

export function ExerciseCard({
  exercise, isMain, isReplaced, exerciseIndex, alternatives,
  updateSet, isSetCompleted, replaceExercise, startRestTimer,
  getIntensityInfo, updateExerciseSettings, colors, cardStyles,
  warning = null,
}: ExerciseCardProps) {
  const [expandedSections, setExpandedSections] = useState({ technique: false, equipment: false, settings: false, benefits: false, risks: false, injuries: false });
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [localSets, setLocalSets] = useState(0);
  const [localRest, setLocalRest] = useState(0);

  const toggleSection = (section: keyof typeof expandedSections) => setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));

  const hasSets = 'sets' in exercise;
  const sets = hasSets ? (exercise as ExerciseData).sets : [];
  const restSeconds = hasSets ? (exercise as ExerciseData).rest_seconds : 0;
  const intensity = hasSets ? (exercise as ExerciseData).intensity : 'medium';
  const intensityInfo = getIntensityInfo(intensity);

  const getSetRowsConfig = (totalSets: number): number[] => {
    if (totalSets <= 3) return [totalSets];
    if (totalSets === 4) return [4];
    if (totalSets === 5) return [3, 2];
    if (totalSets === 6) return [3, 3];
    if (totalSets === 7) return [4, 3];
    if (totalSets === 8) return [4, 4];
    if (totalSets === 9) return [3, 3, 3];
    if (totalSets === 10) return [4, 3, 3];
    if (totalSets === 11) return [4, 4, 3];
    if (totalSets === 12) return [4, 4, 4];
    return [3];
  };

  const setRowsConfig = getSetRowsConfig(sets.length);

  const openSettingsSheet = () => {
    setLocalSets(sets.length);
    setLocalRest(restSeconds);
    setShowSettingsSheet(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const saveSettings = () => {
    if (localSets < sets.length) {
      const removedSets = sets.slice(localSets);
      const hasData = removedSets.some(s => s.weight !== '' || s.reps !== '');
      if (hasData) {
        Alert.alert('Удалить подходы?', `Будут удалены подходы ${localSets + 1}-${sets.length} с введёнными данными. Продолжить?`, [
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

  const changeSets = (delta: number) => {
    const newValue = Math.max(1, Math.min(10, localSets + delta));
    if (newValue !== localSets) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLocalSets(newValue); }
  };

  const changeRest = (delta: number) => {
    const newValue = Math.max(30, Math.min(300, localRest + delta));
    if (newValue !== localRest) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLocalRest(newValue); }
  };

  return (
    <View style={[cardStyles.container, cardStyles.workoutExerciseCard]}>
      {/* Шапка */}
      <View style={cardStyles.workoutExerciseHeader}>
        <Text style={[cardStyles.workoutExerciseName, { color: colors.textPrimary }]} numberOfLines={2}>{exercise.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
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
          <View style={[cardStyles.workoutIntensityBadge, { backgroundColor: intensityInfo.bgColor }]}>
            {intensityInfo.icon}
            <Text style={[cardStyles.workoutIntensityText, { color: intensityInfo.color }]}>{intensityInfo.label}</Text>
          </View>
        </View>
      </View>

      {/* НОВОЕ: Баннер предупреждения о травме внутри карточки */}
      {warning && isMain && (
        <View style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          backgroundColor: warning.level === 'avoid' ? '#F4433615' : '#FFC10715',
          borderColor: warning.level === 'avoid' ? '#F44336' : '#FFC107',
          borderWidth: 1,
          borderRadius: BORDER_RADIUS.sm,
          padding: SPACING.sm,
          marginBottom: SPACING.md,
        }}>
          <ShieldAlert
            size={16}
            color={warning.level === 'avoid' ? '#F44336' : '#FFC107'}
            strokeWidth={2}
            style={{ marginRight: SPACING.xs, marginTop: 1 }}
          />
          <Text style={{
            color: warning.level === 'avoid' ? '#F44336' : '#FFC107',
            flex: 1,
            fontSize: 12,
            fontWeight: '600',
            lineHeight: 16,
          }}>
            {warning.message}
          </Text>
        </View>
      )}

      {/* Мышцы-теги: основные */}
      {'primary_muscles' in exercise && (exercise as ExerciseData).primary_muscles.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md }}>
          {(exercise as ExerciseData).primary_muscles.map((muscle, idx) => (
            <View key={idx} style={[cardStyles.muscleTagPrimary, { borderColor: colors.primary, backgroundColor: colors.primaryLight }]}>
              <Text style={[cardStyles.muscleTagPrimaryText, { color: colors.primary }]}>{muscle}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Мышцы-теги: вспомогательные */}
      {'secondary_muscles' in exercise && (exercise as ExerciseData).secondary_muscles.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md }}>
          {(exercise as ExerciseData).secondary_muscles.map((muscle, idx) => (
            <View key={idx} style={[cardStyles.muscleTagSecondary, { borderColor: colors.textSecondary, backgroundColor: colors.surfaceSecondary }]}>
              <Text style={[cardStyles.muscleTagSecondaryText, { color: colors.textSecondary }]}>{muscle}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Секции */}
      {'technique' in exercise && (exercise as ExerciseData).technique ? (
        <CollapsibleSection title="Техника выполнения" icon={<Settings size={16} color={colors.primary} strokeWidth={2} />} expanded={expandedSections.technique} onToggle={() => toggleSection('technique')} borderColor={colors.primary} colors={colors}>
          <Text style={{ color: colors.textPrimary }}>{(exercise as ExerciseData).technique}</Text>
        </CollapsibleSection>
      ) : null}

      {('equipment' in exercise && (exercise as ExerciseData).equipment.length > 0) || ('settings' in exercise && (exercise as ExerciseData).settings) ? (
        <GroupedSection borderColor={colors.primary} colors={colors}>
          {'equipment' in exercise && (exercise as ExerciseData).equipment.length > 0 && (
            <View style={{ marginBottom: SPACING.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xs }}>
                <Wrench size={16} color={colors.primary} strokeWidth={2} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase' }}>Оборудование</Text>
              </View>
              <Text style={{ fontSize: 14, color: colors.textPrimary }}>{(exercise as ExerciseData).equipment.join(', ')}</Text>
            </View>
          )}
          {'equipment' in exercise && (exercise as ExerciseData).equipment.length > 0 && 'settings' in exercise && (exercise as ExerciseData).settings && (
            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: SPACING.md }} />
          )}
          {'settings' in exercise && (exercise as ExerciseData).settings ? (
            <View style={{ marginBottom: SPACING.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xs }}>
                <Settings size={16} color={colors.primary} strokeWidth={2} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase' }}>Настройки</Text>
              </View>
              <Text style={{ fontSize: 14, color: colors.textPrimary }}>{(exercise as ExerciseData).settings}</Text>
            </View>
          ) : null}
        </GroupedSection>
      ) : null}

      {!isMain && (
        <>
          {'benefits' in exercise && (exercise as ExerciseData).benefits ? (
            <CollapsibleSection title="Польза" icon={<CheckCircle size={16} color="#4CAF50" strokeWidth={2} />} expanded={expandedSections.benefits} onToggle={() => toggleSection('benefits')} borderColor="#4CAF50" colors={colors}>
              <Text style={{ color: colors.textPrimary }}>{(exercise as ExerciseData).benefits}</Text>
            </CollapsibleSection>
          ) : null}
          {'risks' in exercise && (exercise as ExerciseData).risks ? (
            <CollapsibleSection title="Риски" icon={<AlertTriangle size={16} color="#FF9800" strokeWidth={2} />} expanded={expandedSections.risks} onToggle={() => toggleSection('risks')} borderColor="#FF9800" colors={colors}>
              <Text style={{ color: colors.textPrimary }}>{(exercise as ExerciseData).risks}</Text>
            </CollapsibleSection>
          ) : null}
          {'injuries' in exercise && (exercise as ExerciseData).injuries.length > 0 && (
            <CollapsibleSection title="Противопоказания" icon={<AlertCircle size={16} color="#F44336" strokeWidth={2} />} expanded={expandedSections.injuries} onToggle={() => toggleSection('injuries')} borderColor="#F44336" colors={colors}>
              {(exercise as ExerciseData).injuries.map((injury, idx) => (
                <Text key={idx} style={{ color: colors.textPrimary, marginBottom: SPACING.sm }}>• {injury}</Text>
              ))}
            </CollapsibleSection>
          )}
        </>
      )}

      {!isMain && (
        <TouchableOpacity style={[cardStyles.replaceButton, { borderColor: colors.primary, backgroundColor: colors.primaryLight }]} onPress={() => replaceExercise(exerciseIndex, exercise.id)}>
          <RotateCcw size={16} color={colors.primary} strokeWidth={2} />
          <Text style={[cardStyles.replaceButtonText, { color: colors.primary }]}>Заменить на это</Text>
        </TouchableOpacity>
      )}

      {hasSets && sets.length > 0 && (
        <View style={[cardStyles.setsContainer, { borderColor: colors.primary }]}>
          <View style={[cardStyles.setsHeader, { backgroundColor: colors.surfaceSecondary }]}>
            <TrendingUp size={16} color={colors.primary} strokeWidth={2} />
            <Text style={[cardStyles.setsHeaderText, { color: colors.textPrimary }]}>Подходы</Text>
          </View>
          <View style={[cardStyles.setsContent, { backgroundColor: colors.surface }]}>
            {setRowsConfig.map((rowSize, rowIndex) => {
              const startIndex = setRowsConfig.slice(0, rowIndex).reduce((sum, size) => sum + size, 0);
              const rowSets = sets.slice(startIndex, startIndex + rowSize);
              return (
                <View key={rowIndex} style={cardStyles.setRow}>
                  <View style={cardStyles.setNumbersRow}>
                    {rowSets.map((_, setIndex) => {
                      const globalIndex = startIndex + setIndex;
                      return (
                        <View key={setIndex} style={cardStyles.setNumber}>
                          <Text style={[cardStyles.setNumberText, { color: colors.textPrimary }]}>{globalIndex + 1}</Text>
                        </View>
                      );
                    })}
                  </View>
                  <View style={cardStyles.setInputsRow}>
                    {rowSets.map((set, setIndex) => {
                      const globalIndex = startIndex + setIndex;
                      return (
                        <View key={setIndex} style={[cardStyles.setInputContainer, { backgroundColor: isSetCompleted(set) ? colors.successLight : colors.surfaceSecondary }]}>
                          <TextInput style={[cardStyles.setInput, { color: colors.textPrimary }]} placeholder="вес (кг)" value={set.weight} onChangeText={(val) => updateSet(exerciseIndex, globalIndex, 'weight', val)} keyboardType="decimal-pad" placeholderTextColor={colors.textTertiary} />
                        </View>
                      );
                    })}
                  </View>
                  <View style={cardStyles.setInputsRow}>
                    {rowSets.map((set, setIndex) => {
                      const globalIndex = startIndex + setIndex;
                      return (
                        <View key={setIndex} style={[cardStyles.setInputContainer, { backgroundColor: isSetCompleted(set) ? colors.successLight : colors.surfaceSecondary }]}>
                          <TextInput style={[cardStyles.setInput, { color: colors.textPrimary }]} placeholder="повт." value={set.reps} onChangeText={(val) => updateSet(exerciseIndex, globalIndex, 'reps', val)} keyboardType="number-pad" placeholderTextColor={colors.textTertiary} />
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
            <TouchableOpacity style={[cardStyles.restButton, { backgroundColor: colors.primary }]} onPress={() => startRestTimer(restSeconds)}>
              <Clock size={16} color="white" strokeWidth={2} />
              <Text style={cardStyles.restButtonText}>Отдых {restSeconds}с</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isMain && (
        <Modal visible={showSettingsSheet} transparent animationType="fade" onRequestClose={() => setShowSettingsSheet(false)}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={() => setShowSettingsSheet(false)}>
            <Pressable style={[cardStyles.settingsSheetContainer, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
              <View style={cardStyles.settingsSheetHeader}>
                <Text style={[cardStyles.settingsSheetTitle, { color: colors.textPrimary }]}>Настройки упражнения</Text>
                <TouchableOpacity onPress={() => setShowSettingsSheet(false)}>
                  <X size={20} color={colors.textSecondary} strokeWidth={2} />
                </TouchableOpacity>
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
}