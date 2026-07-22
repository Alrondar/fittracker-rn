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

export type ExerciseSortBy = 'name-asc' | 'name-desc' | 'popularity';

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
 */
export async function getExercises(filters: ExerciseFilters): Promise<ExerciseListItem[]> {
  const { data, error } = await supabase.rpc('search_exercises', {
    q: filters.search ? sanitizeSearch(filters.search) : null,
    muscle_filter: filters.muscles?.length ? filters.muscles : null,
    category_filter: filters.categories?.length ? filters.categories : null,
    equipment_filter: filters.equipment?.length ? filters.equipment : null,
    activation_filter: filters.activationOnly ? true : null,   // ✅ НОВОЕ
    sort_by: filters.sortBy,
    page_limit: filters.limit,
    page_offset: filters.offset,
  });
  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    primary_muscles: getList(row, 'primary_muscles'),
    equipment: getList(row, 'equipment'),
    popularity: Number(row.popularity) || 0,
    can_be_activation: row.can_be_activation ?? false,   // ✅ НОВОЕ
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
 * Один лёгкий запрос (2 колонки), кэшируется на клиенте (staleTime: Infinity).
 */
export async function getFilterOptions(): Promise<ExerciseFilterOptions> {
  const { data, error } = await supabase
    .from('exercises')
    .select('category, equipment');
  if (error) throw error;

  const categoryCounts = new Map<string, number>();
  const equipmentCounts = new Map<string, number>();

  (data || []).forEach((row: any) => {
    const cat = row.category;
    if (typeof cat === 'string' && cat.trim()) {
      categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
    }
    getList(row, 'equipment').forEach(eq => {
      equipmentCounts.set(eq, (equipmentCounts.get(eq) ?? 0) + 1);
    });
  });

  const toOptions = (map: Map<string, number>): FilterOption[] =>
    Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);

  return {
    categories: toOptions(categoryCounts),
    equipment: toOptions(equipmentCounts),
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
 */
export async function getExercisesByIds(ids: string[]): Promise<ExerciseListItem[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('exercises')
    .select(LIST_FIELDS)
    .in('id', ids);
  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    primary_muscles: getList(row, 'primary_muscles'),
    equipment: getList(row, 'equipment'),
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

/**
 * Личные рекорды пользователя по упражнению.
 * Один запрос: workout_exercises → workouts + workout_logs.
 * `workouts!inner` — корректный inner join: возвращаются только те
 * workout_exercises, чья тренировка принадлежит пользователю.
 */
export async function getExerciseRecords(
  exerciseId: string,
  userId: string
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

  (data || []).forEach((we: any) => {
    const logs: any[] = we.workout_logs || [];
    if (logs.length === 0) return;

    // Тренировка считается «выполненной», если есть хоть один записанный подход
    workoutCount += 1;
    const performedAt = we.workouts?.finished_at || we.workouts?.started_at || null;
    if (performedAt && (!lastPerformedAt || performedAt > lastPerformedAt)) {
      lastPerformedAt = performedAt;
    }

    logs.forEach(log => {
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