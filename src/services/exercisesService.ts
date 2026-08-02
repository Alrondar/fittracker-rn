import { supabase, getList, getString } from '../lib/supabase';

/**
 * Сервис упражнений.
 * Все запросы к БД для справочника, детального экрана и рекордов.
 * В UI-компонентах supabase.from() не используется (правило CLAUDE.md).
 */

// ============================================================================
// СПРАВОЧНИК: постраничный список + поиск + сортировка
// ============================================================================

/** Лёгкая модель для списка (тяжёлые поля грузятся на детальном экране) */
export interface ExerciseListItem {
  id: string;
  name: string;
  primary_muscles: string[];
  equipment: string[];
  popularity?: number; // количество использований в тренировках (есть только у getExercises)
  can_be_activation?: boolean;
}

   export type ExerciseSortBy = string; // было: 'name-asc' | 'name-desc' | 'popularity'

export interface ExerciseFilters {
  search?: string;
  muscles?: string[];
  categories?: string[];
  equipment?: string[];
  activationOnly?: boolean;
  sortBy: ExerciseSortBy;
  limit: number;
  offset: number;
}

/** Локальный тип для Returns RPC search_exercises (ARCH-6: вместо any). */
interface SearchExerciseRow {
  id: string;
  name: string;
  category: string;
  primary_muscles: string[];
  equipment: string[];
  can_be_activation: boolean;
  popularity: number;
}

// Поля для лёгких запросов (список, альтернативы)
const LIST_FIELDS = 'id, name, primary_muscles, equipment';

/**
 * Защита от LIKE-инъекций: пользовательские % _ \ не должны ломать шаблон поиска.
 */
const sanitizeSearch = (s: string): string =>
  s.replace(/[%_\\]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Постраничный поиск + фильтрация + сортировка через RPC `search_exercises`.
 * «ё» нормализуется в SQL с обеих сторон, популярность считается по workout_exercises.
 *
 * ARCH-6: row выводится типом supabase из Returns RPC (primary_muscles/equipment
 * уже string[]), поэтому getList не нужен — прямой доступ убирает протекание any.
 */
export async function getExercises(filters: ExerciseFilters): Promise<ExerciseListItem[]> {
  const { data, error } = await supabase.rpc('search_exercises', {
    q: filters.search ? sanitizeSearch(filters.search) : undefined,
    muscle_filter: filters.muscles?.length ? filters.muscles : undefined,
    category_filter: filters.categories?.length ? filters.categories : undefined,
    equipment_filter: filters.equipment?.length ? filters.equipment : undefined,
    activation_filter: filters.activationOnly ? true : undefined,
    sort_by: filters.sortBy,
    page_limit: filters.limit,
    page_offset: filters.offset,
  });
  if (error) throw error;
  // ARCH-6: supabase-js не выводит тип для rpc из-за Exact-проверки Args,
  // поэтому используем локальный интерфейс + as unknown as (детерминированно).
  const rows = (data ?? []) as unknown as SearchExerciseRow[];
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    primary_muscles: row.primary_muscles ?? [],
    equipment: row.equipment ?? [],
    popularity: Number(row.popularity) || 0,
    can_be_activation: row.can_be_activation ?? false,
  }));
}

// ============================================================================
// СЛОВАРИ ФИЛЬТРОВ (категории + оборудование со счётчиками)
// ============================================================================

export interface FilterOption {
  value: string;
  count: number;
}

export interface ExerciseFilterOptions {
  categories: FilterOption[];
  equipment: FilterOption[];
}

/**
 * Категории и оборудование со счётчиками использования.
 * PERF-2: агрегация на сервере (GROUP BY + unnest) вместо выборки всех 870+
 * строк и клиентского пересчёта. Один лёгкий RPC, кэшируется staleTime: Infinity.
 */
export async function getFilterOptions(): Promise<ExerciseFilterOptions> {
  const { data, error } = await supabase.rpc('get_exercise_filter_counts');
  if (error) throw error;
  return {
    categories: data?.categories ?? [],
    equipment: data?.equipment ?? [],
  };
}

// ============================================================================
// ДЕТАЛЬНЫЙ ЭКРАН: одно упражнение со всеми полями
// ============================================================================

/** Полная модель упражнения для детального экрана */
export interface ExerciseDetail {
  id: string;
  name: string;
  technique: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  equipment: string[];
  benefits: string;
  risks: string;
  injuries: string[];
  alternatives: string[];
  settings: string;
  category: string | null;
  media_url: string | null;
  can_be_activation: boolean;
}

// ⚠️ Без description — этой колонки в таблице exercises НЕТ (ошибка 42703).
const DETAIL_FIELDS =
  'id, name, technique, primary_muscles, secondary_muscles, equipment, benefits, risks, injuries, alternatives, settings, category, media_url, can_be_activation';

/**
 * Загрузка одного упражнения.
 * maybeSingle() вернёт null вместо ошибки PGRST116, если строки нет.
 */
