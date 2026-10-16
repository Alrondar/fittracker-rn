// src/components/workout/ExerciseReplaceSearch.tsx
// SEARCH-ALT (16.10): поиск замены по всей базе прямо на экране тренировки.
// Разделён на две части намеренно: строка с фильтрами лежит НАД полосой слайдеров
// и не скроллится по горизонтали, а выдача — последний ребёнок блока, чтобы лежать
// ПОВЕРХ карточек (на Android следующий sibling рисуется поверх предыдущего,
// zIndex между sibling'ами ненадёжен). Состояние поиска живёт в ExerciseSlider:
// карточка из поиска не сохраняется и сбрасывается при выходе с экрана.
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, View, type TextInput } from 'react-native';
import { feedback } from '../../lib/feedback';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { SlidersHorizontal, X } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { Q } from '../../lib/queryPolicy';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { PressableScale } from '../ui/PressableScale';
import { SheetShell } from '../ui/SheetShell';
import { ExerciseSearchBar } from '../exercises/ExerciseSearchBar';
import { MuscleGroupFilters } from '../exercises/MuscleGroupFilters';
import { ExerciseRow } from '../exercises/ExerciseRow';
import { EquipmentSheet } from '../exercises/EquipmentSheet';
import { getExerciseById, type ExerciseListItem } from '../../services/exercisesService';
import {
  REPLACE_SEARCH_LIMIT,
  type ReplaceSearchState,
} from '../../hooks/useExerciseReplaceSearch';
import type { AlternativeExercise } from '../../types/workout';

/** Сколько строк видно в панели поверх карточек. */
const PANEL_VISIBLE = 5;
/** Строки в панели и в шторке лежат внутри своих контейнеров — поля справочника не нужны. */
const ROW_STYLE = { marginHorizontal: 0, marginBottom: SPACING.xs } as const;

interface ControlsProps {
  search: ReplaceSearchState;
  /** Поле полосы слайдеров: строка должна быть ровно по карточкам, не во всю ширину. */
  sideInset: number;
}

/** Приклеенная над полосой слайдеров строка поиска + фильтры. */
export const ExerciseReplaceSearchControls = memo(function ExerciseReplaceSearchControls({
  search,
  sideInset,
}: ControlsProps) {
  const { colors } = useTheme();
  const inputRef = useRef<TextInput>(null);
  // Фильтры раскрываются по первому фокусу и остаются раскрытыми, пока видна
  // строка: схлопывать по blur нельзя — на Android blur приходит ещё на
  // touch-down, и чип фильтра исчезал бы до того, как на него нажмут.
  const [expanded, setExpanded] = useState(false);
  const [showEquipment, setShowEquipment] = useState(false);
  const open = expanded || search.hasCriteria || search.tooShort;

  return (
    <View style={{ backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: sideInset }}>
        <ExerciseSearchBar
          inputRef={inputRef}
          value={search.input}
          onChangeText={search.setInput}
          isSearching={search.isFetching}
          tooShort={search.tooShort}
          onFocus={() => setExpanded(true)}
        />
      </View>
      {open && (
        <>
          <MuscleGroupFilters
            selectedMuscles={search.muscles}
            onToggleMuscle={search.toggleMuscle}
          />
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: SPACING.md,
              paddingHorizontal: SPACING.lg,
              paddingBottom: SPACING.md,
            }}
          >
            <PressableScale
              onPress={() => setShowEquipment(true)}
              accessibilityRole="button"
              accessibilityLabel="Фильтр по снаряжению"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: SPACING.md,
                paddingVertical: SPACING.sm,
                borderRadius: BORDER_RADIUS.full,
                borderWidth: 1,
                borderColor: search.equipment.length > 0 ? colors.primary : colors.border,
                backgroundColor: search.equipment.length > 0 ? colors.primaryLight : colors.surface,
              }}
            >
              <SlidersHorizontal
                size={14}
                color={search.equipment.length > 0 ? colors.primary : colors.textSecondary}
                strokeWidth={2}
              />
              <Text
                style={[
                  typography.label,
                  {
                    fontWeight: '600',
                    color: search.equipment.length > 0 ? colors.primary : colors.textPrimary,
                  },
                ]}
              >
                Снаряжение
                {search.equipment.length > 0 ? ` · ${search.equipment.length}` : ''}
              </Text>
            </PressableScale>
            {search.activeFiltersCount > 0 && (
              <PressableScale
                onPress={search.reset}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Сбросить фильтры"
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <X size={14} color={colors.textTertiary} strokeWidth={2} />
                <Text style={[typography.caption, { color: colors.textTertiary }]}>Сбросить</Text>
              </PressableScale>
            )}
          </View>
        </>
      )}

      {/* Шкаф снаряжения — через нативный Modal: SheetShell-подобные absolute-листы
          вне Modal позиционируются от носителя, а носитель здесь — ячейка списка. */}
      <Modal
        transparent
        visible={showEquipment}
        animationType="fade"
        onRequestClose={() => setShowEquipment(false)}
      >
        <EquipmentSheet
          options={search.equipmentOptions}
          selected={search.equipment}
          onToggle={search.toggleEquipment}
          onReset={() => search.equipment.forEach((item) => search.toggleEquipment(item))}
          onClose={() => setShowEquipment(false)}
        />
      </Modal>
    </View>
  );
});

