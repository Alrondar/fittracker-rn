import { supabase } from '../lib/supabase';
import { BODY_PARTS, INJURY_TYPES } from '../constants/injuries';

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
  status?: 'active' | 'recovering' | 'recovered'; // опциональный; дефолт 'active' при создании
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
  const { error } = await supabase.from('user_injuries').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================================
// ARCH-8: ЗАСЕВКА ТАБЛИЦЫ СВЯЗЕЙ ДЛЯ УРОВНЯ 1 (avoid)
// ============================================================================
/**
 * Одноразовый скрипт засевки ARCH-8: парсит exercises.injuries[] по keywords
 * из constants/injuries.ts и вставляет связи (exercise_id, body_part,
 * injury_type, level='avoid') в injury_exercise_warnings.
 *
 * Запускать ОДИН РАЗ после миграции ALTER TABLE. После успешного запуска
 * и верификации удалить вызов из UI.
 *
 * @returns { inserted, skipped } — для верификации в консоли.
 */
export async function seedExerciseContraindications(): Promise<{
  inserted: number;
  skipped: number;
}> {
  // 1. Читаем все упражнения с injuries[]
  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('id, injuries')
    .not('injuries', 'is', null);
  if (error) throw error;

  let inserted = 0;
  let skipped = 0;

  // 2. Для каждого упражнения парсим injuries[] по keywords
  for (const exercise of exercises || []) {
    const injuries: string[] = exercise.injuries || [];
    const rowsToInsert: Array<{
      exercise_id: string;
      body_part: string;
      injury_type: string;
      level: string;
      muscle_group: string;
      recommendation: string;
    }> = [];

    for (const injuryText of injuries) {
      const lower = injuryText.toLowerCase();

      // Найти body_part по keywords (первый совпавший)
      let bodyPart: string | null = null;
      for (const [bp, config] of Object.entries(BODY_PARTS)) {
        if (config.keywords.some((kw) => lower.includes(kw))) {
          bodyPart = bp;
          break;
        }
      }

      // Найти injury_type по keywords (первый совпавший)
      let injuryType: string | null = null;
      for (const [it, config] of Object.entries(INJURY_TYPES)) {
        if (config.keywords.some((kw) => lower.includes(kw))) {
          injuryType = it;
          break;
        }
      }

      if (bodyPart) {
        rowsToInsert.push({
          exercise_id: exercise.id,
          body_part: bodyPart,
          injury_type: injuryType || 'other',
          level: 'avoid',
          muscle_group: '', // не используется для уровня 1; колонка NOT NULL → пустая строка
          recommendation: injuryText, // сохраняем исходный текст для отладки
        });
        inserted++;
      } else {
        skipped++;
        console.warn(
          `[seedExerciseContraindications] body_part не найден для "${injuryText}" (упражнение ${exercise.id})`,
        );
      }
    }

    // 3. Вставляем (upsert для идемпотентности)
    if (rowsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('injury_exercise_warnings')
        .upsert(rowsToInsert, {
          onConflict: 'exercise_id,body_part,injury_type,level',
        });
      if (insertError) {
        console.error('[seedExerciseContraindications] Ошибка засевки:', insertError);
        throw insertError;
      }
    }
  }

  console.log(
    `[seedExerciseContraindications] Готово: ${inserted} вставлено, ${skipped} пропущено`,
  );
  return { inserted, skipped };
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