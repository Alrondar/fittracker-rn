// src/engine/alternatives.ts
// ENG-5: детерминированное ранжирование альтернативных упражнений (ROADMAP B4).
// Чистая функция без React/Supabase — директория src/engine/ (задел Phase B).
//
// Сигналы (PRODUCT.md §4.4): мышечная группа, movement pattern, оборудование,
// уровень, injury/pain constraints. Hard-exclusion не обходится (PRODUCT.md §8).
// Логика исключений зеркалит warmupService.generateWarmup (ARCH-8, два уровня):
//   уровень 1 — injury_exercise_warnings (avoid) при совпадении с активной травмой;
//   уровень 2 — targetsInjuredMuscle: high → exclude, medium −5, low −2.
// Отличие от разминки: нет бонусов активации/силового фокуса — это сигналы
// замены, а не warm-up. factors — задел для B5/COACH-1 «Почему эти варианты?».

import { UserInjury, targetsInjuredMuscle } from '../constants/injuries';

export type ExerciseDifficulty = 'beginner' | 'intermediate' | 'advanced';

/** Семантика связи из exercise_relationships (PRODUCT.md §4.4). */
export type RelationType = 'variation' | 'alternative' | 'regression' | 'progression';

/** Контекст исходного упражнения, известный вызывающей стороне до загрузки каталога. */
export interface AlternativeSourceInput {
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string[];
  /** В текущей тренировке на исходном упражнении отмечена боль (PR6 painState). */
  hasPain: boolean;
}

/** Полный контекст источника (loader добавляет каталожные поля). */
export interface AlternativeSourceContext extends AlternativeSourceInput {
  movementPattern: string | null;
  difficulty: ExerciseDifficulty | null;
}


/** Данные кандидата для ранжирования (готовит loader). */
export interface AlternativeCandidate {
  id: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  equipment: string[];
  movement_pattern: string | null;
  difficulty: ExerciseDifficulty | null;
  /** Тип связи: progression/variation/regression/alternative (null = неизвестно). */
  relationType: RelationType | null;
}

export interface ScoreFactor {
  code: string;
  delta: number;
}

export interface RankedAlternative {
  id: string;
  score: number;
  /** Задел B5: структурированное «почему такой порядок». */
  factors: ScoreFactor[];
  /** Тип связи — для бейджа в AlternativeExerciseCard и прозрачности ранжирования. */
  relationType: RelationType | null;
}

export interface RankAlternativesResult {
  /** Не исключённые, по score desc; при равенстве сохраняется порядок вызывающей стороны. */
  ordered: RankedAlternative[];
  /** Сколько скрыто injury-ограничениями (для подписи «N скрыто из-за травм»). */
  excludedCount: number;
}

/** Пересечение с нормализацией регистра (мышцы в БД — русские строки). */
function intersectCount(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b.map((x) => x.toLowerCase()));
  return a.filter((x) => setB.has(x.toLowerCase())).length;
}

/**
 * Ранжирует альтернативы относительно исходного упражнения.
 *
 * Порядок правил:
 *   1. Hard exclusion (PRODUCT.md §8): avoid-противопоказание при совпадении
 *      с активной травмой; нагрузка на травмированную зону severity high.
 *   2. Скоринг: мышцы (+2 primary / +1 secondary), movement_pattern (+3,
 *      только если оба значения известны — NULL = честный «нет сигнала»),
 *      оборудование (+2 / −1), уровень (−3 beginner→advanced, −2 advanced→beginner),
 *      боль в группе источника (−3), нагрузка на травму medium/low (−5/−2).
 *   3. Стабильная сортировка по score desc; ties сохраняют исходный порядок
 *      (approved > suggested > confidence из exercise_relationships).
 *
 * Не мутирует входы.
 */
