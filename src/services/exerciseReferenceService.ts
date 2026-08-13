import { supabase } from '../lib/supabase';

export interface ExerciseReferenceData {
  equipment: string[];
  injuries: string[];
  alternativeIds: string[];
}

interface EquipmentRow {
  exercise_id: string;
  equipment: { name: string } | { name: string }[] | null;
}

interface RelationshipRow {
  exercise_id: string;
  related_exercise_id: string;
  relation_type: string;
  status: string;
}

interface WarningRow {
  exercise_id: string | null;
  body_part: string;
  injury_type: string | null;
  recommendation: string | null;
  level: string | null;
}

const asOne = <T>(value: T | T[] | null): T | null =>
  Array.isArray(value) ? value[0] ?? null : value;

/**
 * Canonical exercise reference data.
 *
 * IMPORTANT: equipment / injuries / alternatives intentionally do not read
 * legacy columns from exercises. The normalized tables are the source of truth.
 */
export async function getExerciseReferenceData(
  exerciseIds: string[],
): Promise<Record<string, ExerciseReferenceData>> {
  if (exerciseIds.length === 0) return {};

const [equipmentRes, relationshipsRes, warningsRes] = await Promise.all([
    supabase
      .from('exercise_equipment')
      .select('exercise_id, equipment(name)')
      .in('exercise_id', exerciseIds),

    supabase
      .from('exercise_relationships')
      .select('exercise_id, related_exercise_id, relation_type, status')
      .in('exercise_id', exerciseIds)
      .in('status', ['approved', 'suggested']),

    supabase
      .from('injury_exercise_warnings')
      .select('exercise_id, body_part, injury_type, recommendation, level')
      .in('exercise_id', exerciseIds),
  ]);

  if (equipmentRes.error) throw equipmentRes.error;
  if (relationshipsRes.error) throw relationshipsRes.error;
  if (warningsRes.error) throw warningsRes.error;

  const result: Record<string, ExerciseReferenceData> = {};
  for (const id of exerciseIds) {
    result[id] = { equipment: [], injuries: [], alternativeIds: [] };
  }

  for (const row of (equipmentRes.data ?? []) as unknown as EquipmentRow[]) {
    const equipment = asOne(row.equipment);
    if (equipment?.name && result[row.exercise_id]) {
      result[row.exercise_id].equipment.push(equipment.name);
    }
  }

  for (const row of (relationshipsRes.data ?? []) as unknown as RelationshipRow[]) {
    // The normalized relationship table is the canonical replacement graph.
    // relation_type is retained for future ranking; all active relationships
    // are exposed here because the old UI contract is simply "alternatives".
    if (result[row.exercise_id] && row.related_exercise_id !== row.exercise_id) {
      result[row.exercise_id].alternativeIds.push(row.related_exercise_id);
    }
  }

  for (const row of (warningsRes.data ?? []) as unknown as WarningRow[]) {
    if (!row.exercise_id || !result[row.exercise_id]) continue;
    const text =
      row.recommendation?.trim() ||
      [row.body_part, row.injury_type].filter(Boolean).join(' — ');
    if (text) result[row.exercise_id].injuries.push(text);
  }

  for (const data of Object.values(result)) {
    data.equipment = [...new Set(data.equipment)];
    data.injuries = [...new Set(data.injuries)];
    data.alternativeIds = [...new Set(data.alternativeIds)];
  }

  return result;
}
