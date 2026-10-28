// Офлайн-проверка правила «изменено» (позиция 4 очереди, 27.10) на РЕАЛЬНОЙ чистой
// функции src/utils/recommendationOutcome.ts. Запуск из корня:
// npx tsx scripts/check-recommendation-outcome.ts   (tsx — devDependency)
// В проекте нет jest, поэтому это харнес, а не тестовый файл.
// Выход 0 = все проверки зелёные, 1 = есть провал.
import {
  detectManualWeightChange,
  MIN_MEANINGFUL_DELTA_KG,
  type RecommendationSuggestion,
} from '../src/utils/recommendationOutcome';

const results: boolean[] = [];

function check(name: string, passed: boolean, detail = ''): void {
  console.log(`${passed ? 'OK  ' : 'FAIL'} ${name}${passed || !detail ? '' : ` — ${detail}`}`);
  results.push(passed);
}

const suggestion = (patch: Partial<RecommendationSuggestion> = {}): RecommendationSuggestion => ({
  action: 'increase',
  reasonCode: 'ALL_AT_MAX_RPE_OK',
  suggestedWeight: 82.5,
  suggestedReps: 8,
  ...patch,
});

const base = {
  field: 'weight' as const,
  editedSetIndex: 2,
  targetSetIndex: 2,
  committedValue: '85',
  suggestion: suggestion(),
};

// 1. Основной случай: пользователь поставил свой вес на целевом подходе.
const written = detectManualWeightChange(base);
check(
  'расхождение пишется как изменено с обоими весами',
  !!written &&
    written.decision === 'changed' &&
    written.appliedWeight === 85 &&
    written.suggestedWeight === 82.5 &&
    written.engineAction === 'increase' &&
    written.engineReasonCode === 'ALL_AT_MAX_RPE_OK',
  JSON.stringify(written)
);

// 2-3. Ничего не пишем, когда человек принял предложение или попал в округление ввода.
check(
  'вес равен предложенному — записи нет',
  detectManualWeightChange({ ...base, committedValue: '82.5' }) === null
);
check(
  `расход ${MIN_MEANINGFUL_DELTA_KG} кг и меньше — это округление, не несогласие`,
  detectManualWeightChange({ ...base, committedValue: '82.2' }) === null
);

// 4-6. Не тот подход, не то поле или целевого подхода нет вовсе.
check(
  'изменение повторов — не несогласие по весу',
  detectManualWeightChange({ ...base, field: 'reps', committedValue: '10' }) === null
);
check(
  'правки чужого подхода (не целевого) не пишутся',
  detectManualWeightChange({ ...base, editedSetIndex: 0 }) === null
);
check(
  'все подходы закрыты (целевого нет) — записи нет',
  detectManualWeightChange({ ...base, targetSetIndex: null }) === null
);

// 7-8. Рекомендации нет или в ней нет предложенного веса.
check(
  'нет данных для рекомендации — записи нет',
  detectManualWeightChange({ ...base, suggestion: suggestion({ action: 'no_data' }) }) === null
);
check(
  'рекомендация без предложенного веса — записи нет',
  detectManualWeightChange({ ...base, suggestion: suggestion({ suggestedWeight: null }) }) === null
);
check(
  'рекомендации нет совсем — записи нет',
  detectManualWeightChange({ ...base, suggestion: null }) === null
);

// 9-11. Пустой ввод, ноль, мусор — ячейка чистится или печатается по буквам.
check(
  'пустая строка — записи нет',
  detectManualWeightChange({ ...base, committedValue: '' }) === null
);
check('ноль — записи нет', detectManualWeightChange({ ...base, committedValue: '0' }) === null);
check(
  'не-число — записи нет',
  detectManualWeightChange({ ...base, committedValue: 'abc' }) === null
);

// 12. Движок просил снизить, человек добавил — направление видно по engineAction.
const down = detectManualWeightChange({
  ...base,
  suggestion: suggestion({ action: 'decrease', suggestedWeight: 70 }),
  committedValue: '80',
});
check(
  'расхождение в сторону повышения фиксируется с действием движка',
  !!down &&
    down.engineAction === 'decrease' &&
    down.suggestedWeight === 70 &&
    down.appliedWeight === 80,
  JSON.stringify(down)
);

// 13. Предложенных повторов не было — в записи null, а не undefined.
const noReps = detectManualWeightChange({
  ...base,
  suggestion: suggestion({ suggestedReps: null }),
});
check('пустые повторы уходят как null', !!noReps && noReps.suggestedReps === null);

const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} проверок зелёные`);
process.exit(failed ? 1 : 0);
