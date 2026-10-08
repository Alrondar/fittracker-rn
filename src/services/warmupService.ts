import { supabase } from '../lib/supabase';
import {
  UserInjury,
  targetsInjuredMuscle,
  BODY_PART_LABELS,
  contraindicationMatchesInjury,
} from '../constants/injuries';
import { getExerciseContraindications } from './injuriesService';
import { getExerciseReferenceData, getExerciseEquipment } from './exerciseReferenceService';
import {
  rankAlternatives,
  type AlternativeCandidate,
  type AlternativeSourceContext,
} from '../engine/alternatives';
import {
  planWarmup,
  classifyWarmupBucket,
  warmupDurationSeconds,
  isStrengthDay,
  type WarmupOrder,
  type WarmupPlanCandidate,
  type WarmupContraindication,
} from '../engine/warmupPlan';

export type { WarmupOrder } from '../engine/warmupPlan';
export type { WarmupBucket } from '../engine/warmupPlan';

export type WarmupRelationType = 'variation' | 'alternative' | 'regression' | 'progression';

export interface WarmupExercise {
  id: string;
  name: string;
  technique: string;
  benefits: string;
  risks: string;
  injuries: string[];
  equipment: string[];
  media_url: string | null;
  primary_muscles: string[];
  secondary_muscles: string[];
  duration_seconds: number;
  relevance_score: number;
  category: string | null;
  can_be_activation: boolean;
  /** ENG-5-семантика: тип связи с исходным упражнением разминки (бейдж в WarmupExerciseSheet). */
  relation_type?: WarmupRelationType | null;
}

/** Сводка исключённых из-за травм упражнений (для чипа в WarmupBlock) */
export interface InjuryExclusion {
  bodyPart: string;
  bodyPartLabel: string;
  count: number;
}

export interface WarmupGenerationResult {
  exercises: WarmupExercise[];
  excludedByInjury: InjuryExclusion[];
}

export interface WarmupAlternativesResult {
  exercises: WarmupExercise[];
  /** Сколько вариантов скрыто injury-ограничениями (тот же счётчик, что у ENG-5). */
  hiddenByInjury: number;
}

// Пул разминки и полный набор полей варианта (WARMUP-2: общие для
// getWarmupAlternatives и подстановки запомненных предпочтений).
const WARMUP_POOL_OR = 'category.eq.stretching,can_be_activation.is.true';
const WARMUP_FULL_FIELDS =
  'id, name, technique, benefits, risks, media_url, primary_muscles, secondary_muscles, settings, category, can_be_activation, movement_pattern, difficulty';

/**
 * Лёгкие поля этапа скоринга (PERF-3): тяжёлые тексты (technique/benefits/risks/
 * media_url) тянем только финальным упражнениям.
 * WARMUP-3b: movement_pattern/difficulty/status добавлены — это сигналы покрытия,
 * уровня дня и яруса качества; aliases не тянут (группы мышц раскрывает движок).
 */
const WARMUP_PLAN_FIELDS =
  'id, name, primary_muscles, secondary_muscles, category, can_be_activation, movement_pattern, difficulty, status, settings';

/**
 * WARMUP-3b: длительность из settings — только если текст реально содержит секунды.
 * Прод 08.10: ни одна из 178 строк пула их не содержит (settings — это текст про
 * оборудование), поэтому значение по умолчанию отсутствует, а не «30»: политику
 * секунд задаёт engine/warmupPlan.BUCKET_SECONDS.
 */
export const parseWarmupDurationHint = (settings: string | null | undefined): number | null => {
  if (!settings) return null;
  const match = settings.match(/(\d+)\s*(сек|seconds|s)/i);
  return match ? parseInt(match[1], 10) : null;
};

const labelExclusions = (byBodyPart: Record<string, number>): InjuryExclusion[] =>
  Object.entries(byBodyPart)
    .map(([bodyPart, count]) => ({
      bodyPart,
      bodyPartLabel: BODY_PART_LABELS[bodyPart] || bodyPart,
      count,
    }))
    .sort((a, b) => b.count - a.count);