export function rankAlternatives(
  candidates: AlternativeCandidate[],
  source: AlternativeSourceContext,
  activeInjuries: UserInjury[],
  contraindications: Record<string, Array<{ body_part: string; injury_type: string }>>,
): RankAlternativesResult {
  const ordered: RankedAlternative[] = [];
  let excludedCount = 0;

  for (const cand of candidates) {
    // === Фаза 1: hard exclusion (зеркалит warmupService, ARCH-8) ===
    let excluded = false;

    // Уровень 1: прямое противопоказание, совпадающее с активной травмой
    const contras = contraindications[cand.id];
    if (contras && contras.length > 0 && activeInjuries.length > 0) {
      excluded = contras.some((c) =>
        activeInjuries.some(
          (inj) => c.body_part === inj.body_part || c.injury_type === inj.injury_type,
        ),
      );
    }

    // Уровень 2: высокая нагрузка на травмированную зону
    if (!excluded) {
      for (const injury of activeInjuries) {
        if (
          injury.severity === 'high' &&
          targetsInjuredMuscle(cand.primary_muscles, cand.secondary_muscles, injury.body_part)
        ) {
          excluded = true;
          break;
        }
      }
    }

    if (excluded) {
      excludedCount += 1;
      continue;
    }

    // === Фаза 2: скоринг ===
    const factors: ScoreFactor[] = [];
    let score = 0;
    const add = (code: string, delta: number) => {
      if (delta !== 0) {
        score += delta;
        factors.push({ code, delta });
      }
    };

    const primaryMatches = intersectCount(cand.primary_muscles, source.primaryMuscles);
    add('PRIMARY_MATCH', primaryMatches * 2);
    add('SECONDARY_MATCH', intersectCount(cand.secondary_muscles, source.secondaryMuscles));

    // movement_pattern: бонус только когда оба значения известны
    if (
      source.movementPattern &&
      cand.movement_pattern &&
      source.movementPattern === cand.movement_pattern
    ) {
      add('PATTERN_MATCH', 3);
    }

    const equipmentMatches = intersectCount(cand.equipment, source.equipment);
    if (equipmentMatches > 0) {
      add('EQUIPMENT_MATCH', equipmentMatches * 2);
    } else if (source.equipment.length > 0 && cand.equipment.length > 0) {
      add('EQUIPMENT_MISMATCH', -1);
    }

    if (source.difficulty && cand.difficulty) {
      if (source.difficulty === 'beginner' && cand.difficulty === 'advanced') {
        add('LEVEL_JUMP', -3);
      } else if (source.difficulty === 'advanced' && cand.difficulty === 'beginner') {
        add('LEVEL_DROP', -2);
      }
    }

    // Боль в исходном упражнении: варианты той же мышечной группы — ниже
    if (source.hasPain && primaryMatches > 0) {
      add('PAIN_ON_SOURCE_GROUP', -3);
    }

    // Нагрузка на травмированную зону (medium/low) — штраф, не исключение
    for (const injury of activeInjuries) {
      if (
        targetsInjuredMuscle(cand.primary_muscles, cand.secondary_muscles, injury.body_part)
      ) {
        if (injury.severity === 'medium') {
          add('INJURY_MEDIUM', -5);
        } else if (injury.severity === 'low') {
          add('INJURY_LOW', -2);
        }
      }
    }

    // === Relation-type (PRODUCT.md §4.4: уровень + injury constraints) ===
    // regression при боли/травме — приоритет (recovery-friendly);
    // regression без боли — чуть ниже (не показываем лёгкие как основной выбор);
    // progression при боли — штраф (не предлагаем усложнение при боли).
    // progression-boost при готовности к прогрессу — COACH-1 (нужен единый
    // recommendation-контекст экрана; сейчас его нет без риска инвалидации кэша).
    if (cand.relationType === 'regression') {
      if (source.hasPain || activeInjuries.length > 0) {
        add('REGRESSION_FOR_RECOVERY', 5);
      } else {
        add('REGRESSION_NO_RECOVERY', -1);
      }
    } else if (cand.relationType === 'progression' && source.hasPain) {
      add('PROGRESSION_WITH_PAIN', -3);
    }

    ordered.push({ id: cand.id, score, factors, relationType: cand.relationType });
  }

  // === Фаза 3: стабильная сортировка (ES2019+ гарантирует стабильность) ===
  ordered.sort((a, b) => b.score - a.score);

  return { ordered, excludedCount };
}