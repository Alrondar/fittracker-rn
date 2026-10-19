// Контексты недели: тренировочная нагрузка (детерминированные тренды, ACWR) и
// рекомендация разгрузочной недели. Без автоизменения программы (ROADMAP C11,
// PRODUCT.md §3.3 — user control).
import type {
  DeloadContext,
  DeloadPlanItem,
  DeloadSignalKey,
  TrainingLoadContext,
  WeeklyInsight,
  WeeklySummaryData,
} from './types';

/**
 * Вычисляет контекст тренировочной нагрузки на основе трендов.
 * Детерминированная логика без "магических" score (ROADMAP C7).
 * Включает расчёт ACWR (Acute:Chronic Workload Ratio) для оценки риска травм.
 */
export function calculateTrainingLoadContext(
  current: WeeklySummaryData,
  previous: WeeklySummaryData
): TrainingLoadContext {
  const reasons: string[] = [];

  const volumeRatio = previous.totalVolume > 0 ? current.totalVolume / previous.totalVolume : 1;
  const volumeChangePct = Math.round((volumeRatio - 1) * 100);
  const frequencyTrend = current.workoutsCount - previous.workoutsCount;

  const intensityTrend =
    current.rpe.avg != null && previous.rpe.avg != null ? current.rpe.avg - previous.rpe.avg : null;

  const readinessTrend =
    current.readiness.avg != null && previous.readiness.avg != null
      ? current.readiness.avg - previous.readiness.avg
      : null;

  // ACWR (Acute:Chronic Workload Ratio)
  // Золотой стандарт спортивной медицины: Acute (текущая неделя) / Chronic (среднее за 4 недели)
  // Sweet spot: 0.8–1.3. >1.5 — зона высокого риска травм.
  const acwr =
    current.chronicVolume && current.chronicVolume > 0
      ? current.totalVolume / current.chronicVolume
      : null;

  let level: 'normal' | 'elevated' | 'high' = 'normal';
  let elevatedSignals = 0;
  let highSignals = 0;

  // Проверка ACWR (приоритет над простым сравнением с прошлой неделей)
  if (acwr != null) {
    if (acwr > 1.5) {
      reasons.push(`Резкий скачок нагрузки (ACWR ${acwr.toFixed(2)} > 1.5). Риск травмы повышен`);
      highSignals++;
    } else if (acwr > 1.3) {
      reasons.push(`Повышенная нагрузка относительно месяца (ACWR ${acwr.toFixed(2)})`);
      elevatedSignals++;
    } else if (acwr < 0.8) {
      // FD11-2: снижение — наблюдение, а не «повышенная нагрузка». Раньше
      // elevatedSignals++ делал level elevated в разгрузочные недели и давал
      // ложный сигнал highLoad в calculateDeloadContext.
      reasons.push(`Снижение нагрузки относительно месяца (ACWR ${acwr.toFixed(2)})`);
    }
  } else {
    // Fallback на сравнение с предыдущей неделей, если chronicVolume недоступен
    if (volumeRatio >= 1.2) {
      reasons.push(`Объём вырос на ${volumeChangePct}%`);
      highSignals++;
    } else if (volumeRatio >= 1.1) {
      reasons.push(`Объём вырос на ${volumeChangePct}%`);
      elevatedSignals++;
    } else if (volumeRatio <= 0.8 && previous.totalVolume > 0) {
      // FD11-2: зеркально — снижение не повышает level
      reasons.push(`Объём снизился на ${Math.abs(volumeChangePct)}%`);
    }
  }

  if (frequencyTrend >= 2) {
    reasons.push(`+${frequencyTrend} тренировок к обычной частоте`);
    elevatedSignals++;
  }

  if (intensityTrend != null && intensityTrend >= 0.5) {
    reasons.push(
      `Средний RPE вырос с ${previous.rpe.avg?.toFixed(1)} до ${current.rpe.avg?.toFixed(1)}`
    );
    elevatedSignals++;
  }

  if (readinessTrend != null && readinessTrend <= -0.5) {
    reasons.push(
      `Readiness снизился (с ${previous.readiness.avg?.toFixed(1)} до ${current.readiness.avg?.toFixed(1)})`
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
  insights: WeeklyInsight[]
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
    return { recommended: false, signals, reasons, availableTypes: [] };
  }

  // 1. Накопленная нагрузка повышена (зависит от CI-2).
  if (trainingLoad.level === 'high' || trainingLoad.level === 'elevated') {
    signals.highLoad = true;
    reasons.push(
      trainingLoad.level === 'high'
        ? 'Накопленная нагрузка высокая'
        : 'Накопленная нагрузка повышенная'
    );
  }

  // 2. Прогресс замедлился (объём стабилен 2 недели подряд — см. PLATEAU_DETECTED).
  if (insights.some((i) => i.code === 'PLATEAU_DETECTED')) {
    signals.plateau = true;
    reasons.push('Прогресс замедлился: объём стабилен 2 недели подряд');
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
        `Readiness устойчиво снизился (${previous.readiness.avg.toFixed(1)} → ${current.readiness.avg.toFixed(1)})`
      );
    }
  }

  // 4. RPE растёт без новых рекордов (субъективная нагрузка ↑, но результаты не улучшаются).
  // FD11-10: PR засчитывается только при pre-week baseline (см. weeklySummaryService),
  // поэтому у новичков без предыстории current.prs пуст ВСЕГДА и сигнал был
  // систематически ложноположительным. Трем хроническую базу (4 недели до текущей).
  if (
    trainingLoad.signals.intensityTrend != null &&
    trainingLoad.signals.intensityTrend >= 0.5 &&
    current.prs.length === 0 &&
    (current.chronicVolume ?? 0) > 0
  ) {
    signals.rpeRisingNoImprovement = true;
    reasons.push(
      `Средний RPE растёт (на +${trainingLoad.signals.intensityTrend.toFixed(1)}) без новых рекордов`
    );
  }

  const signalCount = Object.values(signals).filter(Boolean).length;
  const recommended =
    signalCount >= 3 || (signals.highLoad && (signals.plateau || signals.readinessDecline));

  // Фича 5: если разгрузка рекомендована, предлагаем оба варианта (объём и техника)
  const availableTypes: ('volume' | 'technique')[] = recommended ? ['volume', 'technique'] : [];

  // P1.2 / FD11-4: конкретный план разгрузки (только compound, вес −30%, snap-to-grid 2.5).
  // Канон отображения — WeeklyReviewSection (L2 «Объём»); UI-тексты обязаны совпадать.
  let plan: DeloadPlanItem[] | undefined;
  if (recommended && current.lastCompletedSets.length > 0) {
    plan = [];

    for (const ex of current.lastCompletedSets) {
      // Фильтр только по compound-упражнениям (упрощённая эвристика по названию)
      const nameLower = ex.exerciseName.toLowerCase();
      const isCompound =
        nameLower.includes('жим') ||
        nameLower.includes('press') ||
        nameLower.includes('присед') ||
        nameLower.includes('squat') ||
        nameLower.includes('тяга') ||
        nameLower.includes('row') ||
        nameLower.includes('deadlift') ||
        nameLower.includes('подтягивания') ||
        nameLower.includes('pullup') ||
        nameLower.includes('pull-down');

      if (!isCompound) continue;

      // Целевые повторения = середина диапазона или дефолт 6
      const targetReps = Math.round((ex.repsRange[0] + ex.repsRange[1]) / 2) || 6;

      // Прямой процент от веса, округлённый до 2.5 кг (snap-to-grid) — deload обычно именно процентный.
      const roundedNewWeight = Math.round((ex.lastWeight * 0.7) / 2.5) * 2.5;

      plan.push({
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        currentWeight: ex.lastWeight,
        currentReps: ex.lastReps,
        newWeight: Math.max(roundedNewWeight, 2.5),
        newReps: targetReps,
      });
    }
  }

  return { recommended, signals, reasons, availableTypes, plan };
}
