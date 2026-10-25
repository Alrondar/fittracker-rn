// Временная проверка резолвера схем: npx tsx spark-output/export/_media_scheme_check.ts
import { parseMediaUrls, isGenderedMedia } from '../../src/utils/mediaScheme';

const cases: [string, () => unknown, unknown][] = [
  [
    'легаси upstream, женский профиль',
    () =>
      parseMediaUrls(
        'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pullups/0.jpg',
        'female'
      ),
    [
      'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pullups/0.jpg',
      'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pullups/1.jpg',
    ],
  ],
  [
    'легаси upstream, мужской профиль — тот же кадр',
    () => parseMediaUrls('https://x/y/Pullups/0.jpg', 'male'),
    ['https://x/y/Pullups/0.jpg', 'https://x/y/Pullups/1.jpg'],
  ],
  [
    'легаси без пола (обратная совместимость)',
    () => parseMediaUrls('https://x/y/Pullups/0.jpg'),
    ['https://x/y/Pullups/0.jpg', 'https://x/y/Pullups/1.jpg'],
  ],
  [
    'новая схема, женский',
    () => parseMediaUrls('https://x/y/Bent_Over_Barbell_Row/00f.jpg', 'female'),
    ['https://x/y/Bent_Over_Barbell_Row/00f.jpg', 'https://x/y/Bent_Over_Barbell_Row/01f.jpg'],
  ],
  [
    'новая схема, мужской',
    () => parseMediaUrls('https://x/y/Bent_Over_Barbell_Row/00f.jpg', 'male'),
    ['https://x/y/Bent_Over_Barbell_Row/00m.jpg', 'https://x/y/Bent_Over_Barbell_Row/01m.jpg'],
  ],
  [
    'URL уже мужской, женский профиль',
    () => parseMediaUrls('https://x/y/Clamshell/00m.jpg', 'female'),
    ['https://x/y/Clamshell/00f.jpg', 'https://x/y/Clamshell/01f.jpg'],
  ],
  [
    'png сохраняется',
    () => parseMediaUrls('https://x/y/Z/00f.png', 'male'),
    ['https://x/y/Z/00m.png', 'https://x/y/Z/01m.png'],
  ],
  [
    'JSON-массив',
    () => parseMediaUrls('["https://x/a.jpg","https://x/b.jpg"]', 'male'),
    ['https://x/a.jpg', 'https://x/b.jpg'],
  ],
  [
    'список через запятую',
    () => parseMediaUrls('https://x/a.jpg, https://x/b.jpg', 'male'),
    ['https://x/a.jpg', 'https://x/b.jpg'],
  ],
  [
    'произвольный URL',
    () => parseMediaUrls('https://x/y/custom.jpeg', 'male'),
    ['https://x/y/custom.jpeg'],
  ],
  [
    'версия в хвосте: новая схема, женский',
    () => parseMediaUrls('https://x/y/Bent_Over_Barbell_Row/00f.jpg?v=3', 'female'),
    [
      'https://x/y/Bent_Over_Barbell_Row/00f.jpg?v=3',
      'https://x/y/Bent_Over_Barbell_Row/01f.jpg?v=3',
    ],
  ],
  [
    'версия в хвосте: новая схема, мужской — хвост на обоих кадрах',
    () => parseMediaUrls('https://x/y/Z/00f.jpg?v=7', 'male'),
    ['https://x/y/Z/00m.jpg?v=7', 'https://x/y/Z/01m.jpg?v=7'],
  ],
  [
    'версия в хвосте: легаси',
    () => parseMediaUrls('https://x/y/Pullups/0.jpg?v=2', 'female'),
    ['https://x/y/Pullups/0.jpg?v=2', 'https://x/y/Pullups/1.jpg?v=2'],
  ],
  [
    'версия не ломает проброс произвольного URL',
    () => parseMediaUrls('https://x/y/custom.jpeg?v=1', 'male'),
    ['https://x/y/custom.jpeg?v=1'],
  ],
  ['пусто', () => parseMediaUrls(null), []],
  ['isGenderedMedia 00f', () => isGenderedMedia('https://x/y/Z/00f.jpg'), true],
  ['isGenderedMedia 00f с версией', () => isGenderedMedia('https://x/y/Z/00f.jpg?v=3'), true],
  ['isGenderedMedia легаси 0', () => isGenderedMedia('https://x/y/Z/0.jpg'), false],
  ['isGenderedMedia легаси 0 с версией', () => isGenderedMedia('https://x/y/Z/0.jpg?v=3'), false],
  ['isGenderedMedia пусто', () => isGenderedMedia(null), false],
];

let failed = 0;
for (const [name, run, want] of cases) {
  const got = run();
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) {
    failed += 1;
    console.log(
      'FAIL ' + name + '\n  want ' + JSON.stringify(want) + '\n  got  ' + JSON.stringify(got)
    );
  } else {
    console.log('ok   ' + name);
  }
}
console.log(failed === 0 ? '\nВСЕ ' + cases.length + ' СЛУЧАЯ ЗЕЛЁНЫЕ' : '\nПРОВАЛОВ: ' + failed);
process.exit(failed === 0 ? 0 : 1);
