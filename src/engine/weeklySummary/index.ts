// src/engine/weeklySummary/index.ts
// ENG-6: детерминированная еженедельная сводка (ROADMAP C4). Чистая функция без
// React/Supabase. Нарезка CTR-3 (19.10) пути импорта не меняет: consumers пишут
// `engine/weeklySummary`. Внутри: types.ts — контракты, insights.ts — инсайты,
// load.ts — нагрузка и разгрузка.
export type {
  BuildInsightsOptions,
  DeloadContext,
  DeloadPlanItem,
  DeloadSignalKey,
  InsightSeverity,
  TrainingLoadContext,
  WeeklyInsight,
  WeeklySummaryData,
  WeeklySummaryResult,
} from './types';
export { buildWeeklyInsights } from './insights';
export { calculateDeloadContext, calculateTrainingLoadContext } from './load';
