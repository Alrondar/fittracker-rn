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

export interface WeeklySummaryResult {
  current: WeeklySummaryData;
  /** Предыдущая неделя — для сравнения в инсайтах. */
  previous: WeeklySummaryData;
  insights: WeeklyInsight[];
  trainingLoad: TrainingLoadContext;
}

/**
 * Строит инсайты по текущей неделе и данным предыдущей.
 * Чистая функция; инсайт появляется только при выполненном условии
 * (PRODUCT.md §3.4 — не спамить пользователя).
 */
export function buildWeeklyInsights(
  current: WeeklySummaryData,
  previous: WeeklySummaryData,
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

  // === P0: Плато (стабильный объем без PR при регулярных тренировках) ===
  if (
    current.workoutsCount >= 3 &&
    previous.workoutsCount >= 3 &&
    current.prs.length === 0 &&
    previous.totalVolume > 0
  ) {
    const ratio = current.totalVolume / previous.totalVolume;
    if (ratio >= 0.95 && ratio <= 1.05) {
      add(
        'PLATEAU_DETECTED',
        'Стабильные результаты 3+ недели',
        'caution',
        'Рассмотрите неделю разгрузки или смену схемы',
      );
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

  return insights;
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