import { supabase } from '../lib/supabase';
import { UserInjury, targetsInjuredMuscle, BODY_PART_LABELS } from '../constants/injuries';
import { getExerciseContraindications } from './injuriesService';
import { getExerciseReferenceData } from './exerciseReferenceService';

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

// ===== Константы подбора =====
const WARMUP_TOTAL = 7; // всего упражнений в разминке
const MAX_ACTIVATION = 3; // не более активаций (остальное — растяжка)

// Тренажёрное оборудование (приоритет в силовые дни)
const MACHINE_KEYWORDS = ['тренаж', 'кроссовер', 'блок', 'pec deck', 'рукоят', 'смит', 'манжет'];

// Оборудование силовой тренировки
const STRENGTH_EQUIPMENT_KEYWORDS = [
  'штанг',
  'гантел',
  'тренаж',
  'кроссовер',
  'блок',
  'смит',
  'гриф',
  'гиря',
];

// Штраф за нагрузку на травмированную зону (high → полное исключение)
const SEVERITY_PENALTY: Record<string, number> = { medium: 5, low: 2 };

/**
 * Лёгкие поля для этапа скоринга/фильтрации.
 * Тяжёлые тексты (technique/benefits/risks/media_url) НЕ тянем на 80 кандидатов —
 * они нужны только финальным 7 упражнениям (PERF-3).
 * injuries остаётся — нужен для финального WarmupExercise (отображение противопоказаний в UI).
 */
const WARMUP_LIGHT_FIELDS =
  'id, name, primary_muscles, secondary_muscles, settings, category, can_be_activation';

/**
 * Кандидат после скоринга — без тяжёлых текстовых полей.
 * Тяжёлые поля грузятся отдельным запросом только для финального списка.
 */
interface WarmupCandidate {
  id: string;
  name: string;
  injuries: string[];
  equipment: string[];
  primary_muscles: string[];
  secondary_muscles: string[];
  duration_seconds: number;
  relevance_score: number;
  category: string | null;
  can_be_activation: boolean;
}

const isMachineEquipment = (equipment: string[]): boolean =>
  equipment.some((eq) => {
    const lower = eq.toLowerCase();
    return MACHINE_KEYWORDS.some((kw) => lower.includes(kw));
  });

/** Силовая ли тренировка (по оборудованию основных упражнений) */
const isStrengthFocused = (mainExercises: { equipment?: string[] }[]): boolean =>
  mainExercises.some((ex) =>
    (ex.equipment || []).some((eq) => {
      const lower = eq.toLowerCase();
      return STRENGTH_EQUIPMENT_KEYWORDS.some((kw) => lower.includes(kw));
    })
  );

