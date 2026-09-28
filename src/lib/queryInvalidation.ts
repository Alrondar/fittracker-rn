// src/lib/queryInvalidation.ts
// AUDIT-28.09 (BUG-1/2/10): единый владелец списков кэш-инвалидаций.
// До этого финиш/пропуск тренировки не инвалидировали НИЧЕГО (данные на
// Главная/Прогрессе вставали до staleTime), а сохранение питания из профиля —
// только локальный useState. Правило CLAUDE.md «один факт — один владелец»:
// список зависимых queryKey живёт здесь, точки мутаций только вызывают.
import type { QueryClient } from '@tanstack/react-query';

/**
 * Завершение или пропуск тренировки меняет: дашборд, прогресс-хаб, историю,
 * список тренировок, статистику мышц, недельные сводки, прогноз, боль,
 * статус активной программы (прогресс-поинтер).
 * Инвалидация по префиксам — RQ матчит все суффиксы (weekOffset/unit/диапазоны).
 */
export function invalidateWorkoutAffectedCaches(qc: QueryClient, userId: string) {
  const keys: string[][] = [
    ['dashboard', userId],
    ['progress', userId],
    ['history', userId],
    ['workouts', userId],
    ['muscleStats', userId],
    ['weeklySummary', userId],
    ['workoutForecast', userId],
    ['painTrend', userId],
    ['todayPain', userId],
    ['userProgramsStatus'],
  ];
  for (const queryKey of keys) {
    qc.invalidateQueries({ queryKey });
  }
}

/**
 * Запись приёма пищи меняет дневную/недельную карточку питания и список
 * записей дня (совпадает с набором NutritionAddModal, NUTRI-2).
 */
export function invalidateNutritionCaches(qc: QueryClient, userId: string) {
  const keys: string[][] = [
    ['dailyNutrition', userId],
    ['weeklyNutrition', userId],
    ['nutritionLogs', userId],
  ];
  for (const queryKey of keys) {
    qc.invalidateQueries({ queryKey });
  }
}
