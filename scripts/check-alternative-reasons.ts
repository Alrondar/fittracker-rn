// Позиция 9-2: офлайн-проверка строки «почему эта замена» — коды движка
// переводятся в короткие русские причины, не больше трёх, по убыванию вклада.
// Запуск из корня: npx tsx scripts/check-alternative-reasons.ts
import { rankAlternatives } from '../src/engine/alternatives';
import type { AlternativeCandidate, AlternativeSourceContext } from '../src/engine/alternatives';
import { alternativeReasonLines } from '../src/utils/alternativeReasons';

let fail = 0;
let ran = 0;
function check(name: string, cond: boolean, detail = '') {
  ran++;
  if (!cond) fail++;
  console.log(`${cond ? 'ок      ' : 'ВАЛЕН   '}${name}${detail ? ' — ' + detail : ''}`);
}

// Список зеркалит вызовы add() в src/engine/alternatives.ts: если движок
// начнёт выдавать новый код, проверка «все коды переведены» покраснеет.
const ENGINE_CODES = [
  'PRIMARY_MATCH',
  'SECONDARY_MATCH',
  'PATTERN_MATCH',
  'EQUIPMENT_MATCH',
  'EQUIPMENT_MISMATCH',
  'LEVEL_JUMP',
  'LEVEL_DROP',
  'PAIN_ON_SOURCE_GROUP',
  'INJURY_MEDIUM',
  'INJURY_LOW',
  'REGRESSION_FOR_RECOVERY',
  'REGRESSION_NO_RECOVERY',
  'PROGRESSION_WITH_PAIN',
];

check('пустой список факторов даёт пустую строку', alternativeReasonLines([]).length === 0);

const single = alternativeReasonLines([{ code: 'PRIMARY_MATCH', delta: 2 }]);
check('один фактор → одна причина', single.length === 1, JSON.stringify(single));

const many = alternativeReasonLines([
  { code: 'PRIMARY_MATCH', delta: 4 },
  { code: 'PATTERN_MATCH', delta: 3 },
  { code: 'EQUIPMENT_MISMATCH', delta: -1 },
  { code: 'SECONDARY_MATCH', delta: 1 },
]);
check('не больше трёх причин', many.length === 3, JSON.stringify(many));
check(
  'порядок — по убыванию вклада',
  many[0] === 'та же главная мышца' && many[1] === 'то же движение',
  JSON.stringify(many)
);
check('отрицательный вклад тоже объясняется', many[2] === 'другой снаряд', JSON.stringify(many));

const tie = alternativeReasonLines([
  { code: 'SECONDARY_MATCH', delta: 2 },
  { code: 'PRIMARY_MATCH', delta: 2 },
]);
check(
  'при равном вкладе порядок детерминированный',
  tie[0] === 'та же главная мышца' && tie[1] === 'те же мышцы-помощники',
  JSON.stringify(tie)
);

const unknown = alternativeReasonLines([
  { code: 'SOMETHING_NEW', delta: 5 },
  { code: 'PATTERN_MATCH', delta: 1 },
]);
check(
  'неизвестный код не роняет и не даёт пустой строки',
  unknown.length === 1 && unknown[0] === 'то же движение',
  JSON.stringify(unknown)
);

const covered = ENGINE_CODES.filter(
  (code) => alternativeReasonLines([{ code, delta: 1 }]).length === 0
);
check(
  'все коды движка переведены',
  covered.length === 0,
  covered.join(', ') || `${ENGINE_CODES.length} кодов`
);

const input = [{ code: 'INJURY_MEDIUM', delta: -5 }];
alternativeReasonLines(input);
check(
  'входной массив факторов не мутируется',
  input[0].code === 'INJURY_MEDIUM' && input.length === 1
);

// === Сквозные проверки: что видит пользователь на реальных данных движка ===
const source: AlternativeSourceContext = {
  primaryMuscles: ['грудь'],
  secondaryMuscles: ['трицепс'],
  equipment: ['штанга'],
  hasPain: true,
  movementPattern: 'жим',
  difficulty: 'intermediate',
};

const candidates: AlternativeCandidate[] = [
  {
    id: 'regression-one',
    primary_muscles: ['грудь'],
    secondary_muscles: ['трицепс'],
    equipment: ['гантели'],
    movement_pattern: 'жим',
    difficulty: 'beginner',
    relationType: 'regression',
  },
];

const ranked = rankAlternatives(candidates, source, [], {});
const reasons = alternativeReasonLines(ranked.ordered[0].factors);
check(
  'сквозной прогон: упрощение через боль объяснено',
  reasons.includes('упрощение — подходит через боль'),
  reasons.join(' · ')
);
check(
  'сквозной прогон: группа, где было больно, названа',
  reasons.includes('та же группа мышц, где была боль'),
  reasons.join(' · ')
);
check('сквозной прогон: причин не больше трёх', reasons.length <= 3, `${reasons.length}`);

// Другой снаряд попадает в строку только когда его вклад среди заметных: здесь
// больше похвастаться нечем — совпала лишь главная мышца.
const equipmentOnly = rankAlternatives(
  [
    {
      id: 'other-equipment',
      primary_muscles: ['грудь'],
      secondary_muscles: [],
      equipment: ['гантели'],
      movement_pattern: null,
      difficulty: 'intermediate',
      relationType: 'alternative',
    },
  ],
  { ...source, hasPain: false },
  [],
  {}
);
check(
  'сквозной прогон: другой снаряд назван, когда вклад заметен',
  alternativeReasonLines(equipmentOnly.ordered[0].factors).includes('другой снаряд'),
  alternativeReasonLines(equipmentOnly.ordered[0].factors).join(' · ')
);

const advanced = rankAlternatives(
  [
    {
      id: 'harder',
      primary_muscles: ['грудь'],
      secondary_muscles: [],
      equipment: ['штанга'],
      movement_pattern: 'жим',
      difficulty: 'advanced',
      relationType: 'variation',
    },
  ],
  { ...source, difficulty: 'beginner', hasPain: false },
  [],
  {}
);
check(
  'сквозной прогон: прыжок уровня назван',
  alternativeReasonLines(advanced.ordered[0].factors).includes('заметно сложнее по уровню'),
  alternativeReasonLines(advanced.ordered[0].factors).join(' · ')
);

console.log(`\nпроверок: ${ran}, провалов: ${fail}`);
process.exit(fail === 0 ? 0 : 1);
