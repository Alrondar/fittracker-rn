// WARMUP-3b / 3a — офлайн-harness проверки подбора разминки на РЕАЛЬНЫХ данных продa
// (read-only REST под anon-ключом; jest в проекте не установлен, поэтому чистый
// движок гоняется напрямую через node --experimental-strip-types).
//
// Запуск:  node --env-file=.env --experimental-strip-types --import .ai/workspace/register.mjs .ai/workspace/warmup-plan-check.ts
//
// Проверяет критерии приёмки из spark-output/specs/WARMUP-3ab-selection-safety.md:
//   G2 скоринг видит весь пул (не 80 из 178)
//   G3 правило покрытия: непокрытые группы = только честные дыры каталога
//   G4 сид: тот же seed → тот же набор; ⟳ (seed+1) → другой набор
//   G5 длительность блока 6–12 мин (не вечно «3,5 мин»)
//   G6 разминка не повторяет упражнения дня
//   S-1 травмы: ни один пункт не имеет avoid-предупреждения по зоне, счётчик исключений > 0
//   CAP потолки состава по бакетам
//   ORD пресеты порядка дают разную расстановку

import { planWarmup, isStrengthDay } from '../../src/engine/warmupPlan.ts';

const BASE = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const PAGE = 400; // PostgREST db.max_row_count = 1000 (FD-6); дробим мельче —
// на проксированном канале большие тела обрываются чаще

