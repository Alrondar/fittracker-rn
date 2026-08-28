/**
 * P0 Вариант B: авто-расчёт readiness на основе деталей восстановления.
 * Чистая функция — без React/Supabase (CLAUDE.md §2).
 * 
 * Логика (научно обоснованная):
 * - Сон 7–9ч = оптимум (NSCA), <6ч = риск восстановления
 * - Качество сна: линейная шкала 1–5
 * - Стресс ≥4 = высокий риск (влияет на RPE, травмы)
 * - Soreness ≥4 = мышечная усталость
 * 
 * Возвращает null если нет данных — не выдумываем (PRODUCT.md §3.1).
 */
export function calculateReadinessFromDetails(
  sleepHours: number | null,
  sleepQuality: number | null,
  stressLevel: number | null,
  soreness: number | null
): number | null {
  const hasData = sleepHours !== null || sleepQuality !== null || 
                  stressLevel !== null || soreness !== null;
  if (!hasData) return null;

  let score = 3; // baseline

  // Сон: 7–9ч = +1, 6ч = 0, <6ч = -1, >9ч = 0 (пересып тоже не оптимум)
  if (sleepHours !== null) {
    if (sleepHours >= 7 && sleepHours <= 9) score += 1;
    else if (sleepHours >= 6 && sleepHours < 7) score += 0;
    else if (sleepHours < 6) score -= 1;
    // >9ч — без бонуса (не пересып, но и не оптимум)
  }

  // Качество сна: 1→-1, 2→-0.5, 3→0, 4→+0.5, 5→+1
  if (sleepQuality !== null) {
    score += (sleepQuality - 3) * 0.5;
  }

  // Стресс: 1–2→+1, 3→0, 4→-1, 5→-1.5
  if (stressLevel !== null) {
    if (stressLevel <= 2) score += 1;
    else if (stressLevel === 3) score += 0;
    else if (stressLevel === 4) score -= 1;
    else score -= 1.5;
  }

  // Боль/усталость: ≥4→-1
  if (soreness !== null && soreness >= 4) {
    score -= 1;
  }

  return Math.min(5, Math.max(1, Math.round(score)));
}