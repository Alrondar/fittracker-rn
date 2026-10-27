// Офлайн-проверка журнала незаписанных подходов (CONN-1, 27.10) на РЕАЛЬНЫХ чистых
// функциях src/utils/outboxMerge.ts. Запуск из корня: npx tsx scripts/check-outbox.ts
// (tsx — devDependency). В проекте нет jest, поэтому это харнес, а не тестовый файл;
// в src/ не кладётся, чтобы не создавать ложный «тестовый слой».
// Импортируется только чистый слой: src/lib/logsOutbox.ts тянет react-native и
// expo-file-system, а npx tsx на них падает.
// Выход 0 = все проверки зелёные, 1 = есть провал.
import {
  overlayOutboxSets,
  countUnsentSets,
  countFilledSets,
  buildOutboxEntries,
  mergeOutboxDoc,
  removeOutboxKeys,
  removeOutboxWorkout,
  keepOutboxWorkouts,
  type OutboxEntry,
  type ServerLogStamp,
} from '../src/utils/outboxMerge';
import type { SetData } from '../src/types/workout';
import { pluralWord } from '../src/utils/plural';

const results: boolean[] = [];

function check(name: string, passed: boolean, detail = ''): void {
  console.log(`${passed ? 'OK  ' : 'FAIL'} ${name}${passed || !detail ? '' : ` — ${detail}`}`);
  results.push(passed);
}

const set = (patch: Partial<SetData> = {}): SetData => ({
  weight: '',
  reps: '',
  reps_left: '',
  reps_right: '',
  ...patch,
});

const entry = (
  sets: SetData[],
  updatedAt: number,
  workoutId = 'w-1',
  workoutExerciseId = 'we-1'
): OutboxEntry => ({
  workout_id: workoutId,
  workout_exercise_id: workoutExerciseId,
  sets,
  updated_at: updatedAt,
});

const stamp = (setNumber: number, completedAt: string | null): ServerLogStamp => ({
  set_number: setNumber,
  completed_at: completedAt,
});

const T0 = Date.parse('2026-10-27T10:00:00.000Z');
const iso = (ms: number) => new Date(T0 + ms).toISOString();

// 1. журнала нет — сетка остаётся как есть
{
  const sets = [set({ weight: '80', reps: '8' })];
  const merged = overlayOutboxSets(sets, [stamp(1, iso(0))], null);
  check(
    '1. журнал пуст → значения не тронуты, ключ не держим',
    merged.keep === false && merged.sets[0].weight === '80'
  );
}

// 2. сервер свежее журнала — журнал выбрасываем, серверное значение остаётся
{
  const sets = [set({ weight: '80', reps: '8' })];
  const journal = entry([set({ weight: '100', reps: '5' })], T0);
  const merged = overlayOutboxSets(sets, [stamp(1, iso(10_000))], journal);
  check(
    '2. серверная строка свежее метки журнала → keep false, вес остался серверный',
    merged.keep === false && merged.sets[0].weight === '80' && merged.sets[0].reps === '8',
    `keep=${merged.keep}, weight=${merged.sets[0].weight}`
  );
}

// 3. журнал свежее сервера — значения перекрываются и идут в досылку
{
  const sets = [set({ weight: '80', reps: '8' })];
  const journal = entry([set({ weight: '100', reps: '5' })], T0 + 20_000);
  const merged = overlayOutboxSets(sets, [stamp(1, iso(0))], journal);
  check(
    '3. журнал свежее → вес и повторы взяты из журнала, keep true',
    merged.keep === true && merged.sets[0].weight === '100' && merged.sets[0].reps === '5',
    `keep=${merged.keep}, weight=${merged.sets[0].weight}`
  );
}

// 4. журнал и сервер совпадают — повторную отправку не плодим
{
  const sets = [set({ weight: '80', reps: '8', rpe: 9 })];
  const journal = entry([set({ weight: '80', reps: '8', rpe: 9 })], T0 + 20_000);
  const merged = overlayOutboxSets(sets, [stamp(1, iso(0))], journal);
  check('4. значения совпадают → keep false (нет ложной досылки)', merged.keep === false);
}

// 5. журнал шире сетки: подход добавили офлайн, persist подходов не доехал
{
  const sets = [set({ weight: '80' }), set({ weight: '82.5' }), set({ weight: '85' })];
  const journal = entry(
    [
      set({ weight: '80' }),
      set({ weight: '82.5' }),
      set({ weight: '85' }),
      set({ weight: '87.5', reps: '6' }),
    ],
    T0 + 20_000
  );
  const merged = overlayOutboxSets(
    sets,
    [stamp(1, iso(0)), stamp(2, iso(0)), stamp(3, iso(0))],
    journal
  );
  check(
    '5. журнал шире сетки → сетка выросла до 4, четвёртый подход из журнала',
    merged.sets.length === 4 &&
      merged.keep === true &&
      merged.sets[3].weight === '87.5' &&
      merged.sets[3].reps === '6',
    `длина=${merged.sets.length}, weight4=${merged.sets[3]?.weight}`
  );
}

