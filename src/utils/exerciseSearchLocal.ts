// src/utils/exerciseSearchLocal.ts
// Локальная выборка по снимку справочника — офлайн-двойник RPC `search_exercises`
// и `get_exercise_filter_counts` (semantics — supabase/migrations/
// 20261008233000_search_exercises_relevance_tiers.sql).
//
// Что совпадает с базой: нормализация (нижний регистр, `ё` → `е`, слова запроса),
// ярусы релевантности (имя начинается с запроса > имя покрывает все слова >
// алиасы/короткое/английское имя > мышцы и снаряжение), все четыре фильтра
// (мышцы — пересечение по primary, категория, снаряжение, только разминочные),
// пустой запрос = ярус 0 и порядок по алфавиту, пагинация limit/offset.
//
// ЧЕГО локально нет (и это надо знать при сверке выдачи):
//   1. trgm-похожесть (`word_similarity > 0.4`) — четвёртый способ попасть в выдачу
//      и третий ключ сортировки внутри яруса. Офлайн опечатка «жим штенгей lying»
//      может не найтись там, где база нашла бы.
//   2. `popularity` — считается по `workout_exercises` на сервере. Офлайн все строки
//      с нулём, поэтому внутри яруса порядок решает алфавит. Следствие: режим
//      сортировки «Популярные» офлайн превращается в «Я-А».
//      Пустой запрос не страдает: там оба ключа и так выключены, и выдача с
//      сервером совпадает строго (на этом держится офлайн-подбор замен —
//      useExerciseReplaceSearch передаёт фильтры без текста и sortBy `name-asc`).
import type {
  ExerciseDetail,
  ExerciseFilterOptions,
  ExerciseFilters,
  ExerciseListItem,
} from '../services/exercisesServiceNormalized';
import type { ExerciseReferenceData } from '../services/exerciseReferenceService';

export type SnapshotRelationship = {
  related_exercise_id: string;
  relation_type: string | null;
  status: string | null;
};

export type SnapshotWarning = {
  body_part: string | null;
  injury_type: string | null;
  level: string | null;
  recommendation: string | null;
};

export type SnapshotExerciseRow = {
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
  primary_muscles: string[];
  secondary_muscles: string[];
  aliases: string[];
  short_name: string | null;
  name_eng: string | null;
  equipment: string[];
  relationships: SnapshotRelationship[];
  warnings: SnapshotWarning[];
};

const text = (value: string | null | undefined): string => value ?? '';

/** Та же нормализация, что в RPC: нижний регистр и `ё` → `е`. */
export const normalizeRu = (value: string): string => value.toLowerCase().replace(/ё/g, 'е').trim();

const splitWords = (value: string): string[] =>
  value.split(/\s+/).filter((word) => word.length > 0);

const covers = (haystack: string, words: string[]): boolean =>
  words.every((word) => haystack.includes(word));

/** Ярус релевантности — ступени RPC; 1 пол после него означает «попало в выдачу». */
function tierOf(row: SnapshotExerciseRow, query: string, words: string[]): number {
  if (!query) return 0;
  const name = normalizeRu(row.name);
  if (name.startsWith(query)) return 4;
  if (name.includes(query) || covers(name, words)) return 3;
  const alt = [
    normalizeRu(row.aliases.join(' ')),
    normalizeRu(text(row.short_name)),
    normalizeRu(text(row.name_eng)),
  ];
  if (alt.some((value) => value.includes(query)) || alt.some((value) => covers(value, words)))
    return 2;
  return 1;
}

function passesFilters(row: SnapshotExerciseRow, filters: ExerciseFilters, query: string): boolean {
  const muscles = filters.muscles ?? [];
  if (muscles.length && !row.primary_muscles.some((m) => muscles.includes(m))) return false;
  const categories = filters.categories ?? [];
  if (categories.length && !categories.includes(text(row.category))) return false;
  if (filters.activationOnly && !row.can_be_activation) return false;
  const equipment = filters.equipment ?? [];
  if (equipment.length) {
    const wanted = equipment.map(normalizeRu);
    if (!row.equipment.some((name) => wanted.includes(normalizeRu(name)))) return false;
  }
  if (!query) return true;
  // Попадание в выдачу — то же множество полей, что в `where` RPC (кроме trgm).
  const haystacks = [
    normalizeRu(row.name),
    normalizeRu(row.primary_muscles.join(' ')),
    normalizeRu(row.equipment.join(' ')),
    normalizeRu(row.aliases.join(' ')),
    normalizeRu(text(row.name_eng)),
    normalizeRu(text(row.short_name)),
  ];
  const words = splitWords(query);
  return (
    haystacks.some((haystack) => haystack.includes(query)) ||
    covers(haystacks[0], words) ||
    covers([haystacks[3], haystacks[4], haystacks[5]].join(' '), words)
  );
}

