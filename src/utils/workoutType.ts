// Вердикт владельца 27.10 (вариант «a»): новая колонка не вводим, укладываем
// фазы в четыре уже разрешённые CHECK-ом значения. Кардио из фазы не появляется
// никогда — в словаре phase_type его нет.
// Это же правило на стороне базы — public.workout_type_from_phase_type(text)
// (миграция 20261027190000_workout_type_from_phase.sql).
export type WorkoutType = 'strength' | 'hypertrophy' | 'cardio' | 'mixed';

export function workoutTypeFromPhaseType(phaseType: string | null | undefined): WorkoutType {
  if (phaseType === 'strength') return 'strength';
  if (phaseType === 'hypertrophy') return 'hypertrophy';
  return 'mixed';
}
