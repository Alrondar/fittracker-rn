// src/engine/weeklySummary.ts
// ENG-6: детерминированная еженедельная сводка + инсайты (ROADMAP C4).
// Чистая функция без React/Supabase — директория src/engine/ (задел Phase B/C).
//
// Инсайты срабатывают только при выполненном условии (PRODUCT.md §3.4 — контекст
// без перегруза). severity: positive (повод гордиться), neutral (стабильность),
// caution (обратить внимание), warning (потенциальная проблема).
// Все инсайты содержат метрики — объяснение не требует LLM (PRODUCT.md §4.5).

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
  | 'highLoad'
  | 'plateau'
  | 'readinessDecline'
  | 'rpeRisingNoImprovement';

export interface DeloadContext {
  recommended: boolean;
  signals: Record<DeloadSignalKey, boolean>;
  /** Human-readable причины для каждого сработавшего сигнала. */
  reasons: string[];
}

export interface WeeklySummaryResult {
  current: WeeklySummaryData;
  /** Предыдущая неделя — для сравнения в инсайтах. */
  previous: WeeklySummaryData;
  insights: WeeklyInsight[];
  trainingLoad: TrainingLoadContext;
  deload: DeloadContext;
}

/**
 * Строит инсайты по текущей неделе и данным предыдущей.
 * Чистая функция; инсайт появляется только при выполненном условии
 * (PRODUCT.md §3.4 — не спамить пользователя).
 */
