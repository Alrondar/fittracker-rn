// src/services/injuriesService.ts

import { supabase } from '../lib/supabase';

// ============================================================================
// ТИПЫ
// ============================================================================

export interface Injury {
  id: string;
  body_part: string;
  injury_type: string;
  severity: 'low' | 'medium' | 'high';
  status: 'active' | 'recovering' | 'recovered';
  description: string | null;
  notes: string | null;
  restricted_exercises: string[] | null;
  created_at: string;
  recovered_at: string | null;
}

export interface InjuryInput {
  body_part: string;
  injury_type: string;
  severity: 'low' | 'medium' | 'high';
  status?: 'active' | 'recovering' | 'recovered';
  description?: string | null;
  notes?: string | null;
  restricted_exercises?: string[] | null;
}

// ============================================================================
// CRUD ТРАВМ (user_injuries)
// ============================================================================

export async function getInjuries(userId: string): Promise<Injury[]> {
  const { data, error } = await supabase
    .from('user_injuries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Injury[];
}

export async function createInjury(userId: string, input: InjuryInput): Promise<Injury> {
  const { data, error } = await supabase
    .from('user_injuries')
    .insert({ ...input, user_id: userId, status: input.status ?? 'active' })
    .select()
    .single();

  if (error) throw error;
  return data as Injury;
}

export async function updateInjury(id: string, input: InjuryInput): Promise<Injury> {
  const { data, error } = await supabase
    .from('user_injuries')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Injury;
}

export async function markInjuryRecovered(id: string): Promise<void> {
  const { error } = await supabase
    .from('user_injuries')
    .update({
      status: 'recovered',
      recovered_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteInjury(id: string): Promise<void> {
  const { error } = await supabase
    .from('user_injuries')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// ARCH-8: LOOKUP ПРОТИВОПОКАЗАНИЙ ПО ТАБЛИЦЕ (уровень 1 = avoid)
// ============================================================================

/**
 * Lookup противопоказаний по таблице injury_exercise_warnings для уровня 1 (avoid).
 * Заменяет keyword-эвристику matchesContraindication.
 *
 * Используется в:
 * - computeExerciseWarnings (constants/injuries.ts) — для avoid-предупреждений
 * - warmupService.generateWarmup — для исключения противопоказанных упражнений
 *
 * @param exerciseIds - ID упражнений для проверки.
 * @returns Record<exercise_id, Array<{ body_part, injury_type, level }>>.
 */
export async function getExerciseContraindications(
  exerciseIds: string[],
): Promise<
  Record<
    string,
    Array<{ body_part: string; injury_type: string; level: 'avoid' | 'caution' }>
  >
> {
  if (exerciseIds.length === 0) return {};

  const { data, error } = await supabase
    .from('injury_exercise_warnings')
    .select('exercise_id, body_part, injury_type, level')
    .in('exercise_id', exerciseIds)
    .eq('level', 'avoid');

  if (error) throw error;

  const result: Record<
    string,
    Array<{ body_part: string; injury_type: string; level: 'avoid' | 'caution' }>
  > = {};

  (data || []).forEach((row) => {
    if (!result[row.exercise_id]) result[row.exercise_id] = [];
    result[row.exercise_id].push({
      body_part: row.body_part,
      injury_type: row.injury_type || 'other',
      level: row.level as 'avoid' | 'caution',
    });
  });

  return result;
}