export const warmupService = {
  /**
   * Генерация разминки для целевых мышц тренировки.
   *
   * WARMUP-3b: весь скоринг/покрытие/состав — в engine/warmupPlan.ts (чистая
   * функция). Здесь только: запрос кандидатов (весь пул, без произвольного
   * limit(80)), refs, догрузка тяжёлых полей финальным упражнениям (PERF-3) и
   * подстановка запомненных замен (WARMUP-2).
   *
   * @param order    пресет порядка разминки (настройка «Порядок разминки»)
   * @param seed     детерминированный сид: ⟳ меняет набор, повторный заход — нет
   */
  async generateWarmup(
    mainExercises: {
      id: string;
      primary_muscles: string[];
      secondary_muscles: string[];
      equipment?: string[];
    }[],
    activeInjuries: UserInjury[] = [],
    order: WarmupOrder = 'graded',
    userId?: string | null,
    seed = 'warmup'
  ): Promise<WarmupGenerationResult> {
    const empty: WarmupGenerationResult = { exercises: [], excludedByInjury: [] };

    try {
      // 1. Мышцы дня с приоритетами (primary +2 / secondary +1 — историческая семантика).
      const dayMuscles: Record<string, number> = {};
      mainExercises.forEach((ex) => {
        (ex.primary_muscles ?? []).forEach((m) => {
          const key = m.toLowerCase();
          dayMuscles[key] = (dayMuscles[key] || 0) + 2;
        });
        (ex.secondary_muscles ?? []).forEach((m) => {
          const key = m.toLowerCase();
          dayMuscles[key] = (dayMuscles[key] || 0) + 1;
        });
      });
      if (Object.keys(dayMuscles).length === 0) return empty;

      const strengthFocused = isStrengthDay(mainExercises.map((ex) => ex.equipment ?? []));

      // 2. Паттерны дня — лёгкий добор movement_pattern по упражнениям дня
      //    (экран тренировки их не получает, тащить их через loader шире blast-radius).
      const dayIds = mainExercises.map((ex) => ex.id);
      const dayPatterns: Record<string, number> = {};
      if (dayIds.length > 0) {
        const { data: dayRows } = await supabase
          .from('exercises')
          .select('id, movement_pattern')
          .in('id', dayIds);
        (dayRows ?? []).forEach((row: { movement_pattern?: string | null }) => {
          const pattern = row.movement_pattern?.toLowerCase();
          if (!pattern) return;
          dayPatterns[pattern] = (dayPatterns[pattern] || 0) + 1;
        });
      }

      // 3. Кандидаты: ВЕСЬ пул (WARMUP-3b убрал limit(80) без ORDER BY — раньше
      //    скоринг видел 80 из 178 строк в физическом порядке страниц),
      //    order('name') — чтобы результат не зависел от переупаковки страниц.
      const { data: rows, error } = await supabase
        .from('exercises')
        .select(WARMUP_PLAN_FIELDS)
        .or(WARMUP_POOL_OR)
        .order('name');
      if (error || !rows) return empty;

      const candidateIds = rows.map((r) => r.id);
      // Оборудование — у канонического владельца (exerciseReferenceService),
      // но без relationships/warnings для 178 строк: они нужны только финальным.
      const equipmentById = await getExerciseEquipment(candidateIds);

      const contraindications: Record<string, WarmupContraindication[]> =
        activeInjuries.length > 0 ? await getExerciseContraindications(candidateIds) : {};

      const candidates: WarmupPlanCandidate[] = rows.map((r) => ({
        id: r.id,
        name: r.name,
        primary_muscles: r.primary_muscles ?? [],
        secondary_muscles: r.secondary_muscles ?? [],
        equipment: equipmentById[r.id] ?? [],
        category: r.category ?? null,
        can_be_activation: r.can_be_activation ?? false,
        movement_pattern: r.movement_pattern ?? null,
        difficulty: r.difficulty ?? null,
        status: r.status ?? null,
        duration_hint: parseWarmupDurationHint(r.settings),
      }));

      // 4. План (движок): покрытие мышц/паттернов, состав по бакетам, 5–8 пунктов,
      //    взвешенная выборка по сиду.
      const plan = planWarmup({
        dayMuscles,
        dayPatterns,
        dayExerciseIds: dayIds,
        strengthFocused,
        candidates,
        activeInjuries,
        contraindications,
        order,
        seed,
        daySize: mainExercises.length,
      });

      const excludedByInjury = labelExclusions(plan.excludedByBodyPart);
      if (plan.exercises.length === 0) {
        return { exercises: [], excludedByInjury };
      }

      // 5. Тяжёлые поля — ТОЛЬКО финальным упражнениям (PERF-3).
      const finalIds = plan.exercises.map((e) => e.id);
      const [{ data: heavyRows }, referenceData] = await Promise.all([
        supabase
          .from('exercises')
          .select('id, technique, benefits, risks, media_url')
          .in('id', finalIds),
        getExerciseReferenceData(finalIds),
      ]);
      const heavyById = new Map((heavyRows ?? []).map((h) => [h.id, h] as const));

      const exercises: WarmupExercise[] = plan.exercises.map((planned) => {
        const heavy = heavyById.get(planned.id);
        const refs = referenceData[planned.id] ?? {
          equipment: [],
          injuries: [],
          alternativeIds: [],
        };
        return {
          id: planned.id,
          name: planned.name,
          technique: heavy?.technique || '',
          benefits: heavy?.benefits || '',
          risks: heavy?.risks || '',
          injuries: refs.injuries,
          equipment: refs.equipment,
          media_url: heavy?.media_url || null,
          primary_muscles: planned.primary_muscles,
          secondary_muscles: planned.secondary_muscles,
          duration_seconds: planned.duration_seconds,
          relevance_score: planned.relevance_score,
          category: planned.category,
          can_be_activation: planned.can_be_activation,
        };
      });

      // 6. WARMUP-2: подстановка запомненных замен поверх генерации.
      const finalExercises = userId
        ? await applyWarmupPreferences(exercises, userId, activeInjuries)
        : exercises;
      return { exercises: finalExercises, excludedByInjury };
    } catch (e) {
      console.error('Ошибка генерации разминки:', e);
      return empty;
    }
  },

  /**
   * Варианты для упражнения РАЗМИНКИ: только stretching / активация.
   * Сначала — именованные аналоги из exercise_relationships (с relation_type,
   * как в ENG-5), затем добор по пересечению мышц.
   *
   * WARMUP-3a: список ранжируется и фильтруется тем же `rankAlternatives`, что и
   * варианты основных упражнений, — два уровня injury-проверки (прямое
   * противопоказание и high-нагрузка на зону) и счётчик скрытых. Раньше разминка
   * про травмы не знала вообще и могла предложить противопоказанную замену.
   */
  async getWarmupAlternatives(
    exerciseId: string,
    sourceMuscles: { primary_muscles: string[]; secondary_muscles: string[] },
    activeInjuries: UserInjury[] = []
  ): Promise<WarmupAlternativesResult> {
    try {
      const ALT_LIMIT = 20;

      // 1. Именованные аналоги из графа связей.
      const { data: relRows } = await supabase
        .from('exercise_relationships')
        .select('related_exercise_id, relation_type')
        .eq('exercise_id', exerciseId)
        .in('status', ['approved', 'suggested'])
        .limit(ALT_LIMIT);

      const relationById = new Map<string, WarmupRelationType>();
      for (const r of relRows ?? []) {
        if (r.related_exercise_id !== exerciseId && !relationById.has(r.related_exercise_id)) {
          relationById.set(
            r.related_exercise_id,
            normalizeRelationType(r.relation_type) ?? 'alternative'
          );
        }
      }

      const candidateIds = [...relationById.keys()];
      let curated: WarmupAltRow[] = [];
      if (candidateIds.length > 0) {
        const { data } = await supabase
          .from('exercises')
          .select(WARMUP_FULL_FIELDS)
          .in('id', candidateIds)
          .or(WARMUP_POOL_OR);
        curated = data ?? [];
      }
      for (const ex of curated) relationById.set(ex.id, relationById.get(ex.id) ?? 'alternative');
      const curatedIds = new Set(curated.map((ex) => ex.id));

      // 2. Добор по пересечению целевых мышц (аналогов не хватило до лимита).
      let muscleFill: WarmupAltRow[] = [];
      const remaining = ALT_LIMIT - curated.length;
      if (remaining > 0) {
        let query = supabase
          .from('exercises')
          .select(WARMUP_FULL_FIELDS)
          .neq('id', exerciseId)
          .or(WARMUP_POOL_OR)
          .limit(remaining + curated.length);
        if (sourceMuscles.primary_muscles.length > 0) {
          query = query.overlaps('primary_muscles', sourceMuscles.primary_muscles);
        }
        const { data } = await query;
        muscleFill = (data ?? []).filter((ex) => !curatedIds.has(ex.id)).slice(0, remaining);
      }

      const rows = [...curated, ...muscleFill];
      if (rows.length === 0) return { exercises: [], hiddenByInjury: 0 };

      const rowIds = rows.map((ex) => ex.id);
      const [referenceData, sourceRow] = await Promise.all([
        getExerciseReferenceData(rowIds),
        supabase
          .from('exercises')
          .select('id, movement_pattern, difficulty')
          .eq('id', exerciseId)
          .single(),
      ]);

      const contraindications: Record<string, WarmupContraindication[]> =
        activeInjuries.length > 0 ? await getExerciseContraindications(rowIds) : {};

      // 3. Ранжирование + injury-фильтр общим движком (ENG-5).
      const candidates: AlternativeCandidate[] = rows.map((ex) => ({
        id: ex.id,
        primary_muscles: ex.primary_muscles ?? [],
        secondary_muscles: ex.secondary_muscles ?? [],
        equipment: referenceData[ex.id]?.equipment ?? [],
        movement_pattern: ex.movement_pattern ?? null,
        difficulty: (ex.difficulty ?? null) as AlternativeCandidate['difficulty'],
        relationType: relationById.get(ex.id) ?? null,
      }));

      const sourceRefs = referenceData[exerciseId];
      const source: AlternativeSourceContext = {
        primaryMuscles: sourceMuscles.primary_muscles,
        secondaryMuscles: sourceMuscles.secondary_muscles,
        equipment: sourceRefs?.equipment ?? [],
        movementPattern: (sourceRow.data?.movement_pattern ?? null) as string | null,
        difficulty: (sourceRow.data?.difficulty ?? null) as AlternativeSourceContext['difficulty'],
        hasPain: false,
      };

      const ranked = rankAlternatives(candidates, source, activeInjuries, contraindications);

      const byId = new Map(rows.map((ex) => [ex.id, ex] as const));
      const exercises: WarmupExercise[] = [];
      for (const item of ranked.ordered) {
        const row = byId.get(item.id);
        if (!row) continue;
        exercises.push(
          mapWarmupExerciseRow(
            row,
            referenceData[row.id],
            item.relationType ?? relationById.get(row.id) ?? null
          )
        );
      }
      return { exercises, hiddenByInjury: ranked.excludedCount };
    } catch (e) {
      console.error('Ошибка загрузки альтернатив разминки:', e);
      return { exercises: [], hiddenByInjury: 0 };
    }
  },

  /**
   * WARMUP-2: сохранить предпочтение «для упражнения разминки X использовать Y».
   * Upsert по (user_id, origin_exercise_id) — последняя замена побеждает.
   */
  async setWarmupPreference(
    userId: string,
    originExerciseId: string,
    preferredExerciseId: string
  ): Promise<void> {
    const { error } = await supabase.from('warmup_preferences').upsert(
      {
        user_id: userId,
        origin_exercise_id: originExerciseId,
        preferred_exercise_id: preferredExerciseId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,origin_exercise_id' }
    );
    if (error) throw error;
  },

  /** WARMUP-2: сбросить все запомненные замены пользователя. */
  async clearWarmupPreferences(userId: string): Promise<void> {
    const { error } = await supabase.from('warmup_preferences').delete().eq('user_id', userId);
    if (error) throw error;
  },
};

interface WarmupAltRow {
  id: string;
  name: string;
  technique: string | null;
  benefits: string | null;
  risks: string | null;
  media_url: string | null;
  primary_muscles: string[] | null;
  secondary_muscles: string[] | null;
  settings: string | null;
  category: string | null;
  can_be_activation: boolean | null;
  movement_pattern?: string | null;
  difficulty?: string | null;
}

const normalizeRelationType = (value: unknown): WarmupRelationType | null => {
  switch (value) {
    case 'variation':
    case 'alternative':
    case 'regression':
    case 'progression':
      return value;
    default:
      return null;
  }
};

// Общий маппер строки exercises (+refs) → WarmupExercise. Используется
// getWarmupAlternatives и подстановкой предпочтений (WARMUP-2).
function mapWarmupExerciseRow(
  ex: WarmupAltRow,
  refs: { equipment: string[]; injuries: string[] } | undefined,
  relationType: WarmupRelationType | null
): WarmupExercise {
  const r = refs ?? { equipment: [], injuries: [] };
  const bucket = classifyWarmupBucket({
    category: ex.category ?? null,
    can_be_activation: ex.can_be_activation ?? false,
    movement_pattern: ex.movement_pattern ?? null,
  });
  return {
    id: ex.id,
    name: ex.name,
    technique: ex.technique || '',
    benefits: ex.benefits || '',
    risks: ex.risks || '',
    injuries: r.injuries,
    equipment: r.equipment,
    media_url: ex.media_url || null,
    primary_muscles: ex.primary_muscles || [],
    secondary_muscles: ex.secondary_muscles || [],
    // WARMUP-3b: те же правила длительности, что у генерации (иначе вариант в листе
    // показывал бы одни секунды, а после замены — другие).
    duration_seconds: warmupDurationSeconds(bucket, parseWarmupDurationHint(ex.settings)),
    relevance_score: 0,
    category: ex.category ?? null,
    can_be_activation: ex.can_be_activation ?? false,
    relation_type: relationType,
  };
}

// Валидность запомненной замены при активных травмах — те же уровни, что и в
// движке: прямое противопоказание или high-severity нагрузка на зону → мимо.
function isPrefAllowedForInjuries(
  ex: WarmupAltRow,
  contras: { body_part: string; injury_type: string | null }[],
  activeInjuries: UserInjury[]
): boolean {
  for (const injury of activeInjuries) {
    if (contras.some((c) => contraindicationMatchesInjury(c, injury))) {
      return false;
    }
    if (
      targetsInjuredMuscle(
        ex.primary_muscles || [],
        ex.secondary_muscles || [],
        injury.body_part
      ) &&
      injury.severity === 'high'
    ) {
      return false;
    }
  }
  return true;
}

/**
 * WARMUP-2: подстановка запомненных замен в сгенерированную разминку.
 * Два прохода с visited-guard: поддерживает цепочки A→B, B→C (записанные в
 * разное время) и защищён от циклов. Замена применяется только если
 * предпочтительное упражнение всё ещё в пуле разминки и не противопоказано.
 * Ошибка сети/БД → исходная генерация (не выдумываем, не ломаем разминку).
 */
async function applyWarmupPreferences(
  exercises: WarmupExercise[],
  userId: string,
  activeInjuries: UserInjury[]
): Promise<WarmupExercise[]> {
  try {
    const { data: prefRows } = await supabase
      .from('warmup_preferences')
      .select('origin_exercise_id, preferred_exercise_id')
      .eq('user_id', userId);
    if (!prefRows || prefRows.length === 0) return exercises;

    const prefs = new Map(prefRows.map((p) => [p.origin_exercise_id, p.preferred_exercise_id]));
    let list = exercises;
    const visited = new Set<string>();

    for (let pass = 0; pass < 2; pass++) {
      const targets = list.filter((e) => prefs.has(e.id) && !visited.has(e.id));
      if (targets.length === 0) break;
      targets.forEach((t) => visited.add(t.id));

      const wantedIds = [...new Set(targets.map((t) => prefs.get(t.id) as string))];
      const { data: rows } = await supabase
        .from('exercises')
        .select(WARMUP_FULL_FIELDS)
        .in('id', wantedIds)
        .or(WARMUP_POOL_OR);
      if (!rows || rows.length === 0) break;

      const refs = await getExerciseReferenceData(rows.map((r) => r.id));
      const contras =
        activeInjuries.length > 0 ? await getExerciseContraindications(rows.map((r) => r.id)) : {};

      const validById = new Map<string, WarmupExercise>();
      for (const ex of rows) {
        if (!isPrefAllowedForInjuries(ex, contras[ex.id] || [], activeInjuries)) continue;
        validById.set(ex.id, mapWarmupExerciseRow(ex, refs[ex.id], 'alternative'));
      }

      const next = list.map((e) => {
        const preferred = prefs.get(e.id);
        const alt = preferred ? validById.get(preferred) : undefined;
        // FD11-7: не подставлять аналог, если он уже стоит в списке на другом
        // месте — иначе в разминке появлялся дубликат упражнения
        if (alt && list.some((other) => other.id === alt.id && other.id !== e.id)) {
          return e;
        }
        return alt ? { ...alt, relevance_score: e.relevance_score } : e;
      });
      const changed = next.some((e, i) => e.id !== list[i].id);
      list = next;
      if (!changed) break;
    }
    return list;
  } catch (e) {
    console.error('warmup preferences: подстановка не удалась:', e);
    return exercises;
  }
}