export async function getExerciseById(id: string): Promise<ExerciseDetail | null> {
  const { data, error } = await supabase
    .from('exercises')
    .select(DETAIL_FIELDS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    technique: getString(data, 'technique'),
    primary_muscles: getList(data, 'primary_muscles'),
    secondary_muscles: getList(data, 'secondary_muscles'),
    equipment: getList(data, 'equipment'),
    benefits: getString(data, 'benefits'),
    risks: getString(data, 'risks'),
    injuries: getList(data, 'injuries'),
    alternatives: getList(data, 'alternatives'),
    can_be_activation: data.can_be_activation ?? false,
    settings: getString(data, 'settings'),
    category: data.category ?? null,
    media_url: data.media_url ?? null,
  };
}

/**
 * Загрузка списка упражнений по ID (для блока альтернатив).
 * Возвращает лёгкую модель без popularity.
 *
 * ARCH-6: row выводится типом supabase из exercises.Row (primary_muscles: string[],
 * equipment: string[] | null) — прямой доступ вместо getList/`:any`.
 */
export async function getExercisesByIds(ids: string[]): Promise<ExerciseListItem[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('exercises')
    .select(LIST_FIELDS)
    .in('id', ids);
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    primary_muscles: row.primary_muscles ?? [],
    equipment: row.equipment ?? [],
  }));
}

// ============================================================================
// ЛИЧНЫЕ РЕКОРДЫ: максимумы из workout_logs
// ============================================================================

export interface ExerciseRecords {
  maxWeight: number | null;
  repsAtMaxWeight: number;
  maxReps: number | null;
  estimatedOneRM: number | null; // расчётный разовый максимум (формула Эпли)
  totalVolume: number;           // суммарный тоннаж, кг
  totalSets: number;
  workoutCount: number;
  lastPerformedAt: string | null;
}

// ARCH-6: локальные row-интерфейсы для join-структуры getExerciseRecords
// (вместо we: any / logs: any[]). Отражают select:
//   workout_exercises ( id, workouts!inner ( id, finished_at, started_at ), workout_logs ( weight_kg, reps ) )
interface RecordLogRow {
  weight_kg: number | null;
  reps: number | null;
}
interface RecordWorkoutRow {
  id: string;
  finished_at: string | null;
  started_at: string | null;
}
interface RecordWERow {
  id: string;
  // workouts!inner гарантирует строку в рантайме, но вывод supabase-js может дать null —
  // поэтому доступ через ?. (defense-in-depth, без !-assertion).
  workouts: RecordWorkoutRow | null;
  workout_logs: RecordLogRow[] | null;
}

/**
 * Личные рекорды пользователя по упражнению.
 * Один запрос: workout_exercises → workouts + workout_logs.
 * `workouts!inner` — корректный inner join: возвращаются только те
 * workout_exercises, чья тренировка принадлежит пользователю.
 */
export async function getExerciseRecords(
  exerciseId: string,
  userId: string,
): Promise<ExerciseRecords> {
  const { data, error } = await supabase
    .from('workout_exercises')
    .select('id, workouts!inner ( id, finished_at, started_at ), workout_logs ( weight_kg, reps )')
    .eq('exercise_id', exerciseId)
    .eq('workouts.user_id', userId);
  if (error) throw error;

  let maxWeight: number | null = null;
  let repsAtMaxWeight = 0;
  let maxReps: number | null = null;
  let bestE1RM: number | null = null;
  let totalVolume = 0;
  let totalSets = 0;
  let workoutCount = 0;
  let lastPerformedAt: string | null = null;

  const rows = (data ?? []) as unknown as RecordWERow[];
  rows.forEach((we) => {
    const logs = we.workout_logs ?? [];
    if (logs.length === 0) return;
    // Тренировка считается «выполненной», если есть хоть один записанный подход
    workoutCount += 1;
    const performedAt = we.workouts?.finished_at || we.workouts?.started_at || null;
    if (performedAt && (!lastPerformedAt || performedAt > lastPerformedAt)) {
      lastPerformedAt = performedAt;
    }
    logs.forEach((log) => {
      const weight = Number(log.weight_kg) || 0;
      const reps = Number(log.reps) || 0;
      if (weight <= 0 && reps <= 0) return;
      totalSets += 1;
      totalVolume += weight * reps;
      if (weight > 0 && (maxWeight === null || weight > maxWeight)) {
        maxWeight = weight;
        repsAtMaxWeight = reps;
      }
      if (reps > 0 && (maxReps === null || reps > maxReps)) {
        maxReps = reps;
      }
      if (weight > 0 && reps > 0) {
        const e1rm = weight * (1 + reps / 30); // формула Эпли
        if (bestE1RM === null || e1rm > bestE1RM) bestE1RM = e1rm;
      }
    });
  });

  return {
    maxWeight,
    repsAtMaxWeight,
    maxReps,
    estimatedOneRM: bestE1RM,
    totalVolume,
    totalSets,
    workoutCount,
    lastPerformedAt,
  };
}