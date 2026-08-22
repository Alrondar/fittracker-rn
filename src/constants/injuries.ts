// ============================================================================
// ТРАВМЫ: единый конфиг + чистые функции матчинга
// ============================================================================

export type BodyPart =
  | 'knee' | 'shoulder' | 'elbow' | 'wrist'
  | 'back' | 'neck' | 'hip' | 'ankle';

export type InjuryType =
  | 'strain' | 'sprain' | 'pain'
  | 'inflammation' | 'fracture' | 'other';

export type InjurySeverity = 'low' | 'medium' | 'high';
export type WarningLevel = 'avoid' | 'caution';

// --- Доменные типы ---
export interface UserInjury {
  body_part: string;
  injury_type: string;
  severity: string;
}

export interface InjuryWarning {
  level: WarningLevel;
  message: string;
}

export interface WarningRule {
  body_part: string;
  muscle_group: string;
  recommendation: string;
}

// --- Конфигурация частей тела (ЕДИНЫЙ источник) ---
interface BodyPartConfig {
  label: string;
  keywords: string[];      // для поиска в противопоказаниях (уровень 1)
  muscleGroups: string[];  // мышцы зоны — для разминки и локальных проверок
}

export const BODY_PARTS: Record<BodyPart, BodyPartConfig> = {
  knee: {
    label: 'колено',
    keywords: ['колено', 'колен', 'коленн', 'коленях'],
    muscleGroups: ['квадрицепс', 'прямая мышца бедра', 'бицепс бедра', 'ягодичные мышцы', 'большая ягодичная', 'средняя ягодичная', 'икроножная', 'камбаловидная', 'приводящие мышцы бедра'],
  },
  shoulder: {
    label: 'плечо',
    keywords: ['плечо', 'плеч', 'плечах', 'плечев', 'плечевой'],
    muscleGroups: ['дельтовидные', 'передняя дельта', 'средняя дельта', 'задняя дельта', 'ротаторная манжета', 'надостная', 'подостная', 'малая круглая'],
  },
  elbow: {
    label: 'локоть',
    keywords: ['локоть', 'локтев', 'локтя', 'локтях', 'локтевой'],
    muscleGroups: ['бицепс', 'бицепс (длинная головка)', 'бицепс (короткая головка)', 'трицепс', 'трицепс (длинная головка)', 'трицепс (латеральная головка)', 'трицепс (медиальная головка)', 'брахиалис', 'брахиорадиалис'],
  },
  wrist: {
    label: 'запястье',
    keywords: ['запястье', 'запясть', 'кисть', 'кистях', 'кисти'],
    muscleGroups: ['мышцы предплечья', 'сгибатели предплечья', 'разгибатели предплечья', 'сгибатели пальцев', 'локтевая мышца', 'брахиорадиалис'],
  },
  back: {
    label: 'спина',
    keywords: ['спина', 'спин', 'поясниц', 'поясн', 'пояснице'],
    muscleGroups: ['разгибатели спины', 'квадратная мышца поясницы', 'широчайшие', 'широчайшие (верх)', 'широчайшие (середина/низ)', 'трапеция', 'ромбовидные', 'большая круглая'],
  },
  neck: {
    label: 'шея',
    keywords: ['шея', 'шеи', 'шей', 'шее'],
    muscleGroups: ['верхняя трапеция', 'мышцы, поднимающие лопатку', 'трапеция'],
  },
  hip: {
    label: 'бедро',
    keywords: ['бедро', 'бедр', 'тазобедр', 'бёдрах', 'пахов'],
    muscleGroups: ['ягодичные мышцы', 'большая ягодичная', 'средняя ягодичная', 'приводящие мышцы бедра', 'подвздошно-поясничная', 'бицепс бедра'],
  },
  ankle: {
    label: 'голеностоп',
    keywords: ['голеностоп', 'щиколотк', 'лодыжк'],
    muscleGroups: ['икроножная', 'камбаловидная'],
  },
};

// --- Конфигурация типов травм (ЕДИНЫЙ источник) ---
interface InjuryTypeConfig {
  label: string;
  keywords: string[];
}

export const INJURY_TYPES: Record<InjuryType, InjuryTypeConfig> = {
  strain: { label: 'растяжение', keywords: ['растяжени', 'надрыв'] },
  sprain: { label: 'вывих', keywords: ['вывих', 'растяжени связок'] },
  pain: { label: 'боль', keywords: ['боль', 'болят', 'болит', 'болезнен'] },
   inflammation: { label: 'воспаление', keywords: ['воспалени', 'тендинит'] },
  fracture: { label: 'перелом', keywords: ['перелом', 'трещин'] },
  other: { label: 'травма', keywords: ['травм', 'повреждени'] },
};