interface PanelProps {
  search: ReplaceSearchState;
  /** Основное упражнение блока: «заменить самого себя» в выдаче быть не должно. */
  excludeExerciseId: string;
  /** Верх панели = низ строки поиска (измеряется в ExerciseSlider). */
  top: number;
  /** Боковой отступ = padding полосы слайдеров, чтобы панель стояла по карточкам. */
  sideInset: number;
  /** Не выше основной карточки: панель не должна выходить за границы ячейки списка. */
  maxHeight: number;
  onPicked: (card: AlternativeExercise) => void;
}

/** Выдача: оверлей поверх карточек + шторка «Показать все». */
export function ExerciseReplaceSearchPanel({
  search,
  excludeExerciseId,
  top,
  sideInset,
  maxHeight,
  onPicked,
}: PanelProps) {
  const { colors } = useTheme();
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  // Выдача прячется сразу после выбора: оверлей лежит ПОВЕРХ карточек и иначе
  // закрыл бы результат тапа. Снова открывается при изменении критериев поиска.
  const [hidden, setHidden] = useState(false);

  const rows = useMemo(
    () => search.rows.filter((row: ExerciseListItem) => row.id !== excludeExerciseId),
    [search.rows, excludeExerciseId]
  );

  // Карточка формата «альтернатива» собирается из справочника: строка выдачи
  // search_exercises не несёт technique/benefits/risks/противопоказания.
  const detail = useQuery({
    queryKey: ['exerciseReplacePick', pickedId],
    queryFn: () => getExerciseById(pickedId as string),
    enabled: !!pickedId,
    ...Q.STATIC,
  });

  useEffect(() => {
    if (!pickedId) return;
    if (detail.isError) {
      setPickedId(null);
      feedback.alert('Не удалось загрузить упражнение', 'Проверь соединение и попробуй снова');
      return;
    }
    const data = detail.data;
    if (!data) return;
    setPickedId(null);
    setShowAll(false);
    setHidden(true);
    onPicked({
      id: data.id,
      name: data.name,
      primary_muscles: data.primary_muscles,
      secondary_muscles: data.secondary_muscles,
      technique: data.technique,
      equipment: data.equipment,
      settings: data.settings,
      benefits: data.benefits,
      risks: data.risks,
      injuries: data.injuries,
      media_url: data.media_url,
      relation_type: null,
    });
  }, [detail.data, detail.isError, pickedId, onPicked]);

  const handlePress = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPickedId(id);
  }, []);

  const closeAll = useCallback(() => setShowAll(false), []);

  useEffect(() => {
    setHidden(false);
  }, [search.input, search.muscles, search.equipment]);

  if (!search.hasCriteria && !search.isError) return null;

  // Противопоказанное при активной травме упражнение остаётся в выдаче с
  // предупреждением (вердикт 16.10); выбранное — обязательно, иначе карточка
  // исчезнет на глазах.
  const visibleRows = rows.filter((row) => !search.warnings[row.id] || row.id === pickedId);

  return (
    <>
      {/* Оверлей скрывается по выбору, а Modal остаётся смонтированным: иначе
          шторка «Показать все» исчезала бы без выхода-анимации. */}
      {!hidden && (
        <View
          style={{
            position: 'absolute',
            top,
            left: sideInset,
            right: sideInset,
            maxHeight,
            backgroundColor: colors.surface,
            borderRadius: BORDER_RADIUS.lg,
            borderWidth: 1,
            borderColor: colors.border,
            padding: SPACING.sm,
          }}
        >
          {search.isError ? (
            <View style={{ padding: SPACING.md, alignItems: 'center', gap: SPACING.sm }}>
              <Text
                style={[typography.bodySmall, { color: colors.textSecondary, textAlign: 'center' }]}
              >
                Не удалось найти упражнения
              </Text>
              <PressableScale
                onPress={() => search.refetch()}
                accessibilityRole="button"
                accessibilityLabel="Повторить поиск"
              >
                <Text style={[typography.labelBold, { color: colors.primary }]}>Повторить</Text>
              </PressableScale>
            </View>
          ) : (
            <>
              {!!pickedId && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: SPACING.sm,
                    paddingHorizontal: SPACING.sm,
                    paddingBottom: SPACING.sm,
                  }}
                >
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    Готовим карточку…
                  </Text>
                </View>
              )}
              <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} bounces={false}>
                {visibleRows.slice(0, PANEL_VISIBLE).map((row) => (
                  <ExerciseRow
                    key={row.id}
                    item={row}
                    onPress={handlePress}
                    warning={search.warnings[row.id] ?? null}
                    style={ROW_STYLE}
                  />
                ))}
              </ScrollView>
              {!search.isFetching && visibleRows.length === 0 && (
                <Text
                  style={[
                    typography.bodySmall,
                    { color: colors.textSecondary, textAlign: 'center', padding: SPACING.lg },
                  ]}
                >
                  Упражнения не найдены
                </Text>
              )}
              {(rows.length > PANEL_VISIBLE || search.activeFiltersCount > 0) && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
                  {rows.length > PANEL_VISIBLE && (
                    <PressableScale
                      onPress={() => setShowAll(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Показать все найденные упражнения"
                      style={{ flex: 1, paddingVertical: SPACING.sm }}
                    >
                      <Text
                        style={[
                          typography.labelBold,
                          { color: colors.primary, textAlign: 'center' },
                        ]}
                      >
                        Показать все ({rows.length})
                      </Text>
                    </PressableScale>
                  )}
                  {search.activeFiltersCount > 0 && (
                    <PressableScale
                      onPress={search.reset}
                      accessibilityRole="button"
                      accessibilityLabel="Сбросить фильтры"
                      style={{ paddingVertical: SPACING.sm }}
                    >
                      <Text style={[typography.labelBold, { color: colors.textTertiary }]}>
                        Сбросить
                      </Text>
                    </PressableScale>
                  )}
                </View>
              )}
            </>
          )}
        </View>
      )}

      <Modal transparent visible={showAll} animationType="slide" onRequestClose={closeAll}>
        <SheetShell isModal title="Все найденные упражнения" onClose={closeAll}>
          {rows.map((row) => (
            <ExerciseRow
              key={row.id}
              item={row}
              onPress={handlePress}
              warning={search.warnings[row.id] ?? null}
              style={ROW_STYLE}
            />
          ))}
          {rows.length >= REPLACE_SEARCH_LIMIT && (
            <Text
              style={[
                typography.captionSmall,
                { color: colors.textTertiary, textAlign: 'center', paddingVertical: SPACING.md },
              ]}
            >
              Показаны первые {REPLACE_SEARCH_LIMIT}. Уточни запрос или фильтры.
            </Text>
          )}
        </SheetShell>
      </Modal>
    </>
  );
}
