import { supabase, getString } from '../lib/supabase';
import { getExerciseReferenceData } from './exerciseReferenceService';

export interface ExerciseListItem {
  id: string; name: string; primary_muscles: string[]; equipment: string[];
  popularity?: number; can_be_activation?: boolean;
}
export type ExerciseSortBy = string;
export interface ExerciseFilters {
  search?: string; muscles?: string[]; categories?: string[]; equipment?: string[];
  activationOnly?: boolean; sortBy: ExerciseSortBy; limit: number; offset: number;
}
interface SearchExerciseRow {
  id: string; name: string; category: string; primary_muscles: string[];
  equipment: string[]; can_be_activation: boolean; popularity: number;
}
const sanitizeSearch = (s: string) => s.replace(/[%_\\]/g, ' ').replace(/\s+/g, ' ').trim();

export async function getExercises(filters: ExerciseFilters): Promise<ExerciseListItem[]> {
  const { data, error } = await supabase.rpc('search_exercises', {
    q: filters.search ? sanitizeSearch(filters.search) : undefined,
    muscle_filter: filters.muscles?.length ? filters.muscles : undefined,
    category_filter: filters.categories?.length ? filters.categories : undefined,
    equipment_filter: filters.equipment?.length ? filters.equipment : undefined,
    activation_filter: filters.activationOnly ? true : undefined,
    sort_by: filters.sortBy, page_limit: filters.limit, page_offset: filters.offset,
  });
  if (error) throw error;
  return ((data ?? []) as unknown as SearchExerciseRow[]).map((row) => ({
    id: row.id, name: row.name, primary_muscles: row.primary_muscles ?? [],
    equipment: row.equipment ?? [], popularity: Number(row.popularity) || 0,
    can_be_activation: row.can_be_activation ?? false,
  }));
}

export interface FilterOption { value: string; count: number; }
export interface ExerciseFilterOptions { categories: FilterOption[]; equipment: FilterOption[]; }
export async function getFilterOptions(): Promise<ExerciseFilterOptions> {
  const { data, error } = await supabase.rpc('get_exercise_filter_counts');
  if (error) throw error;
  return { categories: data?.categories ?? [], equipment: data?.equipment ?? [] };
}

export interface ExerciseDetail {
  id: string; name: string; technique: string; primary_muscles: string[]; secondary_muscles: string[];
  equipment: string[]; benefits: string; risks: string; injuries: string[]; alternatives: string[];
  settings: string; category: string | null; media_url: string | null; can_be_activation: boolean;
}
const DETAIL_FIELDS = 'id, name, technique, primary_muscles, secondary_muscles, benefits, risks, settings, category, media_url, can_be_activation';
export async function getExerciseById(id: string): Promise<ExerciseDetail | null> {
  const { data, error } = await supabase.from('exercises').select(DETAIL_FIELDS).eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const ref = (await getExerciseReferenceData([id]))[id] ?? { equipment: [], injuries: [], alternativeIds: [] };
  return {
    id: data.id, name: data.name, technique: getString(data, 'technique'),
    primary_muscles: data.primary_muscles ?? [], secondary_muscles: data.secondary_muscles ?? [],
    equipment: ref.equipment, benefits: getString(data, 'benefits'), risks: getString(data, 'risks'),
    injuries: ref.injuries, alternatives: ref.alternativeIds, can_be_activation: data.can_be_activation ?? false,
    settings: getString(data, 'settings'), category: data.category ?? null, media_url: data.media_url ?? null,
  };
}
export async function getExercisesByIds(ids: string[]): Promise<ExerciseListItem[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from('exercises').select('id, name, primary_muscles').in('id', ids);
  if (error) throw error;
  const refs = await getExerciseReferenceData(ids);
  return (data ?? []).map((row) => ({ id: row.id, name: row.name, primary_muscles: row.primary_muscles ?? [], equipment: refs[row.id]?.equipment ?? [] }));
}

export interface ExerciseRecords {
  maxWeight: number | null; repsAtMaxWeight: number; maxReps: number | null; estimatedOneRM: number | null;
  totalVolume: number; totalSets: number; workoutCount: number; lastPerformedAt: string | null;
}
interface RecordLogRow { weight_kg: number | null; reps: number | null; }
interface RecordWorkoutRow { id: string; finished_at: string | null; started_at: string | null; }
interface RecordWERow { id: string; workouts: RecordWorkoutRow | null; workout_logs: RecordLogRow[] | null; }
export async function getExerciseRecords(exerciseId: string, userId: string): Promise<ExerciseRecords> {
  const { data, error } = await supabase.from('workout_exercises')
    .select('id, workouts!inner ( id, finished_at, started_at ), workout_logs ( weight_kg, reps )')
    .eq('exercise_id', exerciseId).eq('workouts.user_id', userId);
  if (error) throw error;
  let maxWeight: number | null = null, repsAtMaxWeight = 0, maxReps: number | null = null, bestE1RM: number | null = null;
  let totalVolume = 0, totalSets = 0, workoutCount = 0, lastPerformedAt: string | null = null;
  ((data ?? []) as unknown as RecordWERow[]).forEach((we) => {
    const logs = we.workout_logs ?? []; if (!logs.length) return; workoutCount++;
    const performedAt = we.workouts?.finished_at || we.workouts?.started_at || null;
    if (performedAt && (!lastPerformedAt || performedAt > lastPerformedAt)) lastPerformedAt = performedAt;
    logs.forEach((log) => {
      const weight = Number(log.weight_kg) || 0, reps = Number(log.reps) || 0;
      if (weight <= 0 && reps <= 0) return; totalSets++; totalVolume += weight * reps;
      if (weight > 0 && (maxWeight === null || weight > maxWeight)) { maxWeight = weight; repsAtMaxWeight = reps; }
      if (reps > 0 && (maxReps === null || reps > maxReps)) maxReps = reps;
      if (weight > 0 && reps > 0) { const e1rm = weight * (1 + reps / 30); if (bestE1RM === null || e1rm > bestE1RM) bestE1RM = e1rm; }
    });
  });
  return { maxWeight, repsAtMaxWeight, maxReps, estimatedOneRM: bestE1RM, totalVolume, totalSets, workoutCount, lastPerformedAt };
}