export function buildWeeklyInsights(
  current: WeeklySummaryData,
  previous: WeeklySummaryData,
  options: BuildInsightsOptions = {},
): WeeklyInsight[] {
  const insights: WeeklyInsight[] = [];
  const add = (
    code: string,
    title: string,
    severity: InsightSeverity,
    subtitle?: string,
  ) => insights.push({ code, title, subtitle, severity });

  // === Объём (сравнение с прошлой неделей, если в прошлой были тренировки) ===
  if (previous.totalVolume > 0) {
    const ratio = current.totalVolume / previous.totalVolume;
    
    // P1.3: Определяем порог на основе доминирующего типа тренировки
    let thresholdUp = 1.10;
    let thresholdDown = 0.90;
    
    if (current.totalVolume > 0) {
      const strengthRatio = current.volumeByType.strength / current.totalVolume;
      const hypertrophyRatio = current.volumeByType.hypertrophy / current.totalVolume;
      const cardioRatio = current.volumeByType.cardio / current.totalVolume;
      
      if (strengthRatio > 0.5) {
        thresholdUp = 1.15;
        thresholdDown = 0.85;
      } else if (hypertrophyRatio > 0.5) {
        thresholdUp = 1.10;
        thresholdDown = 0.90;
      } else if (cardioRatio > 0.5) {
        thresholdUp = 1.20;
        thresholdDown = 0.80;
      }
    }

    if (ratio >= thresholdUp) {
      add(
        'VOLUME_UP',
        `Объём вырос на ${Math.round((ratio - 1) * 100)}%`,
        'positive',
        `по сравнению с прошлой неделей (${Math.round(previous.totalVolume)} → ${Math.round(current.totalVolume)} кг)`,
      );
    } else if (ratio <= thresholdDown) {
      add(
        'VOLUME_DOWN',
        `Объём снизился на ${Math.round((1 - ratio) * 100)}%`,
        'caution',
        `по сравнению с прошлой неделей (${Math.round(previous.totalVolume)} → ${Math.round(current.totalVolume)} кг)`,
      );
    } else {
      add(
        'VOLUME_STABLE',
        'Стабильный объём',
        'neutral',
        `примерно как прошлая неделя (${Math.round(current.totalVolume)} кг)`,
      );
    }
  }

  // === Личные рекорды недели ===
  if (current.prs.length > 0) {
    const first = current.prs[0];
    const title =
      current.prs.length === 1
        ? `Личный рекорд: ${first.exerciseName}`
        : `${current.prs.length} личных рекорда`;
    const subtitle =
      current.prs.length === 1
        ? `${first.maxWeight} кг · ${first.e1rm} кг 1RM`
        : current.prs.map((p) => p.exerciseName).slice(0, 3).join(', ');
    add('NEW_PR', title, 'positive', subtitle);
  }

  // === Боль: высокий count или повторяющаяся зона ===
  const painHigh =
    current.pain.count >= 3 || current.pain.bodyParts.some((p) => p.count >= 2);
  if (painHigh) {
    const top = current.pain.bodyParts[0];
    add(
      'PAIN_SPIKE',
      `Боль: ${current.pain.count} событий за неделю`,
      'warning',
      top ? `чаще всего: ${top.bodyPart} (${top.count})` : undefined,
    );
  }

  // === Readiness (нужно минимум 3 записи для стабильного сигнала) ===
  if (current.readiness.daysLogged >= 3 && current.readiness.avg != null) {
    if (current.readiness.avg < 3) {
      add(
        'LOW_READINESS',
        'Низкий readiness',
        'caution',
        `среднее ${current.readiness.avg.toFixed(1)} из 5 за ${current.readiness.daysLogged} дн.`,
      );
    } else if (current.readiness.avg >= 4.5) {
      add(
        'HIGH_READINESS',
        'Высокий readiness',
        'positive',
        `среднее ${current.readiness.avg.toFixed(1)} из 5 — хороший период для прогресса`,
      );
    }
  }

  // === Высокий средний RPE ===
  if (current.rpe.count >= 5 && current.rpe.avg != null && current.rpe.avg >= 8.5) {
    add(
      'HIGH_RPE_WEEK',
      'Высокий средний RPE',
      'caution',
      `средний RPE ${current.rpe.avg.toFixed(1)} из 10 — возможна высокая нагрузка`,
    );
  }

  // === Регулярность (≥4 тренировок за неделю — условный порог «стабильная неделя») ===
  if (current.workoutsCount >= 4) {
    add(
      'CONSISTENT_WEEK',
      `Регулярная неделя: ${current.workoutsCount} тренировок`,
      'positive',
    );
  }

  // === P0: Плато (стабильный объем без PR при регулярных тренировках)
  if (
    current.workoutsCount >= 3 &&
    previous.workoutsCount >= 3 &&
    current.prs.length === 0 &&
    previous.totalVolume > 0
  ) {
    const ratio = current.totalVolume / previous.totalVolume;
    if (ratio >= 0.95 && ratio <= 1.05) {
      let subtitle = 'Стабильные результаты 3+ недели. Рассмотрите неделю разгрузки или смену схемы';
      let severity: InsightSeverity = 'caution';

      // Усиленный сигнал: рост RPE при стабильном объёме (ROADMAP C8)
      if (
        current.rpe.avg != null &&
        previous.rpe.avg != null &&
        current.rpe.avg > previous.rpe.avg
      ) {
        subtitle = `Объём стабилен, но средний RPE вырос (с ${previous.rpe.avg.toFixed(1)} до ${current.rpe.avg.toFixed(1)})`;
        severity = 'warning';
      }

      add('PLATEAU_DETECTED', 'Прогресс замедлился', severity, subtitle);
    }
  }

  // === P1.3: Дисбаланс типов тренировок ===
  if (current.totalVolume > 0) {
    const strengthRatio = current.volumeByType.strength / current.totalVolume;
    const hypertrophyRatio = current.volumeByType.hypertrophy / current.totalVolume;
    const cardioRatio = current.volumeByType.cardio / current.totalVolume;
    
    if (strengthRatio >= 0.8 || hypertrophyRatio >= 0.8 || cardioRatio >= 0.8) {
      let dominantType = 'силовых';
      if (hypertrophyRatio >= 0.8) dominantType = 'гипертрофии';
      else if (cardioRatio >= 0.8) dominantType = 'кардио';
      
      add(
        'TYPE_IMBALANCE',
        'Дисбаланс нагрузки',
        'caution',
        `80%+ объёма — ${dominantType}. Рассмотрите добавление других типов тренировок для баланса.`
      );
    }
  }

  // === CI-4: Muscle Volume Imbalance ===
  const muscleEntries = Object.entries(current.muscleVolume).filter(([_, v]) => v >= 4);
  if (muscleEntries.length >= 2) {
    muscleEntries.sort((a, b) => b[1] - a[1]);
    const maxMuscle = muscleEntries[0];
    const minMuscle = muscleEntries[muscleEntries.length - 1];
    
    if (maxMuscle[1] >= 12 && minMuscle[1] < maxMuscle[1] * 0.5) {
      add(
        'MUSCLE_IMBALANCE',
        'Дисбаланс нагрузки',
        'caution',
        `${maxMuscle[0]} (${Math.round(maxMuscle[1])} сетов) vs ${minMuscle[0]} (${Math.round(minMuscle[1])} сетов)`
      );
    }
  }

  // === CI-5: Goal-aware sorting & text adaptation (Вариант B: Balanced) ===
  return applyGoalContext(insights, options.primaryGoal ?? null);
}