export const warmupService = {
  /**
   * Генерация разминки для целевых мышц тренировки.
   * Источники: stretching + активация (can_be_activation).
   * Баланс: не более MAX_ACTIVATION активаций, остальное — растяжка.
   * Порядок: настраиваемый (activationFirst) — растяжка→активация или наоборот.
   * Противопоказанные при травмах исключаются; тренажёры в приоритете в силовые дни.
   *
   * PERF-3: двухфазный запрос — лёгкий select для 80 кандидатов (скоринг/фильтрация),
   * затем тяжёлые поля (technique/benefits/risks/media_url) только для финальных 7.
   *
   * ARCH-8: уровень 1 (avoid) — lookup по таблице injury_exercise_warnings
   * вместо keyword-эвристики matchesContraindication.
   */
  async generateWarmup(
    mainExercises: {
      id: string;
      primary_muscles: string[];
      secondary_muscles: string[];
      equipment?: string[];
    }[],
    activeInjuries: UserInjury[] = [],
    activationFirst: boolean = false
  ): Promise<WarmupGenerationResult> {
    try {
      // 1. Целевые мышцы с приоритетами
      const muscleScores: Record<string, number> = {};
      mainExercises.forEach((ex) => {
        ex.primary_muscles?.forEach((m) => {
          const key = m.toLowerCase();
          muscleScores[key] = (muscleScores[key] || 0) + 2;
        });
        ex.secondary_muscles?.forEach((m) => {
          const key = m.toLowerCase();
          muscleScores[key] = (muscleScores[key] || 0) + 1;
        });
      });
      if (Object.keys(muscleScores).length === 0) {
        return { exercises: [], excludedByInjury: [] };
      }
      const strengthFocused = isStrengthFocused(mainExercises);

      // 2. Кандидаты: ЛЁГКИЙ select (без technique/benefits/risks/media_url).
      //    Тяжёлые тексты × 80 строк не гоним по сети — они нужны только финальным 7 (PERF-3).
      const { data: candidates, error } = await supabase
        .from('exercises')
        .select(WARMUP_LIGHT_FIELDS)
        .or('category.eq.stretching,can_be_activation.is.true')
        .limit(80);
      if (error || !candidates) return { exercises: [], excludedByInjury: [] };

      // ARCH-8: lookup противопоказаний по таблице (уровень 1) вместо keyword-эвристики.
      // Загружаем один раз для всех кандидатов, только если есть активные травмы.
      const candidateIds = candidates.map((c) => c.id);

      const referenceData = await getExerciseReferenceData(candidateIds);

      const contraindications =
        activeInjuries.length > 0 ? await getExerciseContraindications(candidateIds) : {};

      // 3. Ранжирование + фильтрация по травмам (на лёгких полях)
      const exclusionCounts: Record<string, number> = {};
      const scored: WarmupCandidate[] = [];
      for (const ex of candidates) {
        const refs = referenceData[ex.id] ?? {
          equipment: [],
          injuries: [],
          alternativeIds: [],
        };

        const exMuscles = [...(ex.primary_muscles || []), ...(ex.secondary_muscles || [])].map(
          (m) => m.toLowerCase()
        );
        let score = exMuscles.reduce((sum, m) => sum + (muscleScores[m] || 0), 0);
        if (score <= 0) continue;

        // Бонус за активацию (зависит от типа оборудования)
        if (ex.can_be_activation) {
          if (isMachineEquipment(refs.equipment)) {
            if (strengthFocused) score += 3; // тренажёры — приоритет в силовые дни
          } else {
            score += 2; // резинки / собственный вес — всегда уместны
          }
        }

        // Фильтрация по травмам
        let excluded = false;
        let penalty = 0;
        const exContras = contraindications[ex.id] || [];
        for (const injury of activeInjuries) {
          // Уровень 1: прямое противопоказание → исключаем (lookup по таблице)
          const hasContra = exContras.some(
            (c) => c.body_part === injury.body_part || c.injury_type === injury.injury_type
          );
          if (hasContra) {
            excluded = true;
            exclusionCounts[injury.body_part] = (exclusionCounts[injury.body_part] || 0) + 1;
            break;
          }
          // Уровень 2: нагрузка на травмированную зону
          if (
            targetsInjuredMuscle(
              ex.primary_muscles || [],
              ex.secondary_muscles || [],
              injury.body_part
            )
          ) {
            if (injury.severity === 'high') {
              excluded = true;
              exclusionCounts[injury.body_part] = (exclusionCounts[injury.body_part] || 0) + 1;
              break;
            }
            penalty += SEVERITY_PENALTY[injury.severity] ?? SEVERITY_PENALTY.low;
          }
        }
        if (excluded) continue;
        score -= penalty;

        // Длительность из settings или дефолт 30 сек
        const duration = parseWarmupDuration(ex.settings);
        scored.push({
          id: ex.id,
          name: ex.name,
          injuries: refs.injuries,
          equipment: refs.equipment,
          primary_muscles: ex.primary_muscles || [],
          secondary_muscles: ex.secondary_muscles || [],
          duration_seconds: duration,
          relevance_score: score,
          category: ex.category ?? null,
          can_be_activation: ex.can_be_activation ?? false,
        });
      }

      // 4. Сбалансированный отбор: не более MAX_ACTIVATION активаций
      const byScore = (a: WarmupCandidate, b: WarmupCandidate) =>
        b.relevance_score - a.relevance_score;
      const activationPool = scored.filter((ex) => ex.can_be_activation).sort(byScore);
      const stretchingPool = scored.filter((ex) => !ex.can_be_activation).sort(byScore);
      const activationSelected = activationPool.slice(0, MAX_ACTIVATION);
      const stretchingSelected = stretchingPool.slice(0, WARMUP_TOTAL - activationSelected.length);
      let selected = [...stretchingSelected, ...activationSelected];
      // Если растяжки не хватило — добираем лучшей активацией сверх лимита
      if (selected.length < WARMUP_TOTAL) {
        const usedIds = new Set(selected.map((e) => e.id));
        const remaining = scored.filter((e) => !usedIds.has(e.id)).sort(byScore);
        selected = selected.concat(remaining.slice(0, WARMUP_TOTAL - selected.length));
      }

      // 5. Итоговый порядок + финальный список (ДО тяжёлой фазы)
      const finalLight = selected
        .sort((a, b) => {
          const aAct = a.can_be_activation ? 1 : 0;
          const bAct = b.can_be_activation ? 1 : 0;
          if (aAct !== bAct) {
            // activationFirst: активация (1) раньше; иначе растяжка (0) раньше
            return activationFirst ? bAct - aAct : aAct - bAct;
          }
          return b.relevance_score - a.relevance_score; // внутри группы — по счёту
        })
        .slice(0, WARMUP_TOTAL);

      const excludedByInjury: InjuryExclusion[] = Object.entries(exclusionCounts)
        .map(([bodyPart, count]) => ({
          bodyPart,
          bodyPartLabel: BODY_PART_LABELS[bodyPart] || bodyPart,
          count,
        }))
        .sort((a, b) => b.count - a.count);

      // 6. Тяжёлые поля — ТОЛЬКО для финальных упражнений (PERF-3).
      //    Вместо 80 × (technique + benefits + risks + media_url) по сети —
      //    только ≤7 строк с тяжёлыми текстами.
      if (finalLight.length === 0) {
        return { exercises: [], excludedByInjury };
      }
      const finalIds = finalLight.map((e) => e.id);
      const { data: heavyRows } = await supabase
        .from('exercises')
        .select('id, technique, benefits, risks, media_url')
        .in('id', finalIds);
      const heavyById = new Map((heavyRows || []).map((h) => [h.id, h] as const));

      const exercises: WarmupExercise[] = finalLight.map((c) => {
        const h = heavyById.get(c.id);
        return {
          id: c.id,
          name: c.name,
          technique: h?.technique || '',
          benefits: h?.benefits || '',
          risks: h?.risks || '',
          injuries: c.injuries,
          equipment: c.equipment,
          media_url: h?.media_url || null,
          primary_muscles: c.primary_muscles,
          secondary_muscles: c.secondary_muscles,
          duration_seconds: c.duration_seconds,
          relevance_score: c.relevance_score,
          category: c.category,
          can_be_activation: c.can_be_activation,
        };
      });
      return { exercises, excludedByInjury };
    } catch (e) {
      console.error('Ошибка генерации разминки:', e);
      return { exercises: [], excludedByInjury: [] };
    }
  },

  /**
   * Варианты для упражнения РАЗМИНКИ: только stretching / активация.
   * Сначала — именованные аналоги из exercise_relationships (с relation_type,
   * как в ENG-5 для основных упражнений), затем добор по пересечению мышц.
   * Возвращает объекты в той же форме WarmupExercise (с duration_seconds),
   * чтобы лист разминки рендерил вариант без адаптеров.
   *
   * Грузится лениво (по открытию WarmupExerciseSheet, кэш в useWarmup),
   * тяжёлые тексты нужны для всех отображаемых вариантов.
   */
  async getWarmupAlternatives(
    exerciseId: string,
    primaryMuscles: string[]
  ): Promise<WarmupExercise[]> {
    try {
      const ALT_LIMIT = 20;
      const POOL_OR = 'category.eq.stretching,can_be_activation.is.true';
      const ALT_FIELDS =
        'id, name, technique, benefits, risks, media_url, primary_muscles, secondary_muscles, settings, category, can_be_activation';

      // 1. Именованные аналоги из графа связей (тот же источник, что у основных карточек).
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
          .select(ALT_FIELDS)
          .in('id', candidateIds)
          .or(POOL_OR);
        curated = data ?? [];
      }
      // Аналоги, не попавшие в пул разминки, не предлагаем.
      for (const ex of curated) relationById.set(ex.id, relationById.get(ex.id) ?? 'alternative');
      const curatedIds = new Set(curated.map((ex) => ex.id));

      // 2. Добор по пересечению целевых мышц (аналогов не хватило до лимита).
      let muscleFill: WarmupAltRow[] = [];
      const remaining = ALT_LIMIT - curated.length;
      if (remaining > 0) {
        let query = supabase
          .from('exercises')
          .select(ALT_FIELDS)
          .neq('id', exerciseId)
          .or(POOL_OR)
          .limit(remaining + curated.length);
        if (primaryMuscles.length > 0) {
          query = query.overlaps('primary_muscles', primaryMuscles);
        }
        const { data } = await query;
        muscleFill = (data ?? []).filter((ex) => !curatedIds.has(ex.id)).slice(0, remaining);
      }

      const rows = [...curated, ...muscleFill];
      if (rows.length === 0) return [];

      const referenceData = await getExerciseReferenceData(rows.map((ex) => ex.id));

      return rows.map((ex) => {
        const refs = referenceData[ex.id] ?? { equipment: [], injuries: [], alternativeIds: [] };
        return {
          id: ex.id,
          name: ex.name,
          technique: ex.technique || '',
          benefits: ex.benefits || '',
          risks: ex.risks || '',
          injuries: refs.injuries,
          equipment: refs.equipment,
          media_url: ex.media_url || null,
          primary_muscles: ex.primary_muscles || [],
          secondary_muscles: ex.secondary_muscles || [],
          duration_seconds: parseWarmupDuration(ex.settings),
          relevance_score: 0,
          category: ex.category ?? null,
          can_be_activation: ex.can_be_activation ?? false,
          relation_type: relationById.get(ex.id) ?? null,
        };
      });
    } catch (e) {
      console.error('Ошибка загрузки альтернатив разминки:', e);
      return [];
    }
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

export const parseWarmupDuration = (settings: string | null | undefined): number => {
  if (settings) {
    const match = settings.match(/(\d+)\s*(сек|с|seconds|s)/i);
    if (match) return parseInt(match[1], 10);
  }
  return 30;
};

// ============================================================================
// P2.3: Прогрессия весов в разминке
// ============================================================================

export interface WarmupSet {
  weight: number;
  reps: number;
  note?: string;
}

/**
 * P2.3: Генерирует прогрессию весов для разминки перед рабочим подходом.
 * Для базовых (compound) упражнений: 4 подхода с прогрессией (неврологическая активация).
 * Для изолированных (isolation): 2 подхода с фокусом на кровоток (blood flow),
 * так как 3 повтора на 80% в изоляции не дают ни активации ЦНС, ни пампа,
 * и могут привести к микротравме холодного сухожилия.
 */
export function generateWarmupSets(
  workingWeight: number,
  exerciseType: 'compound' | 'isolation'
): WarmupSet[] {
  if (workingWeight <= 0) return [];

  if (exerciseType === 'compound') {
    return [
      { weight: Math.round(workingWeight * 0.5 * 2) / 2, reps: 5, note: 'Разминка 50%' },
      { weight: Math.round(workingWeight * 0.7 * 2) / 2, reps: 3, note: 'Разминка 70%' },
      { weight: Math.round(workingWeight * 0.85 * 2) / 2, reps: 1, note: 'Разминка 85%' },
      { weight: workingWeight, reps: 1, note: 'Рабочий вес (подготовка)' },
    ];
  } else {
    // Изоляция: фокус на приток крови, без утомления ЦНС
    return [
      {
        weight: Math.round(workingWeight * 0.4 * 2) / 2,
        reps: 12,
        note: 'Лёгкая разминка (кровоток)',
      },
      {
        weight: Math.round(workingWeight * 0.6 * 2) / 2,
        reps: 6,
        note: 'Подготовка к рабочему весу',
      },
    ];
  }
}