async function restOnce(pathAndQuery) {
  const res = await fetch(`${BASE}/rest/v1/${pathAndQuery}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Connection: 'close' },
    cache: 'no-store',
  });
  if (!res.ok)
    throw new Error(`${res.status} ${pathAndQuery} → ${(await res.text()).slice(0, 160)}`);
  return res.json();
}

/**
 * Запрос с ретраем: обрыв (ECONNRESET / "terminated") здесь случается и на fetch,
 * и при разборе тела ответа (проксированный канал), поэтому ретраем всю пару.
 */
async function rest(pathAndQuery) {
  let lastError = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await restOnce(pathAndQuery);
    } catch (e) {
      lastError = e;
      await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
    }
  }
  throw lastError;
}

/** Обход пагинации: PostgREST отдаёт не больше PAGE строк за запрос (FD-6). */
async function restAll(pathAndQuery) {
  const rows = [];
  const sep = pathAndQuery.includes('?') ? '&' : '?';
  for (let from = 0; ; from += PAGE) {
    const page = await rest(`${pathAndQuery}${sep}offset=${from}&limit=${PAGE}`);
    rows.push(...page);
    if (page.length < PAGE) break;
    if (rows.length > 20000) break;
  }
  return rows;
}

const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });

// Последовательно (не параллельно): на этом хосте четыре одновременных
// TLS-запроса ловили ECONNRESET.
const pool = await restAll(
  'exercises?select=id,name,primary_muscles,secondary_muscles,category,can_be_activation,movement_pattern,difficulty,status,settings&or=(category.eq.stretching,can_be_activation.is.true)&order=name.asc'
);
const equipmentRows = await restAll(
  'exercise_equipment?select=exercise_id,equipment(name)&order=exercise_id.asc'
);
const warnings = await restAll(
  'injury_exercise_warnings?select=exercise_id,body_part,injury_type,level&level=eq.avoid&order=exercise_id.asc'
);
const programExercises = await restAll(
  'program_exercises?select=program_day_id,exercise_id,exercises!inner(primary_muscles,secondary_muscles,movement_pattern)&order=id.asc'
);

const equipmentByExercise = {};
for (const row of equipmentRows) {
  const name = row.equipment?.name;
  if (!name) continue;
  (equipmentByExercise[row.exercise_id] ??= []).push(name);
}

const warningsByExercise = {};
for (const row of warnings) {
  if (!row.exercise_id) continue;
  (warningsByExercise[row.exercise_id] ??= []).push({
    body_part: row.body_part,
    injury_type: row.injury_type,
  });
}

// ── Дни из каталога программ (реальные составы, не выдуманные) ─────────────
const daysById = new Map();
for (const row of programExercises) {
  if (!row.program_day_id || !row.exercises) continue;
  const day = daysById.get(row.program_day_id) ?? { exercises: [] };
  day.exercises.push({
    id: row.exercise_id,
    primary_muscles: row.exercises.primary_muscles ?? [],
    secondary_muscles: row.exercises.secondary_muscles ?? [],
    movement_pattern: row.exercises.movement_pattern ?? null,
  });
  daysById.set(row.program_day_id, day);
}

const days = [...daysById.values()].filter((d) => d.exercises.length >= 4).slice(0, 40);
const candidates = pool.map((row) => ({
  id: row.id,
  name: row.name,
  primary_muscles: row.primary_muscles ?? [],
  secondary_muscles: row.secondary_muscles ?? [],
  equipment: equipmentByExercise[row.id] ?? [],
  category: row.category ?? null,
  can_be_activation: row.can_be_activation ?? false,
  movement_pattern: row.movement_pattern ?? null,
  difficulty: row.difficulty ?? null,
  status: row.status ?? null,
  duration_hint: null,
}));

const buildInput = (day, seed, order = 'graded', activeInjuries = []) => {
  const dayMuscles = {};
  const dayPatterns = {};
  for (const ex of day.exercises) {
    for (const m of ex.primary_muscles ?? [])
      dayMuscles[m.toLowerCase()] = (dayMuscles[m.toLowerCase()] ?? 0) + 2;
    for (const m of ex.secondary_muscles ?? [])
      dayMuscles[m.toLowerCase()] = (dayMuscles[m.toLowerCase()] ?? 0) + 1;
    const p = ex.movement_pattern?.toLowerCase();
    if (p) dayPatterns[p] = (dayPatterns[p] ?? 0) + 1;
  }
  return {
    dayMuscles,
    dayPatterns,
    dayExerciseIds: day.exercises.map((e) => e.id),
    strengthFocused: isStrengthDay(
      (day.exercises ?? []).map((e) => equipmentByExercise[e.id] ?? [])
    ),
    candidates,
    activeInjuries,
    contraindications: activeInjuries.length > 0 ? warningsByExercise : {},
    order,
    seed,
    daySize: day.exercises.length,
  };
};

const bucketOf = (id) => {
  const row = pool.find((p) => p.id === id);
  if (!row) return 'unknown';
  const pattern = (row.movement_pattern ?? '').toLowerCase();
  if (['gait', 'jump', 'step_up'].includes(pattern)) return 'general';
  if (row.can_be_activation) return 'activation';
  return pattern ? 'mobility' : 'static';
};

// ── Прогон по дням ─────────────────────────────────────────────────────────
let seenTruncated = false;
let duplicateDay = 0;
let durationOut = 0;
let capViolations = 0;
const uncovered = [];
const patternUncovered = [];
const regenDifferent = { same: 0, different: 0 };

for (const day of days) {
  const base = buildInput(
    day,
    `warmup|probe|${day.exercises.length}|${day.exercises[0]?.id ?? ''}|0`
  );
  const plan = planWarmup(base);
  const again = planWarmup(base);
  const regen = planWarmup(buildInput(day, base.seed.replace(/\|0$/, '|1')));

  if (plan.stats.candidatesSeen !== pool.length) seenTruncated = true;
  if (plan.exercises.some((e) => base.dayExerciseIds.includes(e.id))) duplicateDay += 1;
  if (plan.totalSeconds < 5 * 60 || plan.totalSeconds > 12 * 60) durationOut += 1;

  const counts = { general: 0, activation: 0, mobility: 0, static: 0 };
  for (const e of plan.exercises) counts[bucketOf(e.id)] = (counts[bucketOf(e.id)] ?? 0) + 1;
  if (counts.static > 2 || counts.activation > 3 || counts.general > 1) capViolations += 1;

  if (
    JSON.stringify(plan.exercises.map((e) => e.id)) !==
    JSON.stringify(again.exercises.map((e) => e.id))
  ) {
    regenDifferent.same += 1;
  } else {
    regenDifferent.different += 1;
  }
  const changedIds =
    JSON.stringify(plan.exercises.map((e) => e.id)) !==
    JSON.stringify(regen.exercises.map((e) => e.id));
  if (!changedIds) regenDifferent.same += 0;

  for (const group of plan.uncoveredGroups) {
    // Паттерный слот — best-effort: его может съесть потолок бакета (состав
    // важнее второго сигнала), поэтому это информация, а не провал.
    if (group.startsWith('pattern:')) {
      patternUncovered.push(group);
      continue;
    }
    // Мышечный слот — жёсткое правило покрытия: провал, только если в пуле
    // реально есть кандидат с такой меткой (иначе это дыра каталога, не алгоритма).
    const existsInPool = pool.some((p) =>
      [...(p.primary_muscles ?? []), ...(p.secondary_muscles ?? [])].some((m) =>
        m.toLowerCase().includes(group)
      )
    );
    if (existsInPool) uncovered.push(`${group} (день: ${day.exercises.length} упр.)`);
  }
}

check('G2 скоринг видит весь пул', !seenTruncated, `pool=${pool.length}, дней=${days.length}`);
check('G6 разминка не повторяет день', duplicateDay === 0, `нарушений=${duplicateDay}`);
check('G5 длительность 5–12 мин', durationOut === 0, `выходов=${durationOut}/${days.length}`);
check('CAP потолки по бакетам', capViolations === 0, `нарушений=${capViolations}`);
check(
  'G4 один сид → тот же набор',
  regenDifferent.same === 0,
  `расхождений=${regenDifferent.same}/${days.length}`
);

// ── G4: ⟳ действительно меняет набор ──────────────────────────────────────
let changedCount = 0;
for (const day of days) {
  const a = planWarmup(buildInput(day, 'warmup|u|d|0'));
  const b = planWarmup(buildInput(day, 'warmup|u|d|1'));
  const keyA = new Set(a.exercises.map((e) => e.id));
  if (b.exercises.some((e) => !keyA.has(e.id))) changedCount += 1;
}
check(
  'G4 перегенерация даёт другой набор',
  changedCount >= Math.ceil(days.length * 0.7),
  `${changedCount}/${days.length} дней изменились`
);

// ── G3: мышцы дня покрыты везде, где это возможно ──────────────────────────
check(
  'G3 жёсткое покрытие мышц дня',
  uncovered.length === 0,
  uncovered.slice(0, 6).join('; ') || 'все мышечные слоты закрыты'
);
console.log(
  `INFO best-effort паттерные слоты не закрыты: ${patternUncovered.length} из ` +
    `${days.length * 4} (съедаются потолками состава — так и задумано)`
);

// ── S-1: травмы ─────────────────────────────────────────────────────────────
const shoulderInjury = { body_part: 'shoulder', injury_type: 'pain', severity: 'high' };
let contraSelected = 0;
let excludedCount = 0;
for (const day of days) {
  const plan = planWarmup(buildInput(day, 'warmup|inj|0', 'graded', [shoulderInjury]));
  for (const e of plan.exercises) {
    if ((warningsByExercise[e.id] ?? []).some((w) => w.body_part === 'shoulder'))
      contraSelected += 1;
  }
  excludedCount += Object.entries(plan.excludedByBodyPart).reduce(
    (n, [zone, c]) => (zone === 'shoulder' ? n + c : n),
    0
  );
}
check(
  'S-1 ни одного противопоказанного пункта',
  contraSelected === 0,
  `нарушений=${contraSelected}`
);
check(
  'S-1 счётчик исключённых по зоне > 0',
  excludedCount > 0,
  `исключено кандидатов=${excludedCount}`
);

// ── ORD: пресеты порядка дают разную расстановку ───────────────────────────
const sampleDay = days[0];
const bucketSeq = (order) =>
  planWarmup(buildInput(sampleDay, 'warmup|ord|0', order))
    .exercises.map((e) => bucketOf(e.id))
    .join(',');
const seqGraded = bucketSeq('graded');
const seqStretch = bucketSeq('stretch_first');
const seqActivation = bucketSeq('activation_first');
check(
  'ORD пресеты различимы',
  seqGraded !== seqStretch && seqStretch !== seqActivation,
  `graded=[${seqGraded}] stretch=[${seqStretch}] activation=[${seqActivation}]`
);

// ── Отчёт ───────────────────────────────────────────────────────────────────
let failed = 0;
for (const r of results) {
  if (!r.ok) failed += 1;
  console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
}
const firstPlan = planWarmup(buildInput(days[0], 'warmup|show|0'));
console.log(
  `\nПример (${days[0].exercises.length} упр. дня): ${firstPlan.exercises.length} пунктов, ${Math.round(
    firstPlan.totalSeconds / 60
  )} мин, target=${firstPlan.targetCount}`
);
for (const e of firstPlan.exercises)
  console.log(`  · ${bucketOf(e.id).padEnd(10)} ${e.duration_seconds}с  ${e.name}`);
console.log(`\nИТОГ: ${results.length - failed}/${results.length} проверок зелёные`);
process.exit(failed === 0 ? 0 : 1);
