import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { X, Search, ArrowUpDown, Check, Dumbbell, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { SPACING, BORDER_RADIUS } from '../../../constants/theme';
import { typography } from '../../../styles/typography';
import { getMuscleColor } from '../../../constants/muscleColors';
import { EquipmentIcon } from '../../EquipmentIcon';

interface ExercisePickerSheetProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  exercises: any[];
  loading: boolean;
  onLoadExercises: (query: string) => void;
  onSelectExercise: (exercise: any) => void;
  onClose: () => void;
  colors: any;
  badgeStyles: any;
  sortBy: string;
  setSortBy: (value: any) => void;
  showSortSheet: boolean;
  setShowSortSheet: (value: boolean) => void;
}

export function ExercisePickerSheet({
  searchQuery,
  onSearchChange,
  exercises,
  loading,
  onLoadExercises,
  onSelectExercise,
  onClose,
  colors,
  badgeStyles,
  sortBy,
  setSortBy,
  showSortSheet,
  setShowSortSheet,
}: ExercisePickerSheetProps) {
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onLoadExercises(searchQuery);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, sortBy]);

  const getPrimaryMusclesColor = (muscle: string) => {
    const colors_map: Record<string, string> = {
      'грудь': '#F44336',
      'спина': '#2196F3',
      'ноги': '#4CAF50',
      'плечи': '#FF9800',
      'руки': '#9C27B0',
      'пресс': '#FFC107',
    };
    return colors_map[muscle.toLowerCase()] || colors.primary;
  };

  const sortedExercises = [...exercises].sort((a, b) => {
    if (sortBy === 'name-asc') return a.name.localeCompare(b.name, 'ru');
    if (sortBy === 'name-desc') return b.name.localeCompare(a.name, 'ru');
    return 0;
  });

  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
      <View style={{
        backgroundColor: colors.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
        paddingBottom: SPACING.lg,
      }}>
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: SPACING.lg,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}>
          <Text style={[typography.h5, { color: colors.textPrimary }]}>
            Добавить упражнение
          </Text>
          <TouchableOpacity onPress={onClose}>
            <X size={20} color={colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>
        </View>
        <View style={{ padding: SPACING.lg, paddingBottom: SPACING.md }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surfaceSecondary,
            borderRadius: BORDER_RADIUS.md,
            paddingHorizontal: SPACING.md,
          }}>
            <Search size={18} color={colors.textTertiary} strokeWidth={2} />
            <TextInput
              style={{
                flex: 1,
                padding: SPACING.md,
                fontSize: 16,
                color: colors.textPrimary,
              }}
              placeholder="Поиск по названию..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={onSearchChange}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => onSearchChange('')}>
                <X size={18} color={colors.textTertiary} strokeWidth={2} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => setShowSortSheet(true)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: sortBy !== 'name-asc' ? colors.primaryLight : 'transparent',
                justifyContent: 'center',
                alignItems: 'center',
                marginLeft: SPACING.xs,
              }}
            >
              <ArrowUpDown
                size={18}
                color={sortBy !== 'name-asc' ? colors.primary : colors.textTertiary}
                strokeWidth={2}
              />
            </TouchableOpacity>
          </View>
        </View>
        {loading ? (
          <View style={{ padding: SPACING.xl, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: SPACING.md }]}>
              Загрузка...
            </Text>
          </View>
        ) : sortedExercises.length === 0 ? (
          <View style={{ padding: SPACING.xl, alignItems: 'center' }}>
            <Dumbbell size={48} color={colors.textTertiary} strokeWidth={1.5} />
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: SPACING.md, textAlign: 'center' }]}>
              {searchQuery ? 'Упражнения не найдены' : 'Начните вводить название упражнения'}
            </Text>
          </View>
        ) : (
          <ScrollView style={{ paddingHorizontal: SPACING.lg }}>
            {sortedExercises.map((exercise) => {
              const primaryMuscles = exercise.primary_muscles || [];
              const borderColor = primaryMuscles.length > 0
                ? getMuscleColor(primaryMuscles[0])
                : colors.border;
              return (
                <TouchableOpacity
                  key={exercise.id}
                  onPress={() => onSelectExercise(exercise)}
                  style={{
                    padding: SPACING.md,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: SPACING.md,
                    borderLeftWidth: 4,
                    borderLeftColor: borderColor,
                  }}
                >
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: primaryMuscles[0] ? getPrimaryMusclesColor(primaryMuscles[0]) + '20' : colors.primary + '20',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Dumbbell size={20} color={primaryMuscles[0] ? getPrimaryMusclesColor(primaryMuscles[0]) : colors.primary} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: 4 }]}>
                      {exercise.name}
                    </Text>
                    {primaryMuscles.length > 0 && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                        {primaryMuscles.slice(0, 3).map((muscle: string, idx: number) => (
                          <View
                            key={idx}
                            style={[
                              badgeStyles.intensityBadge,
                              {
                                backgroundColor: getPrimaryMusclesColor(muscle) + '15',
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                badgeStyles.intensityText,
                                {
                                  color: getPrimaryMusclesColor(muscle),
                                  fontSize: 11,
                                },
                              ]}
                            >
                              {muscle}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                  <ChevronRight size={18} color={colors.textTertiary} strokeWidth={2} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
        <View style={{
          marginTop: SPACING.md,
          marginHorizontal: SPACING.lg,
          padding: SPACING.md,
          backgroundColor: colors.primaryLight,
          borderRadius: BORDER_RADIUS.md,
        }}>
          <Text style={[typography.caption, { color: colors.primary }]}>
            Параметры по умолчанию: 4 подхода × 8-12 повт., отдых 90с, средняя интенсивность
          </Text>
        </View>
        {showSortSheet && (
          <>
            <TouchableOpacity
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
              }}
              onPress={() => setShowSortSheet(false)}
              activeOpacity={1}
            />
            <View style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: SPACING.lg,
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
            }}>
              <Text style={[typography.h5, { color: colors.textPrimary, marginBottom: SPACING.md }]}>
                Сортировка
              </Text>
              {[
                { key: 'name-asc', label: 'По названию (А-Я)' },
                { key: 'name-desc', label: 'По названию (Я-А)' },
                { key: 'popularity', label: 'По популярности' },
              ].map(option => (
                <TouchableOpacity
                  key={option.key}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: SPACING.md,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                  onPress={() => {
                    setSortBy(option.key);
                    setShowSortSheet(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={[
                    typography.body,
                    {
                      color: sortBy === option.key ? colors.primary : colors.textPrimary,
                      fontWeight: sortBy === option.key ? '600' : '400',
                    }
                  ]}>
                    {option.label}
                  </Text>
                  {sortBy === option.key && (
                    <Check size={20} color={colors.primary} strokeWidth={2} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </View>
    </View>
  );
}