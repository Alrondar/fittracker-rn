// scripts/check-loadables.ts
// PLATE-SNAP + RPE 10: офлайн-проверка на реальных модулях (jest в проекте нет,
// паттерн — как в scripts/check-workout-resume.ts).
// Запуск: npx tsx scripts/check-loadables.ts

import { snapToLoadable, stepLoadable, ladderForEquipment } from '../src/engine/loadables';
import { calculateProgression, explainProgression } from '../src/engine/progression';
import type { SetData } from '../src/types/workout';

let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail = '') {
  if (ok) {
    passed++;
    console.log(`ок       ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    failed++;
    console.log(`ПРОВАЛ   ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

// ===== 1. лестницы по снарядам =====
check(
  'гантели: 12,72 → 12',
  near(snapToLoadable(12.72, ['Гантели'])!, 12),
  String(snapToLoadable(12.72, ['Гантели']))
);
check('гантели: 11,25 → 12', near(snapToLoadable(11.25, ['Гантели'])!, 12));
check('гантели: 9,6 → 10', near(snapToLoadable(9.6, ['Гантели'])!, 10));
check('гантели: 1,4 → 1', near(snapToLoadable(1.4, ['Гантели'])!, 1));
check('гантели: 52 → 52,5', near(snapToLoadable(52, ['Гантели'])!, 52.5));
check('штанга 22,2 (гриф 20) → 22,5', near(snapToLoadable(22.2, ['Штанга'], 20)!, 22.5));
check('штанга 21,1 (гриф 20) → 20', near(snapToLoadable(21, ['Штанга'], 20)!, 20));
check('гири: 13 → 12', near(snapToLoadable(13, ['Гири'])!, 12));
check('кроссовер: 33 → 35', near(snapToLoadable(33, ['Кроссовер'])!, 35));
check('пол (без снаряда): 12,72 → 12,5', near(snapToLoadable(12.72, ['Пол'])!, 12.5));
check('скачивание null → null', snapToLoadable(null, ['Гантели']) === null);

// ===== 2. инвариант: после округления вес всегда из лестницы =====
const dumbbellLoadable = (kg: number) =>
  (kg >= 1 && kg <= 10 && Math.abs(kg - Math.round(kg)) < 1e-9) ||
  (kg > 10 && kg <= 50 && kg % 2 === 0) ||
  (kg > 50 && Math.abs(kg * 2 - Math.round(kg * 2)) < 1e-9 && kg % 2.5 === 0);

let dumbbellBroken: number[] = [];
for (let x = 0.5; x <= 60; x += 0.25) {
  const s = snapToLoadable(x, ['Гантели']);
  if (s == null || !dumbbellLoadable(s)) dumbbellBroken.push(x);
}
check(
  'гантели: весь диапазон 0,5–60 кг приходит в доступный номинал',
  dumbbellBroken.length === 0,
  dumbbellBroken.length ? `исключения: ${dumbbellBroken.slice(0, 6).join(', ')}` : ''
);

let barbellBroken: number[] = [];
for (let x = 20; x <= 220; x += 0.1) {
  const s = snapToLoadable(x, ['Штанга'], 20)!;
  // после грифа вес кратен 2,5 (пара меньших блинов 1,25)
  if (Math.abs((s - 20) / 2.5 - Math.round((s - 20) / 2.5)) > 1e-6) barbellBroken.push(x);
}
check(
  'штанга: весь диапазон 20–220 кг кратен паре блинов 1,25',
  barbellBroken.length === 0,
  barbellBroken.length ? `исключения: ${barbellBroken.slice(0, 4).join(', ')}` : ''
);

check('лестница: Гантели → dumbbell', ladderForEquipment(['Гантели']) === 'dumbbell');
check('лестница: Тренажер Смита → barbell', ladderForEquipment(['Тренажер Смита']) === 'barbell');
check('лестница: Нижний Блок → stack', ladderForEquipment(['Нижний Блок']) === 'stack');
check('лестница: Турник → fallback', ladderForEquipment(['Турник']) === 'fallback');

// ===== 3. шаг в сторону не даёт «того же веса» =====
check('шаг вниз от 12 (гантели) = 10', near(stepLoadable(12, 'down', ['Гантели']), 10));
check('шаг вверх от 12 (гантели) = 14', near(stepLoadable(12, 'up', ['Гантели']), 14));
check('шаг вниз от 10 (гантели) = 9', near(stepLoadable(10, 'down', ['Гантели']), 9));

// ===== 4. движок: округлениеApplied + направление =====
type Case = {
  name: string;
  sets: SetData[];
  repsRange: string;
  equipment: string[];
  expectAction: string;
  expectCode?: string;
  expectReps?: number;
};

const run = (c: Case) => {
  const res = calculateProgression({
    sets: c.sets,
    repsRange: c.repsRange,
    currentPhaseType: 'hypertrophy',
    equipment: c.equipment,
    barWeightKg: 20,
  });
  const base = res.reason.factors.lastWeight ?? 0;
  const w = res.suggestedWeight;
  check(
    `${c.name}: действие ${res.action} · код ${res.reason.code}`,
    res.action === c.expectAction && (!c.expectCode || res.reason.code === c.expectCode),
    `база ${base} → ${w}`
  );
  if (w != null) {
    const snapped = snapToLoadable(w, c.equipment, 20)!;
    check(
      `${c.name}: ${w} — вес из лестницы`,
      near(snapped, w),
      near(snapped, w) ? '' : `округлённый ${snapped}`
    );
    if (res.action === 'increase') {
      check(`${c.name}: повышение выше базы`, w > base, `${base} → ${w}`);
    }
    if (res.action === 'decrease') {
      check(`${c.name}: снижение ниже базы`, w < base, `${base} → ${w}`);
    }
    if (c.expectReps != null) {
      check(
        `${c.name}: повтор ${res.suggestedReps}`,
        res.suggestedReps === c.expectReps,
        String(res.suggestedReps)
      );
    }
  }
  return res;
};

// RPE 10 в одном подходе — вес держим (вердикт владельца 18.10): доводить
// последний подход до отказа в гипертрофии — норма, терять из-за этого вес
// нельзя. Порог срабатывает только на подтверждённом отказе.
run({
  name: 'Одиночный отказ на штанге 60 кг',
  sets: [{ weight: '60', reps: '10', rpe: 10, previousWeight: 60, previousReps: 10 }],
  repsRange: '8-10',
  equipment: ['Штанга'],
  expectAction: 'hold',
  expectCode: 'MAX_EFFORT_SINGLE',
  expectReps: 8,
});

// Подтверждение №1 — 10 в двух рабочих подходах этой тренировки.
run({
  name: 'Отказ в двух подходах, штанга 60 кг',
  sets: [
    { weight: '60', reps: '10', rpe: 10, previousWeight: 60, previousReps: 10 },
    { weight: '60', reps: '9', rpe: 10, previousWeight: 60, previousReps: 10 },
  ],
  repsRange: '8-10',
  equipment: ['Штанга'],
  expectAction: 'decrease',
  expectCode: 'MAX_EFFORT',
});

// Подтверждение №2 — прошлый тренировочный раз тоже был с отказом.
run({
  name: 'Отказ второй тренировке подряд',
  sets: [
    { weight: '12', reps: '10', rpe: 10, previousWeight: 12, previousReps: 10, previousRpe: 10 },
  ],
  repsRange: '8-10',
  equipment: ['Гантели'],
  expectAction: 'decrease',
  expectCode: 'MAX_EFFORT',
});
run({
  name: 'Прошлый раз не отказ (previousRpe 9) — держим',
  sets: [
    { weight: '12', reps: '10', rpe: 10, previousWeight: 12, previousReps: 10, previousRpe: 9 },
  ],
  repsRange: '8-10',
  equipment: ['Гантели'],
  expectAction: 'hold',
  expectCode: 'MAX_EFFORT_SINGLE',
});

// Исключение из правила: отказ + повторы ниже минимума диапазона = подход
// сорван, тут снижение и с одного раза.
run({
  name: 'Отказ и повторы ниже таргета',
  sets: [{ weight: '20', reps: '5', rpe: 10, previousWeight: 20, previousReps: 10 }],
  repsRange: '8-10',
  equipment: ['Гантели'],
  expectAction: 'decrease',
  expectCode: 'MAX_EFFORT',
});

// Подтверждённый отказ на пустом грифе: снижать нечем → честный hold с новым
// кодом, а не «снижаем» с тем же числом на экране.
run({
  name: 'Подтверждённый отказ на пустом грифе (20 кг)',
  sets: [
    { weight: '20', reps: '10', rpe: 10, previousWeight: 20, previousReps: 10 },
    { weight: '20', reps: '10', rpe: 10, previousWeight: 20, previousReps: 10 },
  ],
  repsRange: '8-10',
  equipment: ['Штанга'],
  expectAction: 'hold',
  expectCode: 'EQUIPMENT_FLOOR',
});

// Снижение всегда приходит в номинал снаряда: 60 → 57,5; 12 → 10.
run({
  name: 'Отказ в двух подходах на гантелях 12 кг',
  sets: [
    { weight: '12', reps: '10', rpe: 10, previousWeight: 12, previousReps: 10 },
    { weight: '12', reps: '10', rpe: 10, previousWeight: 12, previousReps: 10 },
  ],
  repsRange: '8-10',
  equipment: ['Гантели'],
  expectAction: 'decrease',
  expectCode: 'MAX_EFFORT',
});

// RPE 9 — как и раньше, hold.
run({
  name: 'RPE 9 остаётся hold',
  sets: [{ weight: '20', reps: '10', rpe: 9, previousWeight: 20, previousReps: 10 }],
  repsRange: '8-10',
  equipment: ['Штанга'],
  expectAction: 'hold',
  expectCode: 'HIGH_RPE_HOLD',
});

// Повышение на гантелях: +1,25 из гипертрофии обязано стать 14, а не 13,25.
const up = run({
  name: 'Повышение на гантелях',
  sets: [{ weight: '12', reps: '12', rpe: 6, previousWeight: 12, previousReps: 12 }],
  repsRange: '8-12',
  equipment: ['Гантели'],
  expectAction: 'increase',
});
check(
  'Повышение на гантелях: 13,25 заменено на 14 и записано в loadableFrom',
  near(up.suggestedWeight ?? 0, 14) && near(up.loadableFrom ?? 0, 13.25),
  `${up.suggestedWeight} (сырое ${up.loadableFrom})`
);

// ===== 5. подписи, которые видит пользователь =====
const engine = (sets: SetData[], equipment: string[]) =>
  calculateProgression({
    sets,
    repsRange: '8-10',
    currentPhaseType: 'hypertrophy',
    equipment,
    barWeightKg: 20,
  });

const single60 = engine(
  [{ weight: '60', reps: '10', rpe: 10, previousWeight: 60, previousReps: 10 }],
  ['Штанга']
);
const single12 = engine(
  [{ weight: '12', reps: '10', rpe: 10, previousWeight: 12, previousReps: 10 }],
  ['Гантели']
);

check(
  'подпись одиночного отказа: дробное число через запятую',
  single12.reason.ruText.includes('1,25 кг') && !/\d\.\d/.test(single12.reason.ruText),
  single12.reason.ruText
);
const rpeLine = explainProgression(single60, 'kg').find((i) => i.label === 'RPE')?.value ?? '';
check(
  'сигнал RPE в «Почему?» не печатает null (прошлый раз без RPE)',
  rpeLine.startsWith('10 —') && !rpeLine.includes('null'),
  rpeLine
);
check(
  'вывод для одиночного отказа: вес не меняется, повтор — нижняя граница',
  single60.suggestedWeight === 60 && single60.suggestedReps === 8,
  `${single60.suggestedWeight} × ${single60.suggestedReps}`
);

console.log(`\nИтог: ${passed} из ${passed + failed} проверок зелёные`);
process.exit(failed === 0 ? 0 : 1);
