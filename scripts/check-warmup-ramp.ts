// WARMUP-3d (ENG-12): офлайн-проверка лесенки разминки на реальных модулях.
// Запуск из корня: npx tsx scripts/check-warmup-ramp.ts (jest в проекте нет).
import { planRampUp, rampPctLabel } from '../src/engine/warmupRamp';
import { snapToLoadable } from '../src/engine/loadables';

let fail = 0;
let ran = 0;
function check(name: string, cond: boolean, detail = '') {
  ran++;
  if (!cond) fail++;
  console.log(`${cond ? 'ок  ' : 'ВАЛ '} ${name}${detail ? ' — ' + detail : ''}`);
}

// 1. База: штанга 100 кг, высокая интенсивность → три ступени 50/70/85.
const bar100 = planRampUp({
  topWeightKg: 100,
  intensity: 'high',
  equipment: ['Штанга'],
  barWeightKg: 20,
})!;
check('штанга 100: протокол compound', bar100?.protocol === 'compound');
check(
  'штанга 100: ступени 50/70/85',
  bar100.steps.map((s) => s.weightKg).join(',') === '50,70,85',
  bar100.steps.map((s) => `${rampPctLabel(s.pct)} ${s.weightKg}×${s.reps}`).join(' · ')
);
check('штанга 100: повторы 5/3/1', bar100.steps.map((s) => s.reps).join(',') === '5,3,1');

// 2. Гантели: ступени обязаны быть доступным номиналом и строго расти.
const db22 = planRampUp({ topWeightKg: 22, intensity: 'medium', equipment: ['Гантели'] })!;
check(
  'гантели 22: все ступени — доступный номинал',
  db22.steps.every((s) => snapToLoadable(s.weightKg, ['Гантели'], 0) === s.weightKg),
  db22.steps.map((s) => s.weightKg).join(',')
);
check(
  'гантели 22: строго возрастают и ниже верха',
  db22.steps.every(
    (s, i) => (i === 0 || s.weightKg > db22.steps[i - 1].weightKg) && s.weightKg < 22
  ),
  db22.steps.map((s) => s.weightKg).join(',')
);

// 3. Тренажёр со стеком: шаг 5 кг, низкая интенсивность → blood-flow 40/60.
const stack40 = planRampUp({ topWeightKg: 40, intensity: 'low', equipment: ['Тренажёр'] })!;
check('стек 40: blood_flow', stack40.protocol === 'blood_flow');
check(
  'стек 40: ступени кратны 5 и ниже верха',
  stack40.steps.every((s) => s.weightKg % 5 === 0 && s.weightKg < 40),
  stack40.steps.map((s) => `${s.weightKg}×${s.reps}`).join(' · ')
);

// 4. Пустой гриф: 50% от 20 = 10, но ниже грифа взять нечего → лесенки нет.
check(
  'пустой гриф 20: плана нет',
  planRampUp({ topWeightKg: 20, intensity: 'high', equipment: ['Штанга'], barWeightKg: 20 }) ===
    null
);

// 5. Узкая лесенка: 22,5 на штанге → остаётся одна ступень 20 (дубли отсекаются).
const tight = planRampUp({
  topWeightKg: 22.5,
  intensity: 'high',
  equipment: ['Штанга'],
  barWeightKg: 20,
});
check(
  '22,5 на штанге: одна ступень 20',
  !!tight && tight.steps.length === 1 && tight.steps[0].weightKg === 20,
  tight ? tight.steps.map((s) => s.weightKg).join(',') : 'null'
);

// 6. Не выдумываем: нет верха / неизвестная интенсивность / собственный вес.
check(
  'без верхнего веса: плана нет',
  planRampUp({ topWeightKg: null, intensity: 'high', equipment: ['Штанга'] }) === null
);
check(
  'интенсивность не распознана: плана нет',
  planRampUp({ topWeightKg: 100, intensity: '', equipment: ['Штанга'] }) === null
);
check(
  'собственный вес: плана нет',
  planRampUp({ topWeightKg: 60, intensity: 'medium', equipment: ['Body Only'] }) === null
);
check(
  'нулевой вес: плана нет',
  planRampUp({ topWeightKg: 0, intensity: 'high', equipment: ['Штанга'] }) === null
);

// 7. Инвариант на всех построениях: вес не ниже грифа и не выше верха.
const all = [bar100, db22, stack40, tight].filter(Boolean) as NonNullable<
  ReturnType<typeof planRampUp>
>[];
check(
  'инвариант: ступени в диапазоне (гриф, верх)',
  all.every((p) => p.steps.every((s) => s.weightKg >= 0 && s.weightKg < p.topWeightKg)),
  `планов: ${all.length}`
);

console.log(
  fail === 0 ? `Итог: ${ran} из ${ran} проверок зелёные` : `Итог: провалов ${fail} из ${ran}`
);
process.exit(fail === 0 ? 0 : 1);
