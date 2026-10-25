// Офлайн-проверка двух чистых частей механизма «скачать активную программу»:
//   npx tsx scripts/check-program-snapshot.ts
// 1) построение списка дней (src/utils/workoutSections.ts) — секции, порядок, прогресс;
// 2) план кадров программы (src/utils/framePlan.ts) — свои против замен, дедупликация,
//    версия кадра в адресе и переключение Ж/М.
// Хранилище (файл / IndexedDB) и запросы к базе здесь не проверяются: они живут только
// в приложении, это прогон на устройстве и в браузере.
import { buildWorkoutsData, type WorkoutListRow } from '../src/utils/workoutSections';
import { planProgramFrames } from '../src/utils/framePlan';
import type { SnapshotExerciseRow } from '../src/utils/exerciseSearchLocal';

const row = (
  patch: Partial<SnapshotExerciseRow> & { id: string; name: string }
): SnapshotExerciseRow => ({
  technique: null,
  settings: null,
  benefits: null,
  risks: null,
  media_url: null,
  category: 'strength',
  can_be_activation: false,
  movement_pattern: null,
  difficulty: null,
  status: 'approved',
  primary_muscles: [],
  secondary_muscles: [],
  aliases: [],
  short_name: null,
  name_eng: null,
  equipment: [],
  relationships: [],
  warnings: [],
  ...patch,
});

const workout = (
  patch: Partial<WorkoutListRow> & { id: string; day_index: number }
): WorkoutListRow => ({
  name: `День ${patch.day_index}`,
  phase_number: 1,
  week_number: 1,
  finished_at: null,
  skipped_at: null,
  ...patch,
});

const ACTIVE = {
  programId: 'p1',
  name: 'Тест',
  currentPhase: 1,
  currentWeek: 1,
  currentDay: 2,
  phases: [
    { phase_number: 1, name: 'Втягивание', phase_type: 'strength' },
    { phase_number: 2, name: 'Сила', phase_type: 'strength' },
  ],
};

const cases: [string, () => unknown, unknown][] = [
  [
    'нет активной программы',
    () => buildWorkoutsData(null, []),
    {
      activeProgram: null,
      sections: [],
      progress: { completed: 0, total: 0 },
    },
  ],
  [
    'секции по (фаза, неделя) и порядок секций',
    () => {
      const data = buildWorkoutsData(ACTIVE, [
        workout({ id: 'w1', day_index: 2, phase_number: 2, week_number: 1 }),
        workout({ id: 'w2', day_index: 1, phase_number: 1, week_number: 2 }),
        workout({ id: 'w3', day_index: 1, phase_number: 1, week_number: 1 }),
      ]);
      return data.sections.map((section) => section.key);
    },
    ['1-1', '1-2', '2-1'],
  ],
  [
    'порядок дней внутри секции — по day_index, а не по порядку строк в источнике',
    () => {
      const data = buildWorkoutsData(ACTIVE, [
        workout({ id: 'b', day_index: 3 }),
        workout({ id: 'a', day_index: 1 }),
        workout({ id: 'c', day_index: 2 }),
      ]);
      return data.sections[0].data.map((item) => item.id);
    },
    ['a', 'c', 'b'],
  ],
  [
    'название секции берётся из фазы, а не из ниоткуда',
    () => buildWorkoutsData(ACTIVE, [workout({ id: 'w', day_index: 1 })]).sections[0].phaseName,
    'Втягивание',
  ],
  [
    'пропуск не считается выполненным (FIT-7)',
    () => {
      const data = buildWorkoutsData(ACTIVE, [
        workout({ id: 'w1', day_index: 1, finished_at: '2026-10-20' }),
        workout({ id: 'w2', day_index: 2, finished_at: '2026-10-21', skipped_at: '2026-10-21' }),
      ]);
      return data.progress;
    },
    { completed: 1, total: 2 },
  ],
];

const HOST = 'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises';
const CATALOG: SnapshotExerciseRow[] = [
  row({ id: 'bench', name: 'Жим лежа', media_url: `${HOST}/Bench_Press/00f.jpg?v=3` }),
  row({
    id: 'squat',
    name: 'Присед',
    media_url:
      'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Squat/0.jpg',
  }),
  row({ id: 'pushup', name: 'Отжимания', media_url: `${HOST}/Pushup/00f.jpg` }),
  row({
    id: 'incline',
    name: 'Жим под углом',
    media_url: `${HOST}/Incline_Press/00f.jpg`,
    relationships: [
      { related_exercise_id: 'bench', relation_type: 'variation', status: 'approved' },
      { related_exercise_id: 'pushup', relation_type: 'alternative', status: 'suggested' },
      { related_exercise_id: 'ghost', relation_type: 'alternative', status: 'rejected' },
    ],
  }),
];

const frameCases: [string, () => unknown, unknown][] = [
  [
    'кадры программы: обе рамки, версия адреса сохраняется',
    () => planProgramFrames(CATALOG, ['bench'], 'female').own,
    [`${HOST}/Bench_Press/00f.jpg?v=3`, `${HOST}/Bench_Press/01f.jpg?v=3`],
  ],
  [
    'легаси-схема даёт 0.jpg + 1.jpg',
    () => planProgramFrames(CATALOG, ['squat'], 'female').own,
    [
      'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Squat/0.jpg',
      'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Squat/1.jpg',
    ],
  ],
  [
    'мужской профиль переключает суффикс пары',
    () => planProgramFrames(CATALOG, ['pushup'], 'male').own,
    [`${HOST}/Pushup/00m.jpg`, `${HOST}/Pushup/01m.jpg`],
  ],
  [
    'замены: только approved/suggested, в порядке рёбер; отсеянный вариант не попадает',
    () => planProgramFrames(CATALOG, ['incline'], 'female').alternatives,
    [
      `${HOST}/Bench_Press/00f.jpg?v=3`,
      `${HOST}/Bench_Press/01f.jpg?v=3`,
      `${HOST}/Pushup/00f.jpg`,
      `${HOST}/Pushup/01f.jpg`,
    ],
  ],
  [
    'кадр, который есть и в программе, и в заменах, считается один раз — программой',
    () => {
      const plan = planProgramFrames(CATALOG, ['incline', 'bench'], 'female');
      return {
        overlap: plan.own.filter((url) => plan.alternatives.includes(url)).length,
        benchInAlts: plan.alternatives.some((url) => url.includes('Bench_Press')),
      };
    },
    { overlap: 0, benchInAlts: false },
  ],
  [
    'упражнения нет в снимке справочника — кадр не планируем (не выдумываем адрес)',
    () => planProgramFrames(CATALOG, ['unknown'], 'female'),
    { own: [], alternatives: [] },
  ],
];

let failed = 0;
const run = (set: [string, () => unknown, unknown][]) => {
  for (const [name, get, want] of set) {
    const got = get();
    if (JSON.stringify(got) !== JSON.stringify(want)) {
      failed += 1;
      console.log(`FAIL ${name}\n  want ${JSON.stringify(want)}\n  got  ${JSON.stringify(got)}`);
    } else {
      console.log(`ok   ${name}`);
    }
  }
};

run(cases);
run(frameCases);
console.log(
  failed === 0
    ? `\nВСЕ ${cases.length + frameCases.length} СЛУЧАЯ ЗЕЛЁНЫЕ`
    : `\nПРОВАЛОВ: ${failed}`
);
process.exit(failed === 0 ? 0 : 1);
