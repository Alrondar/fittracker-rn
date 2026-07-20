import { supabase, getList, getString } from '../lib/supabase';


/** Лёгкая модель для списка — тяжёлые поля грузит детальный экран */
export interface ExerciseListItem {
  id: string;
  name: string;
  primary_muscles: string[];
  equipment: string[];
}

export type ExerciseSortBy = 'name-asc' | 'name-desc' | 'popularity';

export interface ExerciseFilters {
  search?: string;
  muscles?: string[];
  categories?: string[]; // ✅ НОВОЕ
  equipment?: string[];  // ✅ НОВОЕ
  sortBy: ExerciseSortBy;
  limit: number;
  offset: number;
}

// Только поля карточки списка: ~95% payload'а меньше, чем select('*')
const LIST_FIELDS = 'id, name, primary_muscles, equipment';

/**
 * Постраничная загрузка упражнений с серверной фильтрацией и сортировкой.
 */
export async function getExercises(filters: ExerciseFilters): Promise<ExerciseListItem[]> {
  let query = supabase.from('exercises').select(LIST_FIELDS);

  // Фильтр по мышцам (массивная колонка → overlaps)
  if (filters.muscles && filters.muscles.length > 0) {
    query = query.overlaps('primary_muscles', filters.muscles);
  }

  // ✅ НОВОЕ: Фильтр по категориям (скалярная колонка → in)
  if (filters.categories && filters.categories.length > 0) {
    query = query.in('category', filters.categories);
  }

  // ✅ НОВОЕ: Фильтр по оборудованию (массивная колонка → overlaps)
  if (filters.equipment && filters.equipment.length > 0) {
    query = query.overlaps('equipment', filters.equipment);
  }

  // Поиск: по названию ИЛИ упоминанию мышцы
  if (filters.search) {
    // Запятые и скобки ломают синтаксис .or() в PostgREST — вычищаем
    const q = filters.search.replace(/[,%()]/g, ' ').trim();
    if (q) {
      // Если сервер отклонит каст ::text — замените на query.ilike('name', `%${q}%`)
      query = query.or(`name.ilike.%${q}%,primary_muscles::text.ilike.%${q}%`);
    }
  }

  // Сортировка ('popularity' пока эквивалентен name-asc — данных о популярности нет)
  const ascending = filters.sortBy !== 'name-desc';
  query = query.order('name', { ascending, nullsFirst: false });

  const { data, error } = await query.range(filters.offset, filters.offset + filters.limit - 1);
  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    primary_muscles: getList(row, 'primary_muscles'),
    equipment: getList(row, 'equipment'),
  }));
}

// ===== Словари фильтров =====

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
 * Один лёгкий запрос (2 колонки, без тяжёлых полей), кэшируется навечно —
 * справочник статичен.
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
// ===== Детальный экран упражнения =====

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
}

// Строго по колонкам таблицы exercises (сверено с types/index.ts).
// Колонки description в БД нет — явный select несуществующей колонки
// ронял запрос с ошибкой 42703.
const DETAIL_FIELDS =
  'id, name, technique, primary_muscles, secondary_muscles, equipment, benefits, risks, injuries, alternatives, settings, category, media_url';

/**
 * Загрузка одного упражнения со всеми полями.
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
    settings: getString(data, 'settings'),
    category: data.category ?? null,
    media_url: data.media_url ?? null,
  };
}

/**
 * Загрузка списка упражнений по ID (для блока альтернатив).
 * Возвращает лёгкую модель — тяжёлые поля не нужны.
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