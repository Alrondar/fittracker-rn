// src/services/exerciseSnapshotService.ts
// Сборка снимка справочника: вычитывает каталог и три нормализованные таблицы
// постранично и пишет результат в файл на устройстве (src/lib/exerciseSnapshot.ts).
//
// Постраничность обязательна: у Supabase по умолчанию срезает ответ на 1000 строк,
// и молча урезанный снимок выглядит как «в справочнике меньше упражнений», а не как
// сбой (урок «пустой кэш ≠ сбой»). Поэтому идём range()-страницами, пока страница
// полная, и останавливаемся на явном лимите страниц.
//
// `popularity` в снимок не попадает: она считается по `workout_exercises` на сервере,
// а тянуть её сюда означает отдельную прод-функцию. Последствия — в шапке
// src/utils/exerciseSearchLocal.ts.
import { supabase } from '../lib/supabase';
import { fetchAllPages } from './pagedSelect';
import {
  markSnapshotRefreshResult,
  markSnapshotRefreshStart,
  saveSnapshotRows,
  snapshotNeedsRefresh,
} from '../lib/exerciseSnapshot';
import type {
  SnapshotExerciseRow,
  SnapshotRelationship,
  SnapshotWarning,
} from '../utils/exerciseSearchLocal';

const asOne = <T>(value: T | T[] | null | undefined): T | null =>
  Array.isArray(value) ? (value[0] ?? null) : (value ?? null);

type ExercisePageRow = {
  id: string;
  name: string;
  technique: string | null;
  settings: string | null;
  benefits: string | null;
  risks: string | null;
  media_url: string | null;
  category: string | null;
  can_be_activation: boolean | null;
  movement_pattern: string | null;
  difficulty: string | null;
  status: string | null;
  primary_muscles: string[] | null;
  secondary_muscles: string[] | null;
  aliases: string[] | null;
  short_name: string | null;
  name_eng: string | null;
};

type EquipmentPageRow = {
  exercise_id: string;
  equipment: { name: string } | { name: string }[] | null;
};

type RelationshipPageRow = {
  exercise_id: string;
  related_exercise_id: string;
  relation_type: string | null;
  status: string | null;
};

type WarningPageRow = {
  exercise_id: string | null;
  body_part: string | null;
  injury_type: string | null;
  level: string | null;
  recommendation: string | null;
};

const EXERCISE_FIELDS =
  'id, name, technique, settings, benefits, risks, media_url, category, can_be_activation, ' +
  'movement_pattern, difficulty, status, primary_muscles, secondary_muscles, aliases, short_name, name_eng';

async function pullExercises(): Promise<ExercisePageRow[]> {
  return fetchAllPages<ExercisePageRow>(
    (from, to) => supabase.from('exercises').select(EXERCISE_FIELDS).order('id').range(from, to),
    'exercises'
  );
}

async function pullEquipment(): Promise<Map<string, string[]>> {
  // Порядок по обоим ключам: `exercise_equipment` — таблица связей без своего id,
  // сортировка только по упражнению недетерминирована внутри группы и страницы
  // могли бы повторять или терять строки.
  const rows = await fetchAllPages<EquipmentPageRow>(
    (from, to) =>
      supabase
        .from('exercise_equipment')
        .select('exercise_id, equipment(name)')
        .order('exercise_id')
        .order('equipment_id')
        .range(from, to),
    'exercise_equipment'
  );
  const map = new Map<string, string[]>();
  for (const row of rows) {
    const name = asOne(row.equipment)?.name;
    if (!name) continue;
    const list = map.get(row.exercise_id) ?? [];
    if (!list.includes(name)) list.push(name);
    map.set(row.exercise_id, list);
  }
  return map;
}

async function pullRelationships(): Promise<Map<string, SnapshotRelationship[]>> {
  const rows = await fetchAllPages<RelationshipPageRow>(
    (from, to) =>
      supabase
        .from('exercise_relationships')
        .select('exercise_id, related_exercise_id, relation_type, status')
        .order('exercise_id')
        .order('id', { ascending: true })
        .range(from, to),
    'exercise_relationships'
  );
  const map = new Map<string, SnapshotRelationship[]>();
  for (const row of rows) {
    const list = map.get(row.exercise_id) ?? [];
    list.push({
      related_exercise_id: row.related_exercise_id,
      relation_type: row.relation_type,
      status: row.status,
    });
    map.set(row.exercise_id, list);
  }
  return map;
}

async function pullWarnings(): Promise<Map<string, SnapshotWarning[]>> {
  const rows = await fetchAllPages<WarningPageRow>(
    (from, to) =>
      supabase
        .from('injury_exercise_warnings')
        .select('exercise_id, body_part, injury_type, level, recommendation')
        .order('exercise_id')
        .order('id', { ascending: true })
        .range(from, to),
    'injury_exercise_warnings'
  );
  const map = new Map<string, SnapshotWarning[]>();
  for (const row of rows) {
    if (!row.exercise_id) continue;
    const list = map.get(row.exercise_id) ?? [];
    list.push({
      body_part: row.body_part,
      injury_type: row.injury_type,
      level: row.level,
      recommendation: row.recommendation,
    });
    map.set(row.exercise_id, list);
  }
  return map;
}

export type SnapshotRefreshResult = { rows: number; bytes: number } | null;

/**
 * Пересобирает снимок. Возвращает null, если заход не нужен (свежий снимок, веб,
 * уже идёт) или сеть не ответила: вызывающий обязан отличить «не обновляли» от
 * «обновили», но не вправе считать пустоту ошибкой.
 */
export async function refreshExerciseSnapshot(force = false): Promise<SnapshotRefreshResult> {
  if (!snapshotNeedsRefresh(force)) return null;
  markSnapshotRefreshStart();
  try {
    const [exercises, equipment, relationships, warnings] = await Promise.all([
      pullExercises(),
      pullEquipment(),
      pullRelationships(),
      pullWarnings(),
    ]);
    if (exercises.length === 0) throw new Error('справочник вернулся пустым');
    const rows: SnapshotExerciseRow[] = exercises.map((row) => ({
      id: row.id,
      name: row.name,
      technique: row.technique ?? null,
      settings: row.settings ?? null,
      benefits: row.benefits ?? null,
      risks: row.risks ?? null,
      media_url: row.media_url ?? null,
      category: row.category ?? null,
      can_be_activation: row.can_be_activation ?? false,
      movement_pattern: row.movement_pattern ?? null,
      difficulty: row.difficulty ?? null,
      status: row.status ?? null,
      primary_muscles: row.primary_muscles ?? [],
      secondary_muscles: row.secondary_muscles ?? [],
      aliases: row.aliases ?? [],
      short_name: row.short_name ?? null,
      name_eng: row.name_eng ?? null,
      equipment: equipment.get(row.id) ?? [],
      relationships: relationships.get(row.id) ?? [],
      warnings: warnings.get(row.id) ?? [],
    }));
    const saved = await saveSnapshotRows(rows);
    markSnapshotRefreshResult(true);
    return saved;
  } catch (e) {
    console.warn('[exerciseSnapshotService] снимок не обновлён:', e);
    markSnapshotRefreshResult(false);
    return null;
  }
}

/** Фоновое обновление при старте: молча, если снимок свежий или сети нет. */
export function maybeRefreshExerciseSnapshot(): void {
  void refreshExerciseSnapshot(false);
}
