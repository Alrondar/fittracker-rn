// src/hooks/useExerciseReplaceSearch.ts
// SEARCH-ALT (16.10): поиск замены по всей базе из блока упражнения на экране
// тренировки. Отличия от useExercises (справочник), из-за которых хук отдельный:
//  - запрос включается только когда строка видна и есть ≥2 символа или фильтр
//    (useExercises на монтировании сразу тянет 40 строк без запроса);
//  - одна страница выдачи вместо бесконечной прокрутки (панель живёт в ячейке);
//  - по строкам выдачи считается «нельзя при активной травме» — в карточке
//    справочника этого нет, а здесь выбор ведёт к замене в тренировке.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  getExercises,
  getFilterOptions,
  type ExerciseListItem,
  type FilterOption,
} from '../services/exercisesService';
import { getExerciseContraindications } from '../services/injuriesService';
import {
  BODY_PART_LABELS,
  contraindicationMatchesInjury,
  type UserInjury,
} from '../constants/injuries';
import { Q } from '../lib/queryPolicy';

/** Одна страница выдачи: панель берёт первые строки, шторка «Показать все» — все. */
export const REPLACE_SEARCH_LIMIT = 60;
const DEBOUNCE_MS = 300;
const MIN_SEARCH_LENGTH = 2;

/** Та же нормализация, что в справочнике и в SQL: trim + «ё» → «е». */
const normalizeSearch = (s: string): string => s.trim().replace(/ё/gi, 'е');

export function useExerciseReplaceSearch(activeInjuries: UserInjury[], visible: boolean) {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [muscles, setMuscles] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);

  // Debounce + порог 2 символа — как в справочнике, чтобы поведение поля
  // («пока один символ — список не дёргаем, подсказка видна») не разъезжалось.
  useEffect(() => {
    const timer = setTimeout(() => {
      const normalized = normalizeSearch(input);
      setQuery(normalized.length >= MIN_SEARCH_LENGTH ? normalized : '');
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input]);

  const tooShort = useMemo(() => {
    const len = input.trim().length;
    return len > 0 && len < MIN_SEARCH_LENGTH;
  }, [input]);

  /** Есть чем фильтровать → панель показаема, запрос имеет смысл. */
  const hasCriteria = query.length > 0 || muscles.length > 0 || equipment.length > 0;

  const {
    data: rows,
    isFetching,
    isError,
    refetch,
  } = useQuery<ExerciseListItem[], Error>({
    queryKey: ['exerciseReplaceSearch', muscles, equipment, query],
    queryFn: () =>
      getExercises({
        search: query || undefined,
        muscles: muscles.length > 0 ? muscles : undefined,
        equipment: equipment.length > 0 ? equipment : undefined,
        sortBy: 'name-asc',
        limit: REPLACE_SEARCH_LIMIT,
        offset: 0,
      }),
    enabled: visible && hasCriteria,
    ...Q.SLOW,
  });

  // Словарь снаряжения — тот же кэш, что у справочника (один запрос на приложение).
  const { data: filterOptions } = useQuery({
    queryKey: ['exerciseFilterOptions'],
    queryFn: getFilterOptions,
    enabled: visible,
    ...Q.STATIC,
  });
  const equipmentOptions: FilterOption[] = useMemo(
    () => filterOptions?.equipment ?? [],
    [filterOptions]
  );

  const ids = useMemo(() => (rows ?? []).map((row) => row.id), [rows]);
  const { data: contraindications } = useQuery({
    queryKey: ['exerciseContraindications', ids],
    queryFn: () => getExerciseContraindications(ids),
    enabled: ids.length > 0 && activeInjuries.length > 0,
    ...Q.STATIC,
  });

  /** id → текст предупреждения, если противопоказание попадает в активную травму. */
  const warnings = useMemo(() => {
    const map: Record<string, string> = {};
    if (!contraindications || activeInjuries.length === 0) return map;
    for (const [id, contras] of Object.entries(contraindications)) {
      const hits = contras.filter((c) =>
        activeInjuries.some((injury) => contraindicationMatchesInjury(c, injury))
      );
      if (hits.length > 0) {
        map[id] = hits.map((h) => BODY_PART_LABELS[h.body_part] ?? h.body_part).join(', ');
      }
    }
    return map;
  }, [contraindications, activeInjuries]);

  const toggleMuscle = useCallback((muscle: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMuscles((prev) =>
      prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle]
    );
  }, []);

  const toggleEquipment = useCallback((item: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEquipment((prev) =>
      prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item]
    );
  }, []);

  const reset = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setInput('');
    setQuery('');
    setMuscles([]);
    setEquipment([]);
  }, []);

  return {
    input,
    setInput,
    tooShort,
    hasCriteria,
    rows: rows ?? [],
    isFetching,
    isError,
    refetch,
    muscles,
    toggleMuscle,
    equipment,
    toggleEquipment,
    reset,
    equipmentOptions,
    warnings,
    activeFiltersCount: muscles.length + equipment.length,
  };
}

export type ReplaceSearchState = ReturnType<typeof useExerciseReplaceSearch>;
