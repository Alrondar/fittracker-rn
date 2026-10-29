// Офлайн-проверка счётчика удержаний (позиция 5, 28.10) на РЕАЛЬНОЙ чистой функции
// src/utils/plateauStreak.ts. Запуск из корня: npx tsx scripts/check-plateau-streak.ts
// В проекте нет jest, поэтому это харнес, а не тестовый файл.
// Выход 0 = все проверки зелёные, 1 = есть провал.
import { countConsecutiveHolds } from '../src/utils/plateauStreak';
import { calculateProgression } from '../src/engine/progression/core';
import type { SetData } from '../src/types/workout';
import type { RecentLog } from '../src/hooks/workout/useWorkoutSession.types';

const results: boolean[] = [];

function check(name: string, passed: boolean, detail = ''): void {
  console.log(`${passed ? 'OK  ' : 'FAIL'} ${name}${passed || !detail ? '' : ` — ${detail}`}`);
  results.push(passed);
}

const EX = '11111111-1111-1111-1111-111111111111';
const OTHER = '22222222-2222-2222-2222-222222222222';

// Лог прошлого занятия: упражнение, подход, вес, время, идентификатор занятия.
const log = (weight: number | null, workoutId: string, at: string, ex = EX): RecentLog => ({
  weight_kg: weight,
  reps: 8,
  rpe: null,
  set_number: 1,
  created_at: at,
  workout_exercises: { exercise_id: ex, workout_id: workoutId },
});

const day = (n: number) => `2026-10-0${n}T10:00:00.000Z`;
const W1 = 'w-1';
const W2 = 'w-2';
const W3 = 'w-3';
const W4 = 'w-4';

// 1. Три последних занятия — тот же верхний вес.
const held = [log(80, W1, day(5)), log(80, W2, day(4)), log(80, W3, day(3)), log(75, W4, day(2))];
check(
  'три занятия подряд на одном весе дают три удержания',
  countConsecutiveHolds({ logs: held, exerciseId: EX, currentWeightKg: null }) === 3,
  String(countConsecutiveHolds({ logs: held, exerciseId: EX, currentWeightKg: null }))
);

// 2. Сегодня вес уже поднят — плато закончилось, разгрузка не нужна.
check(
  'если сегодня вес выше прошлого — удержаний ноль',
  countConsecutiveHolds({ logs: held, exerciseId: EX, currentWeightKg: 82.5 }) === 0
);

// 3. Сегодня вес тот же — серия считается.
check(
  'сегодняшний вес совпадает — серия сохраняется',
  countConsecutiveHolds({ logs: held, exerciseId: EX, currentWeightKg: 80 }) === 3
);

// 4. Верхний вес занятия = максимум его подходов, а не последний по записи.
const maxPerSession = [
  log(80, W1, day(5)),
  log(85, W1, day(5)),
  log(85, W2, day(4)),
  log(85, W3, day(3)),
];
check(
  'из подходов одного занятия берётся лучший вес',
  countConsecutiveHolds({ logs: maxPerSession, exerciseId: EX, currentWeightKg: null }) === 3,
  String(countConsecutiveHolds({ logs: maxPerSession, exerciseId: EX, currentWeightKg: null }))
);

// 5. Два занятия с разными весами — серия обрывается на первом расхождении.
const broken = [
  log(80, W1, day(5)),
  log(80, W2, day(4)),
  log(77.5, W3, day(3)),
  log(77.5, W4, day(2)),
];
check(
  'серия не прыгает через расхождение',
  countConsecutiveHolds({ logs: broken, exerciseId: EX, currentWeightKg: null }) === 2
);

// 6. История по другому упражнению не влияет.
const mixed = [log(80, W1, day(5)), log(60, W1, day(5), OTHER), log(80, W2, day(4))];
check(
  'чужие упражнения из общего потока истории игнорируются',
  countConsecutiveHolds({ logs: mixed, exerciseId: EX, currentWeightKg: null }) === 2
);

// 7. Пустые и нулевые веса не создают фантомных занятий.
const emptyish = [log(null, W1, day(5)), log(0, W2, day(4)), log(80, W3, day(3))];
check(
  'пустой вес не считается подходом',
  countConsecutiveHolds({ logs: emptyish, exerciseId: EX, currentWeightKg: null }) === 1
);

