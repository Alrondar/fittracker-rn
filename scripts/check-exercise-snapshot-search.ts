// Офлайн-проверка локальной выборки по снимку справочника:
//   npx tsx scripts/check-exercise-snapshot-search.ts
// Проверяет чистые функции (src/utils/exerciseSearchLocal.ts) — те, что заменяют
// RPC `search_exercises` и `get_exercise_filter_counts`, когда сети нет.
// Файловое хранилище и `networkOrSnapshot` здесь не затрагиваются: они зовут
// expo-file-system, а он живёт только в приложении (проверка на устройстве).
import {
  contraindicationRowsLocal,
  filterOptionsLocal,
  normalizeRu,
  referenceDataLocal,
  searchExercisesLocal,
  warmupPoolLocal,
  type SnapshotExerciseRow,
} from '../src/utils/exerciseSearchLocal';
import type { ExerciseFilters } from '../src/services/exercisesServiceNormalized';

const row = (
  patch: Partial<SnapshotExerciseRow> & { id: string; name: string }
): SnapshotExerciseRow => ({
  technique: 'Техника',
  settings: 'Скамья',
  benefits: 'Польза',
  risks: 'Риск',
  media_url: null,
  category: 'strength',
  can_be_activation: false,
  movement_pattern: 'push',
  difficulty: 'medium',
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

const POOL: SnapshotExerciseRow[] = [
  row({
    id: 'a1',
    name: 'Жим штанги лежа на горизонтальной скамье',
    primary_muscles: ['грудь'],
    equipment: ['Штанга', 'Скамья'],
    relationships: [
      { related_exercise_id: 'a2', relation_type: 'alternative', status: 'approved' },
      { related_exercise_id: 'a1', relation_type: 'variation', status: 'approved' },
      { related_exercise_id: 'a9', relation_type: 'regression', status: 'rejected' },
    ],
    warnings: [
      {
        body_part: 'плечо',
        injury_type: 'импинджмент',
        level: 'avoid',
        recommendation: 'Не опускать ниже параллели',
      },
      { body_part: 'локоть', injury_type: null, level: 'caution', recommendation: null },
    ],
  }),
  row({
    id: 'a2',
    name: 'Французский жим EZ-штанги лежа',
    primary_muscles: ['трицепс'],
    equipment: ['EZ-штанга'],
    aliases: ['французский жим', 'lying ezh'],
  }),
  row({
    id: 'a3',
    name: 'Отжимания',
    primary_muscles: ['грудь'],
    can_be_activation: true,
    category: 'stretching',
    equipment: ['Масса тела'],
  }),
  row({
    id: 'a4',
    name: 'Тяга штанги в наклоне',
    primary_muscles: ['широчайшие'],
    equipment: ['Штанга'],
    short_name: 'Тяга в наклоне',
  }),
];

const listIds = (filters: Partial<ExerciseFilters>): string[] =>
  searchExercisesLocal(POOL, { sortBy: 'name-asc', limit: 40, offset: 0, ...filters }).map(
    (item) => item.id
  );

const cases: [string, () => unknown, unknown][] = [
  [
    'пустой запрос = ярус 0 и алфавит (совпадает с серверным порядком)',
    () => listIds({}),
    ['a1', 'a3', 'a4', 'a2'],
  ],
  [
    '«жим лежа»: имя покрывает все слова важнее, чем то же слово в алиасе',
    () => listIds({ search: 'жим лежа' }),
    ['a1', 'a2'],
  ],
  [
    'запрос по алиасу попадает в выдачу (ярус ниже имени)',
    () => listIds({ search: 'французский' }),
    ['a2'],
  ],
  ['регистр запроса не важен', () => listIds({ search: 'ТЯГА В НАКЛОНЕ' }), ['a4']],
  [
    'нормализация ё → е (та же, что в RPC)',
    () => normalizeRu('  ТяжёлЫЙ Жим Лёжа '),
    'тяжелый жим лежа',
  ],
  [
    'поиск по мышце: обе позиции ярусом ниже имени, порядок по алфавиту',
    () => listIds({ search: 'грудь' }),
    ['a1', 'a3'],
  ],
  ['фильтр по мышце (пересечение primary)', () => listIds({ muscles: ['трицепс'] }), ['a2']],
  [
    'снаряжение в другом регистре совпадает',
    () => listIds({ equipment: ['штанга'] }),
    ['a1', 'a4'],
  ],
  ['категория', () => listIds({ categories: ['stretching'] }), ['a3']],
  ['только разминочные', () => listIds({ activationOnly: true }), ['a3']],
  ['пагинация: вторая страница по 2', () => listIds({ limit: 2, offset: 2 }), ['a4', 'a2']],
  [
    'опечатку ловит только trgm-похожесть на сервере — офлайн честное пусто',
    () => listIds({ search: 'жим штенгей' }),
    [],
  ],
  ['name-desc', () => listIds({ sortBy: 'name-desc' }), ['a2', 'a4', 'a3', 'a1']],
];

const refs = referenceDataLocal(POOL);
const detail = searchExercisesLocal(POOL, { sortBy: 'name-asc', limit: 1, offset: 0 });

const aggregateCases: [string, () => unknown, unknown][] = [
  ['Замены: только approved/suggested и без ссылки на себя', () => refs.a1.alternativeIds, ['a2']],
  [
    'травма: текст рекомендации, иначе «часть — тип»',
    () => refs.a1.injuries,
    ['Не опускать ниже параллели', 'локоть'],
  ],
  [
    'противопоказания: только уровень avoid',
    () => contraindicationRowsLocal(POOL).map((item) => `${item.exercise_id}:${item.level}`),
    ['a1:avoid'],
  ],
  [
    'пул разминки = растяжка или разминочный флаг, порядок по имени',
    () => warmupPoolLocal(POOL).map((item) => item.id),
    ['a3'],
  ],
  [
    'счётчик категорий по убыванию числа',
    () => filterOptionsLocal(POOL).categories.map((item) => `${item.value}=${item.count}`),
    ['strength=3', 'stretching=1'],
  ],
  [
    'снаряжение: лидер по числу — штанга (2 упр.)',
    () => {
      const top = filterOptionsLocal(POOL).equipment[0];
      return `${top.value}=${top.count}`;
    },
    'Штанга=2',
  ],
  ['список офлайн отдаёт нулевую популярность (см. шапку модуля)', () => detail[0]?.popularity, 0],
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
run(aggregateCases);
console.log(
  failed === 0
    ? `\nВСЕ ${cases.length + aggregateCases.length} СЛУЧАЯ ЗЕЛЁНЫЕ`
    : `\nПРОВАЛОВ: ${failed}`
);
process.exit(failed === 0 ? 0 : 1);
