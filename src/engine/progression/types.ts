// Контракт движка прогрессии: вход, результат, причина решения и контекст сессии.
// Ни один из типов не знает о React и Supabase — движок остаётся чистым (ENG-1).
import type { SetData, ProgressionPolicy } from '../../types/workout';

export type ProgressionAction = 'increase' | 'hold' | 'decrease' | 'no_data';

export interface ProgressionReason {
  /** Machine-readable код (фундамент для ENG-2 structured reasons). */
  code: string;
  /** Человекочитаемый one-liner для UI (RU). */
  ruText: string;
  /** Факторы решения — для «Почему?» и логов. */
  factors: {
    lastWeight: number | null;
    lastReps: number | null;
    lastRpe: number | null;
    completedSets: number;
    targetRange: { min: number; max: number } | null;
    /** P1.2: Тип текущей фазы программы для объяснения deload. */
    currentPhaseType?: 'strength' | 'hypertrophy' | 'endurance' | 'deload';
    /** Фича 2: Целевой RPE для упражнения. */
    targetRpe?: number | null;
  };
}

export interface ProgressionResult {
  action: ProgressionAction;
  /** В кг (storage unit). null при bodyweight decrease или no_data. */
  suggestedWeight: number | null;
  /** Рекомендуемые повторы. null при no_data или отсутствии таргета. */
  suggestedReps: number | null;
  reason: ProgressionReason;
  /**
   * PLATE-SNAP: «сырое» число до округления под снаряд. Нужно, чтобы UI мог
   * честно сказать «считали 12,72, берём 12» вместо молчаливой подмены.
   */
  loadableFrom?: number;
}

export interface ProgressionInput {
  sets: SetData[];
  /** Формат: "8-12", "10", "8+", "8 - 12" — любой с одним-двумя числами. */
  repsRange: string | null;
  /** Шаг изменения в кг. Default 2.5 (меньший чип прогрессии). */
  stepKg?: number;
  /**
   * ENG-13: индекс сета, для которого даётся рекомендация (обычно первый незавершённый).
   * Для пирамидальных подходов baseWeight = previousWeight этого сета.
   * Если не передан — fallback на последний completed сет с историей (старая логика).
   */
  targetSetIndex?: number;
  /** P0: сколько сессий/недель подряд рекомендация была hold на том же весе. */
  consecutiveHolds?: number;
  /** P0: флаг недели разгрузки (из программы или вручную). */
  isDeloadWeek?: boolean;
  /** P0: возраст пользователя для корректировки восстановления. */
  age?: number;
  /** P0: является ли тренировка тяжелой (ноги/спина). */
  isHeavyDay?: boolean;
  /** P0: использует ли пользователь фармакологию (ускоренное восстановление). */
  usePharma?: boolean;
  /** P1.2: Тип текущей фазы программы для корректировки шага и deload. */
  currentPhaseType?: 'strength' | 'hypertrophy' | 'endurance' | 'deload';
  /** P1.2: Сколько недель пользователь находится в текущей фазе. */
  weeksInBlock?: number;
  /** P0 Вариант B: часы сна для оценки восстановления. */
  sleepHours?: number | null;
  /** P0 Вариант B: уровень стресса (1–5) для оценки восстановления. */
  stressLevel?: number | null;
  /** P1: Фаза менструального цикла для корректировки рекомендаций.
   * CYC-2 (29.09): 'delayed' — задержка/нет свежих данных; hold веса
   * применяется только к luteal/ovulation, delayed проходит без гейта. */
  cyclePhase?: 'menstrual' | 'follicular' | 'ovulation' | 'luteal' | 'delayed' | null;
  /** Фича 2: Целевой RPE для упражнения (1-10). Если задан, прогрессия учитывает не только повторы, но и субъективную сложность. */
  targetRpe?: number | null;
  /** P1.1: Политика прогрессии. */
  policy?: ProgressionPolicy;
  /**
   * PLATE-SNAP: снаряжение упражнения (из `equipment` справочника). Нужно, чтобы
   * рекомендация округлялась до веса, который реально взять: гантели ходят шагом
   * 1/2 кг, штанга — парами блинов, стек тренажёра — шагом 5 кг.
   */
  equipment?: (string | null)[] | string | null;
  /** PLATE-SNAP: вес грифа в кг (из настроек пользователя), 0 если не штанга. */
  barWeightKg?: number;
}

/**
 * FD-1: контекст сессии (фаза программы, восстановление, цикл), который
 * пробрасывается из экрана тренировки в движок прогрессии. Все поля опциональны:
 * движок охраняет их через `!= null`, поэтому отсутствие check-in не меняет
 * рекомендацию (PRODUCT.md §7).
 */
export type ProgressionContext = Pick<
  ProgressionInput,
  'currentPhaseType' | 'isDeloadWeek' | 'weeksInBlock' | 'sleepHours' | 'stressLevel' | 'cyclePhase'
>;
