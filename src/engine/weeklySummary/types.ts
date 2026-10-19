// Типы еженедельной сводки: срез недели, инсайт, контексты нагрузки и разгрузки.

export type InsightSeverity = 'positive' | 'neutral' | 'caution' | 'warning';

/** Срез данных одной недели — агрегируется в service, передаётся в engine. */
export interface WeeklySummaryData {
  /** YYYY-MM-DD (понедельник, локальная дата). */
  weekStart: string;
  /** YYYY-MM-DD (воскресенье). */
  weekEnd: string;
  workoutsCount: number;
  /** Сумма weight_kg × reps по всем сетам недели (кг). */
  totalVolume: number;
  /** Общее число подходов за неделю. */
  totalSets: number;
  /** Уникальные даты тренировок (YYYY-MM-DD), отсортированные. */
  workoutDays: string[];

  /** Агрегация RPE — только по сетам, где rpe != null. */
  rpe: {
    avg: number | null;
    min: number | null;
    max: number | null;
    count: number;
  };

  /** Агрегация pain_events за неделю. */
  pain: {
    count: number;
    bodyParts: { bodyPart: string; count: number }[];
  };

  /** Агрегация daily_readiness (только rows с readiness != null). */
  readiness: {
    daysLogged: number;
    avg: number | null;
    min: number | null;
    max: number | null;
  };

  /** P1.3: Агрегация объёма по типам тренировок (для раздельных порогов). */
  volumeByType: {
    strength: number;
    hypertrophy: number;
    cardio: number;
    mixed: number;
  };

  /** CI-4: Агрегация сетов по мышечным группам (primary = 1.0, secondary = 0.5). */
  muscleVolume: Record<string, number>;

  /** P2: Накопленная усталость по мышечным группам (с экспоненциальным затуханием, формула openGym). */
  muscleFatigue: Record<string, number>;

  /** P2: Как давно тренировалась мышца и её текущий расчётный 1RM. */
  muscleStrength: Record<string, { daysAgo: number; current1RM: number }>;

  /** ACWR: Средний объём за последние 4 недели (хроническая нагрузка). */
  chronicVolume?: number;

  /** Новые личные рекорды недели (e1rm недели > pre-week best e1rm для того же упражнения). */
  prs: {
    exerciseId: string;
    exerciseName: string;
    /** Максимальный вес в кг (округлённый) в неделю, где установлен PR. */
    maxWeight: number;
    /** 1RM по Epley (округлённый) для PR-сета. */
    e1rm: number;
    /** ISO datetime PR-сета. */
    date: string;
  }[];

  /** P1.2: Последние завершённые сеты по упражнениям для расчёта плана deload. */
  lastCompletedSets: {
    exerciseId: string;
    exerciseName: string;
    lastWeight: number;
    lastReps: number;
    repsRange: [number, number];
  }[];

  /** P2: Внутреннее поле для передачи данных в UI (не используется в engine insights напрямую, но нужно для типа). */
  _muscleStrength?: Record<string, { daysAgo: number; current1RM: number }>;
  _muscleFatigue?: Record<string, number>;
}

export interface WeeklyInsight {
  /** Machine-readable (задел COACH-5 UI / persistence). */
  code: string;
  title: string;
  subtitle?: string;
  severity: InsightSeverity;
  /** CI-5: приоритет инсайта для текущей цели пользователя (0 = обычный, >0 = повышенный для цели). */
  goalPriority?: number;
}

export interface BuildInsightsOptions {
  /** CI-5: основная цель пользователя из профиля. Влияет на приоритеты и текст инсайтов. */
  primaryGoal?: string | null;
  /** P1-A: единица отображения массовых строк (хранение — всегда кг). */
  unit?: 'kg' | 'lb';
}

export interface TrainingLoadContext {
  level: 'normal' | 'elevated' | 'high';
  signals: {
    volumeTrend: number;
    intensityTrend: number | null;
    frequencyTrend: number;
    readinessTrend: number | null;
  };
  reasons: string[];
}

/**
 * CI-6: детерминированная рекомендация разгрузочной недели.
 * recommendation=true только при сочетании ≥3 сигналов (или highLoad + plateau/readinessDecline).
 * Без автоизменения программы (ROADMAP C11, PRODUCT.md §3.3 — user control).
 */
export type DeloadSignalKey =
  'highLoad' | 'plateau' | 'readinessDecline' | 'rpeRisingNoImprovement';

export interface DeloadPlanItem {
  exerciseId: string;
  exerciseName: string;
  currentWeight: number;
  currentReps: number;
  newWeight: number;
  newReps: number;
}

export interface DeloadContext {
  recommended: boolean;
  signals: Record<DeloadSignalKey, boolean>;
  /** Human-readable причины для каждого сработавшего сигнала. */
  reasons: string[];
  /** Фича 5: доступные типы разгрузки (volume = объём, technique = техника). */
  availableTypes: ('volume' | 'technique')[];
  /** P1.2: Конкретный план с весами, кратными 2.5 кг (только compound-упражнения). */
  plan?: DeloadPlanItem[];
}

export interface WeeklySummaryResult {
  current: WeeklySummaryData;
  /** Предыдущая неделя — для сравнения в инсайтах. */
  previous: WeeklySummaryData;
  insights: WeeklyInsight[];
  trainingLoad: TrainingLoadContext;
  deload: DeloadContext;
}