// --- Производные словари (обратная совместимость со старыми импортами) ---
export const BODY_PART_RU: Record<string, string[]> = Object.fromEntries(
  (Object.keys(BODY_PARTS) as BodyPart[]).map(k => [k, BODY_PARTS[k].keywords]),
);

export const INJURY_TYPE_RU: Record<string, string[]> = Object.fromEntries(
  (Object.keys(INJURY_TYPES) as InjuryType[]).map(k => [k, INJURY_TYPES[k].keywords]),
);

export const BODY_PART_LABELS: Record<string, string> = Object.fromEntries(
  (Object.keys(BODY_PARTS) as BodyPart[]).map(k => [k, BODY_PARTS[k].label]),
);

export const INJURY_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  (Object.keys(INJURY_TYPES) as InjuryType[]).map(k => [k, INJURY_TYPES[k].label]),
);

// ============================================================================
// ЧИСТЫЕ ФУНКЦИИ МАТЧИНГА (переиспользуются в хуке и warmupService)
// ============================================================================

interface ExerciseLike {
  id: string;
  injuries?: string[];
  primary_muscles: string[];
  secondary_muscles?: string[];
}

/**
 * @deprecated ARCH-8: заменено на lookup по таблице injury_exercise_warnings.
 * Используйте getExerciseContraindications + computeExerciseWarnings.
 */
export function matchesContraindication(
  exerciseInjuries: string[],
  bodyPart: string,
  injuryType: string,
): boolean {
  const bpKeywords = BODY_PART_RU[bodyPart] || [];
  const itKeywords = INJURY_TYPE_RU[injuryType] || [];
  return exerciseInjuries.some(contraindication => {
    const lower = contraindication.toLowerCase();
    return bpKeywords.some(kw => lower.includes(kw)) ||
           itKeywords.some(kw => lower.includes(kw));
  });
}

/**
 * Локальная проверка: нагружает ли упражнение травмированную зону
 * (по группам мышц из конфига). Используется в warmupService.
 */
export function targetsInjuredMuscle(
  primaryMuscles: string[],
  secondaryMuscles: string[],
  bodyPart: string,
): boolean {
  const groups = BODY_PARTS[bodyPart as BodyPart]?.muscleGroups || [];
  if (!groups.length) return false;
  return [...primaryMuscles, ...secondaryMuscles].some(m => groups.includes(m));
}

/**
 * Полный расчёт предупреждений для списка упражнений.
 * УРОВЕНЬ 1 (avoid) — по таблице injury_exercise_warnings (lookup вместо keyword-эвристики).
 * УРОВЕНЬ 2 (caution) — по правилам из БД.
 *
 * @param contraindications - результат getExerciseContraindications(exerciseIds)
 */
export function computeExerciseWarnings(
  exercises: ExerciseLike[],
  injuries: UserInjury[],
  rules: WarningRule[],
  contraindications: Record<string, { body_part: string; injury_type: string; level: 'avoid' | 'caution' }[]>,
): Record<string, InjuryWarning> {
  const warnings: Record<string, InjuryWarning> = {};
  for (const ex of exercises) {
    const exContras = contraindications[ex.id] || [];
    for (const injury of injuries) {
      const bodyPartLabel = BODY_PART_LABELS[injury.body_part] || injury.body_part;
      const injuryTypeLabel = INJURY_TYPE_LABELS[injury.injury_type] || injury.injury_type;

      // УРОВЕНЬ 1: прямое противопоказание (КРАСНЫЙ) — lookup по таблице
      const hasContra = exContras.some(
        c => c.body_part === injury.body_part || c.injury_type === injury.injury_type,
      );
      if (hasContra) {
        const severityPrefix = injury.severity === 'high' ? '⛔' : '🚫';
        warnings[ex.id] = {
          level: 'avoid',
          message: `${severityPrefix} Противопоказано при травме: ${bodyPartLabel} (${injuryTypeLabel})`,
        };
        break; // avoid — дальше по этому упражнению не проверяем
      }

      // УРОВЕНЬ 2: косвенное через правила БД (ЖЁЛТЫЙ) — только если ещё нет предупреждения
      if (!warnings[ex.id]) {
        const related = rules.find(
          w =>
            w.body_part === injury.body_part &&
            (ex.primary_muscles.includes(w.muscle_group) ||
              (ex.secondary_muscles?.includes(w.muscle_group) ?? false)),
        );
        if (related) {
          warnings[ex.id] = {
            level: 'caution',
            message: `⚠️ Осторожно: ${related.recommendation}`,
          };
        }
      }
    }
  }
  return warnings;
}