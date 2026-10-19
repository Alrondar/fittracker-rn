// ENG-6: инсайты недели. Инсайт срабатывает только при выполненном условии
// (PRODUCT.md §3.4 — контекст без перегруза); все они содержат метрики, поэтому
// объяснение не требует LLM (PRODUCT.md §4.5).
import type {
  BuildInsightsOptions,
  InsightSeverity,
  WeeklyInsight,
  WeeklySummaryData,
} from './types';

/**
 * Строит инсайты по текущей неделе и данным предыдущей.
 * Чистая функция; инсайт появляется только при выполненном условии
 * (PRODUCT.md §3.4 — не спамить пользователя).
 */
export function buildWeeklyInsights(
  current: WeeklySummaryData,
  previous: WeeklySummaryData,
  options: BuildInsightsOptions = {}
): WeeklyInsight[] {
  const insights: WeeklyInsight[] = [];
  const unit = options.unit ?? 'kg';
  const uL = unit === 'lb' ? 'lb' : 'кг';
  // Движок остаётся чистым: коэффициент идентичен kgToLb из useUnitPreferences.
  const vw = (kg: number) => Math.round(unit === 'lb' ? kg * 2.20462 : kg).toLocaleString('ru-RU');
  const add = (code: string, title: string, severity: InsightSeverity, subtitle?: string) =>
    insights.push({ code, title, subtitle, severity });

  // === Объём (сравнение с прошлой неделей, если в прошлой были тренировки) ===
  if (previous.totalVolume > 0) {
    const ratio = current.totalVolume / previous.totalVolume;

    // P1.3: Определяем порог на основе доминирующего типа тренировки
    let thresholdUp = 1.1;
    let thresholdDown = 0.9;

    if (current.totalVolume > 0) {
      const strengthRatio = current.volumeByType.strength / current.totalVolume;
      const hypertrophyRatio = current.volumeByType.hypertrophy / current.totalVolume;
      const cardioRatio = current.volumeByType.cardio / current.totalVolume;

      if (strengthRatio > 0.5) {
        thresholdUp = 1.15;
        thresholdDown = 0.85;
      } else if (hypertrophyRatio > 0.5) {
        thresholdUp = 1.1;
        thresholdDown = 0.9;
      } else if (cardioRatio > 0.5) {
        thresholdUp = 1.2;
        thresholdDown = 0.8;
      }
    }

    if (ratio >= thresholdUp) {
      add(
        'VOLUME_UP',
        `Объём вырос на ${Math.round((ratio - 1) * 100)}%`,
        'positive',
        `по сравнению с прошлой неделей (${vw(previous.totalVolume)} → ${vw(current.totalVolume)} ${uL})`
      );
    } else if (ratio <= thresholdDown) {
      add(
        'VOLUME_DOWN',
        `Объём снизился на ${Math.round((1 - ratio) * 100)}%`,
        'caution',
        `по сравнению с прошлой неделей (${vw(previous.totalVolume)} → ${vw(current.totalVolume)} ${uL})`
      );
    } else {
      add(
        'VOLUME_STABLE',
        'Стабильный объём',
        'neutral',
        `примерно как прошлая неделя (${vw(current.totalVolume)} ${uL})`
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
        ? `${vw(first.maxWeight)} ${uL} · ${vw(first.e1rm)} ${uL} 1RM`
        : current.prs
            .map((p) => p.exerciseName)
            .slice(0, 3)
            .join(', ');
    add('NEW_PR', title, 'positive', subtitle);
  }

  // === Боль: высокий count или повторяющаяся зона ===
  const painHigh = current.pain.count >= 3 || current.pain.bodyParts.some((p) => p.count >= 2);
  if (painHigh) {
    const top = current.pain.bodyParts[0];
    add(
      'PAIN_SPIKE',
      `Боль: ${current.pain.count} событий за неделю`,
      'warning',
      top ? `чаще всего: ${top.bodyPart} (${top.count})` : undefined
    );
  }

  // === Readiness (нужно минимум 3 записи для стабильного сигнала) ===
  if (current.readiness.daysLogged >= 3 && current.readiness.avg != null) {
    if (current.readiness.avg < 3) {
      add(
        'LOW_READINESS',
        'Низкий readiness',
        'caution',
        `среднее ${current.readiness.avg.toFixed(1)} из 5 за ${current.readiness.daysLogged} дн.`
      );
    } else if (current.readiness.avg >= 4.5) {
      add(
        'HIGH_READINESS',
        'Высокий readiness',
        'positive',
        `среднее ${current.readiness.avg.toFixed(1)} из 5 — хороший период для прогресса`
      );
    }
  }

  // === Высокий средний RPE ===
  if (current.rpe.count >= 5 && current.rpe.avg != null && current.rpe.avg >= 8.5) {
    add(
      'HIGH_RPE_WEEK',
      'Высокий средний RPE',
      'caution',
      `средний RPE ${current.rpe.avg.toFixed(1)} из 10 — возможна высокая нагрузка`
    );
  }

  // === Регулярность (≥4 тренировок за неделю — условный порог «стабильная неделя») ===
  if (current.workoutsCount >= 4) {
    add('CONSISTENT_WEEK', `Регулярная неделя: ${current.workoutsCount} тренировок`, 'positive');
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
      let subtitle =
        'Объём стабилен 2 недели подряд (±5%), PR нет. Рассмотрите неделю разгрузки или смену схемы';
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
function normalizeGoal(
  goal: string | null
): 'muscle_gain' | 'strength' | 'weight_loss' | 'health' | null {
  if (!goal) return null;
  const g = goal.toLowerCase();
  if (g.includes('muscle') || g.includes('hypertrophy') || g.includes('mass') || g.includes('gain'))
    return 'muscle_gain';
  if (g.includes('strength') || g.includes('power') || g.includes('сила')) return 'strength';
  if (
    g.includes('weight') ||
    g.includes('fat') ||
    g.includes('loss') ||
    g.includes('lean') ||
    g.includes('похуд')
  )
    return 'weight_loss';
  if (
    g.includes('health') ||
    g.includes('fitness') ||
    g.includes('endurance') ||
    g.includes('well')
  )
    return 'health';
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
function adaptInsightText(
  ins: WeeklyInsight,
  goal: 'muscle_gain' | 'strength' | 'weight_loss' | 'health'
): void {
  const base = ins.subtitle ?? '';
  let context = '';

  switch (ins.code) {
    case 'VOLUME_UP':
      if (goal === 'muscle_gain') context = 'Ключевой фактор для роста мышц';
      else if (goal === 'strength') context = 'Хорошая база для силовых';
      break;
    case 'VOLUME_STABLE':
      if (goal === 'muscle_gain')
        context = 'Для роста мышц попробуй добавить 1-2 подхода на отстающую группу';
      else if (goal === 'strength') context = 'Стабильная база — можно повышать интенсивность';
      break;
    case 'VOLUME_DOWN':
      if (goal === 'muscle_gain' || goal === 'strength')
        context = 'Может замедлить прогресс к цели';
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
      if (goal === 'muscle_gain')
        context =
          'Для роста мышц важно менять стимул — попробуй добавить объём или сменить упражнение';
      else if (goal === 'strength')
        context = 'Для силы попробуй поработать в другом диапазоне повторов';
      break;
    case 'MUSCLE_IMBALANCE':
      if (goal === 'muscle_gain') context = 'Симметричный объём важен для пропорций и роста';
      break;
    case 'LOW_READINESS':
      if (goal === 'weight_loss')
        context = 'Дефицит калорий может снижать восстановление — следи за сном';
      else if (goal === 'health') context = 'Обрати внимание на восстановление';
      break;
    case 'HIGH_READINESS':
      if (goal === 'strength' || goal === 'muscle_gain')
        context = 'Хороший момент для тяжёлой тренировки или PR';
      break;
    case 'PAIN_SPIKE':
      if (goal === 'health') context = 'Ваше здоровье — приоритет, обратись к специалисту';
      break;
  }

  if (context) {
    ins.subtitle = base ? `${base} · ${context}` : context;
  }
}
