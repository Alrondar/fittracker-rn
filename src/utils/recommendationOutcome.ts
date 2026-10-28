// COACH-3 (позиция 4 очереди, 27.10): решение пользователя по рекомендации.
// Причина отказа больше не спрашивается — за два месяца на неё не ответили ни разу.
// Вместо этого пишется «изменено»: человек молча поставил свой вес, и это единственный
// измеримый сигнал несогласия. Здесь только правило, без React и без Supabase, чтобы
// его проверял офлайн-харнес (scripts/check-recommendation-outcome.ts).

export type RecommendationSuggestion = {
  action: string;
  reasonCode: string;
  suggestedWeight: number | null;
  suggestedReps: number | null;
};

export type ManualWeightChange = {
  decision: 'changed';
  engineAction: string;
  engineReasonCode: string;
  suggestedWeight: number;
  suggestedReps: number | null;
  appliedWeight: number;
};

// Расхождение меньше половины килограмма считается округлением ввода, а не
// несогласием: минимальный шаг прогрессии движка — 1,25 кг, номиналы блинов — 2,5.
export const MIN_MEANINGFUL_DELTA_KG = 0.5;

export function detectManualWeightChange(args: {
  field: 'weight' | 'reps' | 'reps_left' | 'reps_right';
  editedSetIndex: number;
  targetSetIndex: number | null;
  committedValue: string;
  suggestion: RecommendationSuggestion | null;
}): ManualWeightChange | null {
  const s = args.suggestion;
  if (args.field !== 'weight') return null;
  if (args.targetSetIndex === null || args.editedSetIndex !== args.targetSetIndex) return null;
  if (!s || s.action === 'no_data' || s.suggestedWeight == null) return null;

  const applied = Number.parseFloat(args.committedValue);
  if (!Number.isFinite(applied) || applied <= 0) return null;
  if (Math.abs(applied - s.suggestedWeight) < MIN_MEANINGFUL_DELTA_KG) return null;

  return {
    decision: 'changed',
    engineAction: s.action,
    engineReasonCode: s.reasonCode,
    suggestedWeight: s.suggestedWeight,
    suggestedReps: s.suggestedReps ?? null,
    appliedWeight: applied,
  };
}
