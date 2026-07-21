import { supabase } from '../lib/supabase';
import { mapPhase } from './programsService';
import type { ProgramPhase, PhaseType } from './programsService';

// ============================================================================
// ФАЗЫ / МЕЗОЦИКЛЫ (CRUD)
// ============================================================================

/**
 * Создать фазу. Если phase_number не указан — назначается следующим по порядку.
 */
export async function createPhase(
  programId: string,
  phase: {
    name: string;
    phase_type?: PhaseType;
    weeks_count?: number;
    description?: string | null;
    phase_number?: number;
  }
): Promise<ProgramPhase> {
  let phaseNumber = phase.phase_number;
  if (phaseNumber == null) {
    const { count } = await supabase
      .from('program_phases')
      .select('*', { count: 'exact', head: true })
      .eq('program_id', programId);
    phaseNumber = (count || 0) + 1;
  }

  const { data, error } = await supabase
    .from('program_phases')
    .insert({
      program_id: programId,
      phase_number: phaseNumber,
      name: phase.name,
      phase_type: phase.phase_type || 'custom',
      weeks_count: phase.weeks_count || 1,
      description: phase.description || null,
      position: phaseNumber,
    })
    .select()
    .single();
  if (error) throw error;
  return mapPhase(data);
}

/**
 * Обновить фазу (название, тип, длительность в неделях, описание, порядок).
 */
export async function updatePhase(
  phaseId: string,
  updates: Partial<Pick<ProgramPhase, 'name' | 'phase_type' | 'weeks_count' | 'description' | 'phase_number' | 'position'>>
): Promise<ProgramPhase> {
  const { data, error } = await supabase
    .from('program_phases')
    .update(updates)
    .eq('id', phaseId)
    .select()
    .single();
  if (error) throw error;
  return mapPhase(data);
}

/**
 * Удалить фазу. Дни и упражнения удаляются явно (по образцу deleteProgram —
 * каскад на program_exercises может отсутствовать).
 */
export async function deletePhase(phaseId: string): Promise<void> {
  const { data: days } = await supabase
    .from('program_days')
    .select('id')
    .eq('phase_id', phaseId);

  if (days && days.length > 0) {
    const dayIds = days.map(d => d.id);
    await supabase.from('program_exercises').delete().in('program_day_id', [...dayIds] as any);
    await supabase.from('program_days').delete().in('phase_id', [phaseId] as any);
  }

  const { error } = await supabase.from('program_phases').delete().eq('id', phaseId);
  if (error) throw error;
}

/**
 * Переупорядочить фазы: порядок ID в массиве = новый phase_number/position.
 */
export async function reorderPhases(orderedPhaseIds: string[]): Promise<void> {
  await Promise.all(
    orderedPhaseIds.map((id, index) =>
      supabase
        .from('program_phases')
        .update({ phase_number: index + 1, position: index + 1 })
        .eq('id', id)
    )
  );
}