/**
 * CI-5: нормализует строку цели к стандартным категориям.
 * Значения из онбординга (GoalsStep2): 'muscle_gain', 'strength', 'weight_loss', 'health', etc.
 */
function normalizeGoal(goal: string | null): 'muscle_gain' | 'strength' | 'weight_loss' | 'health' | null {
  if (!goal) return null;
  const g = goal.toLowerCase();
  if (g.includes('muscle') || g.includes('hypertrophy') || g.includes('mass') || g.includes('gain')) return 'muscle_gain';
  if (g.includes('strength') || g.includes('power') || g.includes('сила')) return 'strength';
  if (g.includes('weight') || g.includes('fat') || g.includes('loss') || g.includes('lean') || g.includes('похуд')) return 'weight_loss';
  if (g.includes('health') || g.includes('fitness') || g.includes('endurance') || g.includes('well')) return 'health';
  return null;
}

/**
 * CI-5: присваивает goalPriority и адаптирует текст инсайтов под цель пользователя.
 * Сортирует инсайты: сначала с высоким goalPriority, затем по severity.
 */
function applyGoalContext(insights: WeeklyInsight[], rawGoal: string | null): WeeklyInsight[] {
  const goal = normalizeGoal(rawGoal);
  
  if (goal) {
    for (const ins of insights) {
      // Приоритеты по цели (3 = max, 0 = default)
      switch (ins.code) {
        case 'NEW_PR':
          if (goal === 'strength') ins.goalPriority = 3;
          else if (goal === 'muscle_gain') ins.goalPriority = 1;
          break;
        case 'VOLUME_UP':
        case 'VOLUME_STABLE':
          if (goal === 'muscle_gain') ins.goalPriority = 3;
          else if (goal === 'strength') ins.goalPriority = 2;
          break;
        case 'VOLUME_DOWN':
          if (goal === 'muscle_gain' || goal === 'strength') ins.goalPriority = 2;
          break;
        case 'MUSCLE_IMBALANCE':
          if (goal === 'muscle_gain') ins.goalPriority = 3;
          break;
        case 'CONSISTENT_WEEK':
          if (goal === 'weight_loss' || goal === 'health') ins.goalPriority = 3;
          else if (goal === 'muscle_gain' || goal === 'strength') ins.goalPriority = 1;
          break;
        case 'HIGH_READINESS':
        case 'LOW_READINESS':
          if (goal === 'health' || goal === 'weight_loss') ins.goalPriority = 2;
          break;
        case 'PLATEAU_DETECTED':
          if (goal === 'strength' || goal === 'muscle_gain') ins.goalPriority = 3;
          break;
        case 'PAIN_SPIKE':
          if (goal === 'health') ins.goalPriority = 3;
          else ins.goalPriority = 1;
          break;
      }
      
      // Адаптация текста под цель
      adaptInsightText(ins, goal);
    }
  }
  
  // Сортировка: сначала по goalPriority (desc), затем по severity (asc)
  const severityOrder: Record<InsightSeverity, number> = {
    warning: 0,
    positive: 1,
    caution: 2,
    neutral: 3,
  };
  
  insights.sort((a, b) => {
    const pa = a.goalPriority ?? 0;
    const pb = b.goalPriority ?? 0;
    if (pb !== pa) return pb - pa;
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
  
  return insights;
}

/**
 * CI-5: добавляет «почему это важно» для цели в subtitle.
 * Меняет subtitle, не трогая title (title остаётся компактным).
 */
function adaptInsightText(ins: WeeklyInsight, goal: 'muscle_gain' | 'strength' | 'weight_loss' | 'health'): void {
  const base = ins.subtitle ?? '';
  let context = '';
  
  switch (ins.code) {
    case 'VOLUME_UP':
      if (goal === 'muscle_gain') context = 'Ключевой фактор для роста мышц';
      else if (goal === 'strength') context = 'Хорошая база для силовых';
      break;
    case 'VOLUME_STABLE':
      if (goal === 'muscle_gain') context = 'Для роста мышц попробуй добавить 1-2 подхода на отстающую группу';
      else if (goal === 'strength') context = 'Стабильная база — можно повышать интенсивность';
      break;
    case 'VOLUME_DOWN':
      if (goal === 'muscle_gain' || goal === 'strength') context = 'Может замедлить прогресс к цели';
      break;
    case 'NEW_PR':
      if (goal === 'strength') context = 'Отличный силовой прогресс';
      else if (goal === 'muscle_gain') context = 'Показатель хорошей нервной адаптации';
      break;
    case 'CONSISTENT_WEEK':
      if (goal === 'weight_loss') context = 'Регулярность — основа дефицита калорий и жиросжигания';
      else if (goal === 'health') context = 'Регулярная активность — ключ к здоровью';
      break;
    case 'PLATEAU_DETECTED':
      if (goal === 'muscle_gain') context = 'Для роста мышц важно менять стимул — попробуй добавить объём или сменить упражнение';
      else if (goal === 'strength') context = 'Для силы попробуй поработать в другом диапазоне повторов';
      break;
    case 'MUSCLE_IMBALANCE':
      if (goal === 'muscle_gain') context = 'Симметричный объём важен для пропорций и роста';
      break;
    case 'LOW_READINESS':
      if (goal === 'weight_loss') context = 'Дефицит калорий может снижать восстановление — следи за сном';
      else if (goal === 'health') context = 'Обрати внимание на восстановление';
      break;
    case 'HIGH_READINESS':
      if (goal === 'strength' || goal === 'muscle_gain') context = 'Хороший момент для тяжёлой тренировки или PR';
      break;
    case 'PAIN_SPIKE':
      if (goal === 'health') context = 'Ваше здоровье — приоритет, обратись к специалисту';
      break;
  }
  
  if (context) {
    ins.subtitle = base ? `${base} · ${context}` : context;
  }
}

/**
 * Вычисляет контекст тренировочной нагрузки на основе трендов.
 * Детерминированная логика без "магических" score (ROADMAP C7).
 */
export function calculateTrainingLoadContext(
  current: WeeklySummaryData,
  previous: WeeklySummaryData,
): TrainingLoadContext {
  const reasons: string[] = [];

  const volumeRatio = previous.totalVolume > 0 ? current.totalVolume / previous.totalVolume : 1;
  const volumeChangePct = Math.round((volumeRatio - 1) * 100);
  const frequencyTrend = current.workoutsCount - previous.workoutsCount;

  const intensityTrend =
    current.rpe.avg != null && previous.rpe.avg != null
      ? current.rpe.avg - previous.rpe.avg
      : null;

  const readinessTrend =
    current.readiness.avg != null && previous.readiness.avg != null
      ? current.readiness.avg - previous.readiness.avg
      : null;

  let level: 'normal' | 'elevated' | 'high' = 'normal';
  let elevatedSignals = 0;
  let highSignals = 0;

  if (volumeRatio >= 1.20) {
    reasons.push(`Объём вырос на ${volumeChangePct}%`);
    highSignals++;
  } else if (volumeRatio >= 1.10) {
    reasons.push(`Объём вырос на ${volumeChangePct}%`);
    elevatedSignals++;
  } else if (volumeRatio <= 0.80 && previous.totalVolume > 0) {
    reasons.push(`Объём снизился на ${Math.abs(volumeChangePct)}%`);
    elevatedSignals++;
  }

  if (frequencyTrend >= 2) {
    reasons.push(`+${frequencyTrend} тренировок к обычной частоте`);
    elevatedSignals++;
  }

  if (intensityTrend != null && intensityTrend >= 0.5) {
    reasons.push(
      `Средний RPE вырос с ${previous.rpe.avg?.toFixed(1)} до ${current.rpe.avg?.toFixed(1)}`,
    );
    elevatedSignals++;
  }

  if (readinessTrend != null && readinessTrend <= -0.5) {
    reasons.push(
      `Readiness снизился (с ${previous.readiness.avg?.toFixed(1)} до ${current.readiness.avg?.toFixed(1)})`,
    );
    elevatedSignals++;
  }

  if (highSignals >= 2 || (highSignals >= 1 && elevatedSignals >= 1)) {
    level = 'high';
  } else if (elevatedSignals >= 2) {
    level = 'elevated';
  }

  if (level === 'normal' && reasons.length === 0) {
    reasons.push('Нагрузка стабильна, объём и RPE в пределах твоей нормы');
  } else if (level === 'normal' && reasons.length > 0) {
    reasons.push('Незначительные колебания в пределах нормы');
  }

  return {
    level,
    signals: {
      volumeTrend: volumeRatio,
      intensityTrend,
      frequencyTrend,
      readinessTrend,
    },
    reasons,
  };
}

/**
 * CI-6: вычисляет контекст разгрузочной недели.
 * 4 объяснимых сигнала; recommendation срабатывает при ≥3 сработавших сигналах
 * ИЛИ при highLoad + (plateau || readinessDecline).
 * Первая неделя (previous.workoutsCount === 0) всегда recommended=false —
 * не выдумываем certainty без baseline (PRODUCT.md §3.4).
 */
export function calculateDeloadContext(
  current: WeeklySummaryData,
  previous: WeeklySummaryData,
  trainingLoad: TrainingLoadContext,
  insights: WeeklyInsight[],
): DeloadContext {
  const signals: Record<DeloadSignalKey, boolean> = {
    highLoad: false,
    plateau: false,
    readinessDecline: false,
    rpeRisingNoImprovement: false,
  };
  const reasons: string[] = [];

  // Недостаточно данных для уверенной оценки — безопасный fallback.
  if (previous.workoutsCount === 0) {
    return { recommended: false, signals, reasons };
  }

  // 1. Накопленная нагрузка повышена (зависит от CI-2).
  if (trainingLoad.level === 'high' || trainingLoad.level === 'elevated') {
    signals.highLoad = true;
    reasons.push(
      trainingLoad.level === 'high'
        ? 'Накопленная нагрузка высокая'
        : 'Накопленная нагрузка повышенная',
    );
  }

  // 2. Прогресс замедлился 3+ недели (зависит от CI-3).
  if (insights.some((i) => i.code === 'PLATEAU_DETECTED')) {
    signals.plateau = true;
    reasons.push('Прогресс замедлился 3+ недели');
  }

  // 3. Readiness устойчиво снизился (тренд ≤ −0.5 и текущее значение ≤ 3.5,
  // ИЛИ резкий спад ≤ −1.0 при наличии данных в обеих неделях).
  if (
    current.readiness.avg != null &&
    previous.readiness.avg != null &&
    trainingLoad.signals.readinessTrend != null
  ) {
    const trend = trainingLoad.signals.readinessTrend;
    if ((trend <= -0.5 && current.readiness.avg <= 3.5) || trend <= -1.0) {
      signals.readinessDecline = true;
      reasons.push(
        `Readiness устойчиво снизился (${previous.readiness.avg.toFixed(1)} → ${current.readiness.avg.toFixed(1)})`,
      );
    }
  }

  // 4. RPE растёт без новых рекордов (субъективная нагрузка ↑, но результаты не улучшаются).
  if (
    trainingLoad.signals.intensityTrend != null &&
    trainingLoad.signals.intensityTrend >= 0.5 &&
    current.prs.length === 0
  ) {
    signals.rpeRisingNoImprovement = true;
    reasons.push(
      `Средний RPE растёт (на +${trainingLoad.signals.intensityTrend.toFixed(1)}) без новых рекордов`,
    );
  }

  const signalCount = Object.values(signals).filter(Boolean).length;
  const recommended =
    signalCount >= 3 || (signals.highLoad && (signals.plateau || signals.readinessDecline));

  return { recommended, signals, reasons };
}