// Офлайн-проверка Ф2/Ф3 на РЕАЛЬНОМ маппере src/hooks/workout/
// useWorkoutSession.mapper.ts. Запуск из корня: npx tsx scripts/check-workout-resume.ts
// (tsx — devDependency). В проекте нет jest (проверено 27.09), поэтому это харнес,
// а не тестовый файл; в src/ не кладётся, чтобы не создавать ложный «тестовый слой».
// Выход 0 = все проверки зелёные, 1 = есть провал.
import { buildExercisesData } from '../src/hooks/workout/useWorkoutSession.mapper';

const EX_ID = 'ex-1';
const WE_ID = 'we-1';

const exerciseRow = {
  id: EX_ID,
  name: 'Жим гантелей сидя',
  primary_muscles: ['плечи'],
  secondary_muscles: [],
  technique: [],
  settings: [],
  benefits: [],
  risks: [],
  media_url: null,
} as any;

const weRow = (targetSets: number | null) =>
  ({
    id: WE_ID,
    exercise_id: EX_ID,
    order_index: 1,
    position: 1,
    target_sets: targetSets,
    rest_seconds: 90,
    intensity: 'high',
    target_reps_range: '8-12',
    target_rpe: 8,
    progression_policy: 'double_progression',
  }) as any;

const log = (
  set_number: number,
  weight: number | null,
  reps: number | null,
  extra: Record<string, unknown> = {}
) => ({
  set_number,
  weight_kg: weight,
  reps,
  reps_left: null,
  reps_right: null,
  rpe: null,
  rir: null,
  difficulty: null,
  is_warmup: false,
  is_estimated_reps: false,
  ...extra,
});

const run = (
  name: string,
  targetSets: number | null,
  logs: ReturnType<typeof log>[],
  expect: { sets: number; checks: Array<[number, string, unknown]> }
) => {
  const out = buildExercisesData(
    [weRow(targetSets)],
    new Map([[EX_ID, exerciseRow]]),
    { [WE_ID]: logs as any },
    { [EX_ID]: { equipment: [], injuries: [], alternativeIds: [] } },
    new Map()
  );
  const sets = out[0]?.sets ?? [];
  const problems: string[] = [];
  if (sets.length !== expect.sets) {
    problems.push(`длины: ожидалось ${expect.sets}, получено ${sets.length}`);
  }
  expect.checks.forEach(([idx, field, want]) => {
    const got = (sets[idx] as any)?.[field];
    if (String(got) !== String(want)) {
      problems.push(
        `сет ${Number(idx) + 1}.${field}: ожидалось ${String(want)}, получено ${String(got)}`
      );
    }
  });
  console.log(
    `${problems.length ? 'ПРОВАЛ' : 'ок      '} ${name}${problems.length ? ' — ' + problems.join('; ') : ''}`
  );
  return problems.length === 0;
};

const fiveLogs = [log(1, 30, 10), log(2, 30, 9), log(3, 32, 8), log(4, 32, 8), log(5, 34, 6)];

const results = [
  // Ф2: сохранённые подходы сверх target_sets должны оставаться на экране
  run('Ф2 target=3, сохранено 5 подхода → сетка 5', 3, fiveLogs, {
    sets: 5,
    checks: [
      [3, 'weight', '32'],
      [3, 'reps', '8'],
      [4, 'weight', '34'],
      [4, 'reps', '6'],
    ],
  }),
  // прежнее поведение не сломано: target больше сохранённого
  run('Ф2 target=4, сохранено 2 → сетка 4', 4, fiveLogs.slice(0, 2), {
    sets: 4,
    checks: [
      [0, 'weight', '30'],
      [3, 'weight', ''],
    ],
  }),
  run('Ф2 target=null (дефолт 3), сохранено 3 → сетка 3', null, fiveLogs.slice(0, 3), {
    sets: 3,
    checks: [
      [2, 'weight', '32'],
      [3, 'weight', undefined],
    ],
  }),
  run('Ф2 target=5, сохранено 5 → сетка 5 (без пересчёта)', 5, fiveLogs, {
    sets: 5,
    checks: [[4, 'reps', '6']],
  }),
  // Ф3: подход без веса и повторов, но с RPE, должен отображаться
  run(
    'Ф3 сет только с RPE попадает в сетку',
    3,
    [log(1, 30, 10), log(2, null, null, { rpe: 8, rir: 2 }), log(3, 32, 8)],
    {
      sets: 3,
      checks: [
        [1, 'rpe', 8],
        [1, 'rir', 2],
        [1, 'weight', ''],
      ],
    }
  ),
  // Ф2+Ф3 вместе: RPE-сет сверх плана
  run(
    'Ф2+Ф3 RPE-сет номер 5 при target=3',
    3,
    [...fiveLogs.slice(0, 4), log(5, null, null, { rpe: 9 })],
    {
      sets: 5,
      checks: [[4, 'rpe', 9]],
    }
  ),
];

console.log(`\nИтог: ${results.filter(Boolean).length} из ${results.length} проверок зелёные`);
process.exit(results.every(Boolean) ? 0 : 1);
