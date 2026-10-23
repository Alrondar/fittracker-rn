// ТРЕН-22.10: офлайн-проверка якоря рекомендации — история слота против весов
// текущей тренировки. Запуск из корня: npx tsx scripts/check-progression-anchor.ts
import { calculateProgression } from '../src/engine/progression/core';
import type { SetData } from '../src/types/workout';

let fail = 0;
let ran = 0;
function check(name: string, cond: boolean, detail = '') {
  ran++;
  if (!cond) fail++;
  console.log(`${cond ? 'ок  ' : 'ВАЛ '} ${name}${detail ? ' — ' + detail : ''}`);
}

function slot(
  weight: string,
  reps: string,
  prev: number | null = null,
  prevReps: number | null = null,
  isWarmup = false
): SetData {
  return {
    weight,
    reps,
    reps_left: '',
    reps_right: '',
    isWarmup,
    previousWeight: prev,
    previousReps: prevReps,
  };
}

// 1. Пирамида вверх (твой кадр 22.10): слоты 1-3 сделаны 40/45/50, у 4-го
// исторический вес 35. До правки рекомендация = 35 кг, то есть назад.
const pyramid = calculateProgression({
  sets: [
    slot('40', '10', 40, 10),
    slot('45', '10', 45, 10),
    slot('50', '10', 50, 10),
    slot('', '', 35, 12),
  ],
  repsRange: '8-10',
  targetSetIndex: 3,
});
check(
  'пирамида: рекомендация не ниже уже поднятого',
  (pyramid.suggestedWeight ?? 0) >= 50,
  `${pyramid.suggestedWeight} кг, ${pyramid.reason.code}`
);
check('пирамида: якорь помечен как сессия', pyramid.reason.factors.anchor === 'session');
check(
  'пирамида: объяснение называет источник планки',
  pyramid.reason.ruText.includes('уже сделал в этой тренировке'),
  pyramid.reason.ruText
);

// 2. Двойная прогрессия посреди тренировки: вес держим, повторы растим.
const dbl = calculateProgression({
  sets: [slot('50', '10', 35, 10), slot('50', '11', 35, 10), slot('', '', 35, 10)],
  repsRange: '8-12',
  targetSetIndex: 2,
  policy: 'double_progression',
});
check(
  'double: держит сегодняшний вес, а не исторический',
  dbl.suggestedWeight === 50 && dbl.action === 'hold',
  `${dbl.action} ${dbl.suggestedWeight} кг, ${dbl.reason.code}`
);

// 3. Сегодня заметно легче прошлого — якорь обязан остаться историей,
// иначе «SESSION_FATIGUE» перестанет снижать.
const light = calculateProgression({
  sets: [slot('50', '10', 60, 10), slot('50', '10', 60, 10), slot('', '', 60, 10)],
  repsRange: '8-10',
  targetSetIndex: 2,
});
check(
  'усталость: снижение и якорь из истории',
  light.action === 'decrease' &&
    light.reason.factors.anchor === 'history' &&
    (light.suggestedWeight ?? 999) < 60,
  `${light.action} ${light.suggestedWeight} кг, ${light.reason.code}`
);

// 4. Ровный день, сегодня = прошлый раз: повторы на верхней границе без RPE →
// штатное повышение на шаг, якорь при этом остаётся историей.
const flat = calculateProgression({
  sets: [slot('60', '10', 60, 10), slot('60', '10', 60, 10), slot('', '', 60, 10)],
  repsRange: '8-10',
  targetSetIndex: 2,
});
check(
  'ровный день: якорь остался историей, шаг прежний',
  flat.reason.factors.anchor === 'history' &&
    flat.action === 'increase' &&
    flat.suggestedWeight === 62.5,
  `${flat.action} ${flat.suggestedWeight} кг, ${flat.reason.code}`
);

// 5. Разминочный подход тяжелее рабочих — планку задавать не должен.
const withWarmup = calculateProgression({
  sets: [
    slot('70', '5', null, null, true),
    slot('50', '10', 50, 10),
    slot('50', '10', 50, 10),
    slot('', '', 50, 10),
  ],
  repsRange: '8-10',
  targetSetIndex: 3,
});
check(
  'разминка не поднимает планку',
  withWarmup.reason.factors.lastWeight === 50 && withWarmup.reason.factors.anchor === 'history',
  `${withWarmup.reason.factors.lastWeight} кг, якорь ${withWarmup.reason.factors.anchor}`
);

// 6. Нет истории вовсе — NO_HISTORY, якорь не проставляется.
const fresh = calculateProgression({
  sets: [slot('50', '10'), slot('', '')],
  repsRange: '8-10',
  targetSetIndex: 1,
});
check(
  'первый раз: no_data без выдуманной планки',
  fresh.action === 'no_data' && fresh.suggestedWeight === null,
  `${fresh.action} ${fresh.reason.code}`
);

console.log(`\nпроверок: ${ran}, провалов: ${fail}`);
process.exit(fail > 0 ? 1 : 0);
