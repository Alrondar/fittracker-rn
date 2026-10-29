// Позиция 5 (28.10): движок предлагал разгрузку после трёх удержаний подряд
// (`PLATEAU_DELOAD` в progression/core.ts), но счётчик удержаний не передавал никто.
// Здесь — правило, по которому счётчик считается по истории рабочих подходов.
// Спецификация владельца 28.10: удержание = верхний рабочий вес упражнения совпал
// с прошлой сессией (без проверки повторов и усилия); считаются только завершённые
// прошлые сессии; если сегодня вес поставлен другой — удержания нет.
import type { RecentLog } from '../hooks/workout/useWorkoutSession.types';

const EPSILON_KG = 1e-6;

type SessionTop = { workoutId: string; weight: number; lastStamp: number };

// Подходы одной тренировки приходят общим потоком с другими занятиями, поэтому
// занятие восстанавливается по workout_id строки упражнения, а его место в серии —
// по самому позднему времени среди его подходов (отложенный досыл журнала мог
// разнести строки одной тренировки по времени).
function collectSessionTops(logs: RecentLog[], exerciseId: string): SessionTop[] {
  const acc = new Map<string, SessionTop>();

  for (const log of logs) {
    const owner = Array.isArray(log.workout_exercises)
      ? log.workout_exercises[0]
      : log.workout_exercises;
    if (!owner || owner.exercise_id !== exerciseId) continue;
    if (!owner.workout_id) continue;
    if (log.weight_kg == null || !(log.weight_kg > 0)) continue;

    const parsed = Date.parse(log.created_at ?? '');
    const stamp = Number.isNaN(parsed) ? 0 : parsed;
    const prev = acc.get(owner.workout_id);

    if (!prev) {
      acc.set(owner.workout_id, {
        workoutId: owner.workout_id,
        weight: log.weight_kg,
        lastStamp: stamp,
      });
    } else {
      prev.weight = Math.max(prev.weight, log.weight_kg);
      prev.lastStamp = Math.max(prev.lastStamp, stamp);
    }
  }

  return Array.from(acc.values()).sort(
    (a, b) => b.lastStamp - a.lastStamp || a.workoutId.localeCompare(b.workoutId)
  );
}

/**
 * Сколько последних занятий подряд верхний рабочий вес упражнения не менялся.
 * 0 — истории нет, веса в истории нет, или сегодня поставлен другой вес (значит
 * атлет уже пошёл дальше плато, и разгрузка не нужна).
 */
export function countConsecutiveHolds(opts: {
  logs: RecentLog[];
  exerciseId: string;
  currentWeightKg: number | null;
}): number {
  const sessions = collectSessionTops(opts.logs, opts.exerciseId);
  if (sessions.length === 0) return 0;

  const runWeight = sessions[0].weight;
  if (opts.currentWeightKg != null && Math.abs(opts.currentWeightKg - runWeight) > EPSILON_KG) {
    return 0;
  }

  let count = 0;
  for (const s of sessions) {
    if (Math.abs(s.weight - runWeight) > EPSILON_KG) break;
    count += 1;
  }
  return count;
}
