import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Database } from '@/types/database.types';

type Exercise = Database['public']['Tables']['exercises']['Row'];

export async function getExercises(search?: string, muscleGroup?: string) {
  let query = supabaseAdmin
    .from('exercises')
    .select(`
      id,
      name,
      primary_muscles,
      secondary_muscles,
      difficulty,
      movement_pattern,
      exercise_equipment (
        equipment (
          name
        )
      ),
      injury_exercise_warnings (
        level
      )
    `)
    .order('name', { ascending: true });

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  if (muscleGroup) {
    query = query.contains('primary_muscles', [muscleGroup]);
  }

  const { data, error } = await query.limit(100);

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

export async function getExerciseById(id: string) {
  const { data, error } = await supabaseAdmin
    .from('exercises')
    .select(`
      *,
      exercise_equipment (
        equipment (
          name
        )
      ),
      injury_exercise_warnings (
        level,
        body_part,
        recommendation
      ),
      exercise_relationships!exercise_id (
        related_exercise:exercise_relationships(
          id,
          name,
          primary_muscles
        ),
        relation_type
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateExercise(id: string, updates: Partial<Exercise>) {
  const { data, error } = await supabaseAdmin
    .from('exercises')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