// 6. пустой слот журнала не перетирает сохранённый подход
{
  const sets = [set({ weight: '80', reps: '8' })];
  const journal = entry([set()], T0 + 20_000);
  const merged = overlayOutboxSets(sets, [stamp(1, iso(0))], journal);
  check(
    '6. пустой слот журнала не чистит серверное значение',
    merged.keep === false && merged.sets[0].weight === '80' && merged.sets[0].reps === '8'
  );
}

// 7. счётчик неподтверждённых подходов: пустой не считается, только-с-RPE считается (F3)
{
  const queue = new Map<string, SetData[]>([
    ['we-1', [set({ weight: '80' }), set({ weight: '82.5' }), set({ weight: '85' }), set()]],
    ['we-2', [set({ rpe: 9 }), set()]],
  ]);
  const total = countUnsentSets(queue.entries());
  const single = countFilledSets([set({ weight: '80' }), set(), set({ reps: '12' })]);
  check(
    '7. countUnsentSets: 3 заполненных + пустой + 1 только с RPE = 4',
    total === 4,
    `получили ${total}`
  );
  check('7б. countFilledSets на одном упражнении = 2', single === 2, `получили ${single}`);
}

// 8. сборка записей журнала: метка приходит снаружи, пустые наборы не пишутся,
// подсказки previous* не едут в журнал
{
  const buffer = new Map<string, SetData[]>([
    ['we-1', [set({ weight: '80', previousWeight: 75 })]],
    ['we-2', [set(), set()]],
  ]);
  const entries = buildOutboxEntries('w-9', buffer, T0);
  check(
    '8. buildOutboxEntries: пустое упражнение пропущено, метка и занятие проставлены',
    entries.length === 1 &&
      entries[0].workout_exercise_id === 'we-1' &&
      entries[0].workout_id === 'w-9' &&
      entries[0].updated_at === T0,
    `записей ${entries.length}`
  );
  check(
    '8б. подсказка предыдущего веса в журнал не попала',
    (entries[0].sets[0] as Partial<SetData>).previousWeight === undefined
  );
}

// 9. операции над документом: upsert без дублей, точечные удаления
{
  const doc = {
    entries: [
      entry([set({ weight: '80' })], T0, 'w-1', 'we-1'),
      entry([set({ weight: '60' })], T0, 'w-2', 'we-2'),
    ],
  };
  const merged = mergeOutboxDoc(doc, [entry([set({ weight: '90' })], T0 + 5_000, 'w-1', 'we-1')]);
  const keysReplaced =
    merged.entries.length === 2 &&
    merged.entries.find((e) => e.workout_exercise_id === 'we-1')?.sets[0].weight === '90';
  check(
    '9. mergeOutboxDoc: перезапись по ключу без дубля',
    keysReplaced === true,
    `записей ${merged.entries.length}`
  );

  const dropped = removeOutboxKeys(merged, ['we-1']);
  check(
    '9б. removeOutboxKeys: чужое занятие не задето',
    dropped.entries.length === 1 && dropped.entries[0].workout_exercise_id === 'we-2'
  );

  const afterWorkout = removeOutboxWorkout(merged, 'w-1');
  check(
    '9в. removeOutboxWorkout: удалены только строки занятия w-1',
    afterWorkout.entries.length === 1 && afterWorkout.entries[0].workout_id === 'w-2'
  );

  const onlyW1 = keepOutboxWorkouts(merged, 'w-1');
  check(
    '9г. keepOutboxWorkouts: при входе видно только своё занятие',
    onlyW1.entries.length === 1 && onlyW1.entries[0].workout_exercise_id === 'we-1'
  );
}

// 10. сервер отдал строки без метки (старый снимок) — сравнивать не с чем,
// журнал держим и досылаем: потерянных подходов это не даёт
{
  const sets = [set({ weight: '80', reps: '8' })];
  const journal = entry([set({ weight: '100', reps: '5' })], T0);
  const merged = overlayOutboxSets(sets, [stamp(1, null)], journal);
  check(
    '10. сервер без completed_at → журнал не считаем устаревшим, вес взят из журнала',
    merged.keep === true && merged.sets[0].weight === '100'
  );
}

// 11. склонение в подписи плашки (CONN-1, тексты «не записано N подходов»)
{
  const forms: [string, string, string] = ['подход', 'подхода', 'подходов'];
  const cases: Array<[number, string]> = [
    [1, '1 подход'],
    [2, '2 подхода'],
    [5, '5 подходов'],
    [21, '21 подход'],
    [11, '11 подходов'],
    [111, '111 подходов'],
  ];
  const wrong = cases.filter(([n, expected]) => pluralWord(n, forms) !== expected);
  check(
    '11. pluralWord: 1/2/5/21/11/111',
    wrong.length === 0,
    wrong.map(([n, expected]) => `${n} → «${pluralWord(n, forms)}», ждали «${expected}»`).join('; ')
  );
}

console.log(`\nИтог: ${results.filter(Boolean).length} из ${results.length} проверок зелёные`);
process.exit(results.every(Boolean) ? 0 : 1);