// 8. Нет истории — ноль.
check(
  'без истории удержаний ноль',
  countConsecutiveHolds({ logs: [], exerciseId: EX, currentWeightKg: null }) === 0
);

// 9. Строки без идентификатора занятия (старый снимок справочника) не группируются.
const noWorkoutId: RecentLog[] = [
  {
    weight_kg: 80,
    reps: 8,
    rpe: null,
    set_number: 1,
    created_at: day(5),
    workout_exercises: { exercise_id: EX },
  },
];
check(
  'без идентификатора занятия счётчик ноль, а не единица',
  countConsecutiveHolds({ logs: noWorkoutId, exerciseId: EX, currentWeightKg: null }) === 0
);

// 10. Массив в поле занятия (PostgREST иногда отдаёт список) разбирается.
const asArray: RecentLog[] = [
  {
    weight_kg: 80,
    reps: 8,
    rpe: null,
    set_number: 1,
    created_at: day(5),
    workout_exercises: [{ exercise_id: EX, workout_id: W1 }],
  },
  {
    weight_kg: 80,
    reps: 8,
    rpe: null,
    set_number: 1,
    created_at: day(4),
    workout_exercises: [{ exercise_id: EX, workout_id: W2 }],
  },
];
check(
  'список в поле упражнения обрабатывается как занятие',
  countConsecutiveHolds({ logs: asArray, exerciseId: EX, currentWeightKg: null }) === 2
);

// 11. Отложенный досыл: подходы одного занятия разнесены по времени, порядок
// занятий всё равно восстанавливается по самому позднему подходу.
const lateFlush = [
  log(80, W1, day(1)),
  log(80, W1, day(6)),
  log(70, W2, day(4)),
  log(80, W3, day(3)),
];
check(
  'поздний подход не переносит занятие в начало серии',
  countConsecutiveHolds({ logs: lateFlush, exerciseId: EX, currentWeightKg: null }) === 1,
  String(countConsecutiveHolds({ logs: lateFlush, exerciseId: EX, currentWeightKg: null }))
);

// 12–13. Сквозная проверка: то, что считает функция, действительно открывает ветку
// разгрузки в движке (до пакета она была недостижима ни при каких данных).
const heldForEngine = [log(80, W1, day(5)), log(80, W2, day(4)), log(80, W3, day(3))];
const engineSets: SetData[] = [
  {
    weight: '80',
    reps: '10',
    reps_left: '',
    reps_right: '',
    isWarmup: false,
    previousWeight: 80,
    previousReps: 10,
  },
  {
    weight: '80',
    reps: '10',
    reps_left: '',
    reps_right: '',
    isWarmup: false,
    previousWeight: 80,
    previousReps: 10,
  },
  {
    weight: '',
    reps: '',
    reps_left: '',
    reps_right: '',
    isWarmup: false,
    previousWeight: 80,
    previousReps: 10,
  },
];
const progression = calculateProgression({
  sets: engineSets,
  repsRange: '8-12',
  targetSetIndex: 2,
  targetRpe: 8,
  consecutiveHolds: countConsecutiveHolds({
    logs: heldForEngine,
    exerciseId: EX,
    currentWeightKg: 80,
  }),
});
check(
  'три удержания открывают в движке ветку разгрузки после плато',
  progression.reason.code === 'PLATEAU_DELOAD' && progression.action === 'decrease',
  `${progression.reason.code}, ${progression.action}, ${progression.suggestedWeight} кг`
);
check(
  'разгрузка после плато снимает 10 % с рабочего веса',
  progression.suggestedWeight === 72,
  String(progression.suggestedWeight)
);

const progressionTwo = calculateProgression({
  sets: engineSets,
  repsRange: '8-12',
  targetSetIndex: 2,
  targetRpe: 8,
  consecutiveHolds: countConsecutiveHolds({
    logs: [log(80, W1, day(5)), log(80, W2, day(4)), log(70, W3, day(3))],
    exerciseId: EX,
    currentWeightKg: 80,
  }),
});
check(
  'двух удержаний разгрузка не просит',
  progressionTwo.reason.code !== 'PLATEAU_DELOAD',
  progressionTwo.reason.code
);

const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} проверок зелёные`);
process.exit(failed ? 1 : 0);