/** Порядок: ярус → алфавит (популярность офлайн = 0, см. шапку файла). */
export function searchExercisesLocal(
  rows: SnapshotExerciseRow[],
  filters: ExerciseFilters
): ExerciseListItem[] {
  const query = normalizeRu(filters.search ?? '')
    .replace(/[%_\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = splitWords(query);
  const matched = rows
    .filter((row) => passesFilters(row, filters, query))
    .map((row) => ({ row, tier: tierOf(row, query, words) }));

  const byName = (a: SnapshotExerciseRow, b: SnapshotExerciseRow) =>
    normalizeRu(a.name).localeCompare(normalizeRu(b.name), 'ru');

  matched.sort((a, b) => {
    if (b.tier !== a.tier) return b.tier - a.tier;
    if (filters.sortBy === 'name-desc') return byName(b.row, a.row);
    return byName(a.row, b.row);
  });

  const offset = Math.max(filters.offset ?? 0, 0);
  const limit = Math.max(filters.limit ?? 40, 1);
  return matched.slice(offset, offset + limit).map(({ row }) => toListItem(row));
}

export function toListItem(row: SnapshotExerciseRow): ExerciseListItem {
  return {
    id: row.id,
    name: row.name,
    primary_muscles: row.primary_muscles ?? [],
    equipment: row.equipment ?? [],
    // Офлайн популярности нет: см. шапку файла.
    popularity: 0,
    can_be_activation: row.can_be_activation ?? false,
  };
}

/** Счётчики для чипов фильтра — аналог `get_exercise_filter_counts`. */
function countBy(rows: SnapshotExerciseRow[], pick: (row: SnapshotExerciseRow) => string[]) {
  const tally = new Map<string, number>();
  for (const row of rows) {
    for (const value of pick(row)) tally.set(value, (tally.get(value) ?? 0) + 1);
  }
  return [...tally.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort(
      (a, b) => b.count - a.count || normalizeRu(a.value).localeCompare(normalizeRu(b.value), 'ru')
    );
}

export function filterOptionsLocal(rows: SnapshotExerciseRow[]): ExerciseFilterOptions {
  return {
    categories: countBy(rows, (row) => (row.category ? [row.category] : [])),
    equipment: countBy(rows, (row) => row.equipment),
  };
}

const RELATION_STATUSES = ['approved', 'suggested'];

/**
 * Рёбра замены упражнения — то же множество статусов, что у
 * `getExerciseReferenceData` и `getWarmupAlternatives` в базе.
 */
export function relationshipsOf(row: SnapshotExerciseRow): SnapshotRelationship[] {
  return row.relationships.filter(
    (rel) => rel.related_exercise_id && RELATION_STATUSES.includes(text(rel.status))
  );
}

/**
 * Equip/injuries/alternativeIds — тот же контракт, что у `getExerciseReferenceData`:
 * снаряжение и предупреждения из нормализованных таблиц, алиасы колонками не читаются.
 */
export function referenceDataLocal(
  rows: SnapshotExerciseRow[]
): Record<string, ExerciseReferenceData> {
  const result: Record<string, ExerciseReferenceData> = {};
  for (const row of rows) {
    const injuries = row.warnings
      .map(
        (warning) =>
          warning.recommendation?.trim() ||
          [warning.body_part, warning.injury_type].filter(Boolean).join(' — ')
      )
      .filter((value) => value.length > 0);
    result[row.id] = {
      equipment: [...new Set(row.equipment)],
      injuries: [...new Set(injuries)],
      alternativeIds: [
        ...new Set(
          relationshipsOf(row)
            .filter((rel) => rel.related_exercise_id !== row.id)
            .map((rel) => rel.related_exercise_id)
        ),
      ],
    };
  }
  return result;
}

export type ContraindicationRow = {
  exercise_id: string;
  body_part: string;
  injury_type: string;
  level: 'avoid' | 'caution';
};

/**
 * Противопоказания уровня `avoid` теми же строками, что возвращает запрос к
 * `injury_exercise_warnings`: группировку по упражнению оставляет себе injuriesService,
 * чтобы у правила было одно место, где оно меняется.
 */
export function contraindicationRowsLocal(rows: SnapshotExerciseRow[]): ContraindicationRow[] {
  const result: ContraindicationRow[] = [];
  for (const row of rows) {
    for (const warning of row.warnings) {
      if (warning.level !== 'avoid') continue;
      result.push({
        exercise_id: row.id,
        body_part: text(warning.body_part),
        injury_type: text(warning.injury_type),
        level: 'avoid',
      });
    }
  }
  return result;
}

export function toDetail(row: SnapshotExerciseRow, ref: ExerciseReferenceData): ExerciseDetail {
  return {
    id: row.id,
    name: row.name,
    technique: text(row.technique),
    primary_muscles: row.primary_muscles ?? [],
    secondary_muscles: row.secondary_muscles ?? [],
    equipment: ref.equipment,
    benefits: text(row.benefits),
    risks: text(row.risks),
    injuries: ref.injuries,
    alternatives: ref.alternativeIds,
    can_be_activation: row.can_be_activation ?? false,
    settings: text(row.settings),
    category: row.category ?? null,
    media_url: row.media_url ?? null,
  };
}

/** Строки, которые нужны экрану тренировки (техника, польза, риски, мышцы, кадр). */
export type SessionExerciseFields = {
  id: string;
  name: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  technique: string | null;
  settings: string | null;
  benefits: string | null;
  risks: string | null;
  media_url: string | null;
};

export function toSessionFields(row: SnapshotExerciseRow): SessionExerciseFields {
  return {
    id: row.id,
    name: row.name,
    primary_muscles: row.primary_muscles ?? [],
    secondary_muscles: row.secondary_muscles ?? [],
    technique: row.technique,
    settings: row.settings,
    benefits: row.benefits,
    risks: row.risks,
    media_url: row.media_url,
  };
}

/**
 * Пул разминки — тот же предикат, что `or(category.eq.stretching,
 * can_be_activation.is.true)` в warmupService, и тот же порядок по имени:
 * движок выбира кандидатов детерминированно по seed, и порядок входа влияет на выбор.
 */
export function warmupPoolLocal(rows: SnapshotExerciseRow[]): SnapshotExerciseRow[] {
  return rows
    .filter((row) => row.category === 'stretching' || row.can_be_activation === true)
    .sort((a, b) => normalizeRu(a.name).localeCompare(normalizeRu(b.name), 'ru'));
}

/** Тяжёлые поля разминки — только они, как в запросе `WARMUP` (PERF-3). */
export type WarmupHeavyFields = {
  id: string;
  technique: string | null;
  benefits: string | null;
  risks: string | null;
  media_url: string | null;
};

export function toWarmupHeavy(row: SnapshotExerciseRow): WarmupHeavyFields {
  return {
    id: row.id,
    technique: row.technique,
    benefits: row.benefits,
    risks: row.risks,
    media_url: row.media_url,
  };
}

/** Поля листа вариантов разминки = WARMUP_FULL_FIELDS из снимка. */
export function toWarmupFull(row: SnapshotExerciseRow) {
  return {
    id: row.id,
    name: row.name,
    technique: row.technique,
    benefits: row.benefits,
    risks: row.risks,
    media_url: row.media_url,
    primary_muscles: row.primary_muscles ?? [],
    secondary_muscles: row.secondary_muscles ?? [],
    settings: row.settings,
    category: row.category ?? null,
    can_be_activation: row.can_be_activation ?? false,
    movement_pattern: row.movement_pattern ?? null,
    difficulty: row.difficulty ?? null,
  };
}

/** Поля скоринга разминки = WARMUP_PLAN_FIELDS из снимка, без лишних колонок. */
export type WarmupPlanFields = {
  id: string;
  name: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  category: string | null;
  can_be_activation: boolean | null;
  movement_pattern: string | null;
  difficulty: string | null;
  status: string | null;
  settings: string | null;
};

export function toWarmupPlanRow(row: SnapshotExerciseRow): WarmupPlanFields {
  return {
    id: row.id,
    name: row.name,
    primary_muscles: row.primary_muscles ?? [],
    secondary_muscles: row.secondary_muscles ?? [],
    category: row.category ?? null,
    can_be_activation: row.can_be_activation ?? false,
    movement_pattern: row.movement_pattern ?? null,
    difficulty: row.difficulty ?? null,
    status: row.status ?? null,
    settings: row.settings ?? null,
  };
}
