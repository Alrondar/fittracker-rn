// src/engine/warmupPlan.ts
// WARMUP-3b: план разминки как чистая функция (паттерн engine/alternatives.ts —
// без React и Supabase, детерминирован при одинаковом входе).
//
// Что исправлено по сравнению со скорингом внутри warmupService (аудит 08.10):
//   1. Кандидаты больше не обрезаются произвольным limit(80) — виден ВЕСЬ пул,
//      поэтому «топ-N» действительно топ, а не «что попало в первые строки».
//   2. Правило покрытия: каждая крупная мышца и каждый паттерн дня получают
//      минимум один пункт разминки (было: просто сортировка по счёту).
//   3. Нормализация мышц через карту групп: четыре группы из программ
//      («нижняя часть большой грудной», «камбаловидная», «брахиорадиалис»,
//      «нижняя часть прямой мышцы живота») не имели ни одного пересечения с пулом.
//   4. Длительность из политики по бакету: поля длительности в БД нет, а regex по
//      settings не совпадал ни с одной строкой пула (0/178) — весь блок был 7×30 с.
//   5. Разминка не дублирует упражнение, которое и так стоит в дне.
//   6. Взвешенная выборка по сиду: ⟳ даёт другой набор, повторный заход с тем же
//      сидом — тот же (раньше regeneration был детерминированным no-op).
//
// Тяжёлые тексты (technique/benefits/risks/media_url) сюда не попадают: их догружает
// сервис только для финальных упражнений (PERF-3 не регрессирует).

// Тип отдельно: `import type` обязателен — офлайн-harness гоняет этот модуль
// через node --experimental-strip-types, а там value-импорт интерфейса падает.
import type { UserInjury } from '../constants/injuries';
import { targetsInjuredMuscle, contraindicationMatchesInjury } from '../constants/injuries';

export type WarmupBucket = 'general' | 'activation' | 'mobility' | 'static';

/** Порядок блоков разминки (настройка «Порядок разминки»). */
export type WarmupOrder = 'graded' | 'activation_first' | 'stretch_first';

/** Противопоказание уровня 1 — форма как в injuriesService.getExerciseContraindications. */
export type WarmupContraindication = { body_part: string; injury_type?: string | null };

export interface WarmupPlanCandidate {
  id: string;
  name: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  /** Из exercise_equipment (единый источник — exerciseReferenceService). */
  equipment: string[];
  category: string | null;
  can_be_activation: boolean;
  movement_pattern: string | null;
  difficulty: string | null;
  status: string | null;
  /** Секунды из settings, если текст их действительно содержит; иначе null. */
  duration_hint?: number | null;
}

export interface WarmupPlanInput {
  /** Мышцы дня: primary → +2, secondary → +1 за каждое упражнение (как исторически). */
  dayMuscles: Record<string, number>;
  /** Паттерны дня: movement_pattern → число упражнений дня с ним. */
  dayPatterns: Record<string, number>;
  /** id основных упражнений дня — чтобы разминка их не повторяла. */
  dayExerciseIds: string[];
  /** В дне есть штанга/гантели/тренажёры — влияет на приоритет активации. */
  strengthFocused: boolean;
  candidates: WarmupPlanCandidate[];
  activeInjuries: UserInjury[];
  contraindications: Record<string, WarmupContraindication[]>;
  order: WarmupOrder;
  /** Детерминированный сид: userId | подпись дня | счётчик перегенераций. */
  seed: string;
  /** Количество упражнений в дне — влияет на размер разминки. */
  daySize: number;
}

export interface PlannedWarmupExercise {
  id: string;
  name: string;
  bucket: WarmupBucket;
  duration_seconds: number;
  relevance_score: number;
  primary_muscles: string[];
  secondary_muscles: string[];
  category: string | null;
  can_be_activation: boolean;
}

export interface WarmupPlanResult {
  exercises: PlannedWarmupExercise[];
  /** Мышцы/паттерны дня, для которых в пуле не нашлось ни одного пункта. */
  uncoveredGroups: string[];
  /** Сколько кандидатов исключено по травмам — по зоне (чип «учтены травмы»). */
  excludedByBodyPart: Record<string, number>;
  totalSeconds: number;
  targetCount: number;
  /** Диагностика для офлайн-harness (G2/G3). */
  stats: {
    candidatesSeen: number;
    candidatesScored: number;
    needsReviewUsed: number;
  };
}

// ===== Политика =====

/** «Разогрев»: локомоции/прыжки — первый шаг в пресете graded. */
const GENERAL_PATTERNS = new Set(['gait', 'jump', 'step_up']);

/**
 * Длительность пункта по бакету. Поля длительности в БД нет (0/178 строк пула
 * содержат секунды в settings — проверено продом), поэтому политика живёт здесь.
 * Калибровка: 7 пунктов ≈ 7 минут (harness G5), т.е. блок перестаёт быть
 * «вечно 3,5 минуты» и попадает в норму разминки 6–12 мин.
 */
const BUCKET_SECONDS: Record<WarmupBucket, number> = {
  general: 120, // разогрев: ходьба/эллипс/лёгкие прыжки — 2 минуты
  activation: 60,
  mobility: 45,
  static: 40,
};

/** Потолки состава: без них блок превращался в семь однотипных пунктов. */
const MAX_PER_BUCKET: Record<WarmupBucket, number> = {
  general: 1,
  activation: 3,
  mobility: 4,
  static: 2,
};

const SEVERITY_PENALTY: Record<string, number> = { medium: 5, low: 2 };

/** Тренажёрное оборудование (приоритет в силовые дни) — перенесено из сервиса 1-в-1. */
const MACHINE_KEYWORDS = ['тренаж', 'кроссовер', 'блок', 'pec deck', 'рукоят', 'смит', 'манжет'];

/** Оборудование силовой тренировки — перенесено из сервиса 1-в-1. */
const STRENGTH_EQUIPMENT_KEYWORDS = [
  'штанг',
  'гантел',
  'тренаж',
  'кроссовер',
  'блок',
  'смит',
  'гриф',
  'гиря',
];

const PATTERN_BONUS = 3;
const ACTIVATION_BONUS = 2;
const MACHINE_ACTIVATION_BONUS = 3;
const MOBILITY_BONUS = 1;
/** Разминочные пункты не должны быть продвинутыми — уровень профиля в движок
 *  пока не проброшен, поэтому штраф unconditional (в отличие от alternatives.ts). */
const ADVANCED_PENALTY = 3;
/** needs_review = второй ярус качества: не запрещаем, но только когда approved
 *  не закрыл покрытие (жёсткий фильтр по статусу ронял покрытие худшего дня
 *  с 26 кандидатов до 10, проверено продом 08.10). */
const NEEDS_REVIEW_PENALTY = 5;
const DIVERSITY_MUSCLE_PENALTY = 4;
const DIVERSITY_PATTERN_PENALTY = 2;
/** Из скольких лучших крутится взвешенная выборка. */
const FILL_WINDOW = 12;

/**
 * Карта групп мышц. Прод 08.10: «нижняя часть большой грудной» — 50 использований
 * в программах и 0 пересечений с пулом, «камбаловидная» — 40 и 0.
 * Влияет ТОЛЬКО на совпадение «мышца дня → кандидат»; метки в UI не подменяются.
 */
const MUSCLE_GROUP_ALIASES: Record<string, string[]> = {
  'нижняя часть большой грудной': ['большая грудная', 'передняя дельта'],
  'верхняя часть большой грудной': ['большая грудная', 'передняя дельта'],
  'большая грудная': ['верхняя часть большой грудной', 'нижняя часть большой грудной'],
  камбаловидная: ['икроножная'],
  икроножная: ['камбаловидная'],
  брахиорадиалис: ['мышцы предплечья', 'разгибатели предплечья', 'бицепс'],
  брахиалис: ['бицепс', 'мышцы предплечья'],
  'мышцы предплечья': ['брахиорадиалис', 'разгибатели предплечья'],
  'разгибатели предплечья': ['мышцы предплечья'],
  'нижняя часть прямой мышцы живота': ['прямая мышца живота', 'поперечная мышца живота'],
  'прямая мышца живота': ['поперечная мышца живота', 'косые мышцы живота'],
  'передняя дельта': ['дельтовидные', 'средняя дельта'],
  'средняя дельта': ['дельтовидные', 'задняя дельта'],
  'задняя дельта': ['дельтовидные', 'трапеция'],
  дельтовидные: ['передняя дельта', 'средняя дельта', 'задняя дельта'],
  'большая ягодичная': ['средняя ягодичная'],
  'средняя ягодичная': ['большая ягодичная'],
  'ротаторная манжета': ['задняя дельта', 'средняя дельта'],
  широчайшие: ['ромбовидные', 'трапеция'],
  ромбовидные: ['широчайшие', 'трапеция'],
  'трицепс (латеральная головка)': ['трицепс'],
  'трицепс (длинная головка)': ['трицепс'],
  'трицепс (медиальная головка)': ['трицепс'],
  'бицепс бедра': ['большая ягодичная'],
  квадрицепс: ['большая ягодичная'],
};

const nonEmptyLower = (values: (string | null | undefined)[] | undefined): string[] =>
  (values ?? [])
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
    .map((v) => v.toLowerCase());

const hasKeyword = (values: string[], keywords: string[]): boolean =>
  values.some((v) => keywords.some((kw) => v.includes(kw)));

/** Мышцы + группы, которым они принадлежат. */
function expandMuscles(values: string[]): Set<string> {
  const out = new Set<string>();
  for (const raw of values) {
    const key = raw.toLowerCase();
    out.add(key);
    for (const alias of MUSCLE_GROUP_ALIASES[key] ?? []) out.add(alias);
  }
  return out;
}

/** Бакет: разогрев / активация / динамическая мобилити / статика. */
export function classifyWarmupBucket(c: {
  category: string | null;
  can_be_activation: boolean;
  movement_pattern: string | null;
}): WarmupBucket {
  const pattern = c.movement_pattern?.toLowerCase() ?? null;
  if (pattern && GENERAL_PATTERNS.has(pattern)) return 'general';
  if (c.can_be_activation) return 'activation';
  return pattern ? 'mobility' : 'static';
}

/** Hint из settings важнее политики (если редактор начнёт писать секунды — они выигрывают). */
export function warmupDurationSeconds(bucket: WarmupBucket, durationHint?: number | null): number {
  if (durationHint && durationHint > 0) return durationHint;
  return BUCKET_SECONDS[bucket];
}

/** Число пунктов: 5–8 вместо исторических жёстких 7. */
export function warmupTargetCount(
  daySize: number,
  strengthFocused: boolean,
  dayPatterns: string[]
): number {
  const base = 4 + Math.ceil(Math.max(1, daySize) / 3);
  const bigLifts = dayPatterns.some((p) => ['squat', 'hinge', 'lunge'].includes(p));
  const bonus = strengthFocused && bigLifts ? 1 : 0;
  return Math.min(8, Math.max(5, base + bonus));
}

/** Силовой ли день по оборудованию основных упражнений (перенос из сервиса). */
export function isStrengthDay(dayEquipment: string[][]): boolean {
  return dayEquipment.some((eq) => hasKeyword(nonEmptyLower(eq), STRENGTH_EQUIPMENT_KEYWORDS));
}

// ===== Детерминированный ГПСЧ (FNV-1a + mulberry32) =====

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ===== Внутренняя форма =====

interface Scored {
  id: string;
  name: string;
  bucket: WarmupBucket;
  score: number;
  /** Мышцы кандидата, раскрытые по группам (для правила покрытия). */
  muscles: Set<string>;
  /** Доминирующая primary-мышь — носитель штрафа за однотипность. */
  dominant: string | null;
  pattern: string | null;
  durationSeconds: number;
  approved: boolean;
  primary_muscles: string[];
  secondary_muscles: string[];
  category: string | null;
  can_be_activation: boolean;
}

function scoreCandidates(input: WarmupPlanInput, byBodyPart: Record<string, number>): Scored[] {
  const dayIds = new Set(input.dayExerciseIds);
  const dayPatternKeys = new Set(nonEmptyLower(Object.keys(input.dayPatterns)));

  // Мышцы дня → вес + раскрытая группа (считаем один раз, не на кандидата).
  const dayMuscles = Object.entries(input.dayMuscles).map(([key, weight]) => ({
    key: key.toLowerCase(),
    weight,
    group: expandMuscles([key.toLowerCase()]),
  }));

  const scored: Scored[] = [];

  for (const c of input.candidates) {
    // Разминка не повторяет упражнение самого дня (G6).
    if (dayIds.has(c.id)) continue;

    const candidateMuscles = expandMuscles([
      ...nonEmptyLower(c.primary_muscles),
      ...nonEmptyLower(c.secondary_muscles),
    ]);
    const primaryLower = nonEmptyLower(c.primary_muscles);
    const secondaryLower = nonEmptyLower(c.secondary_muscles);

    let muscleScore = 0;
    for (const day of dayMuscles) {
      let hit = false;
      for (const key of candidateMuscles) {
        if (day.group.has(key)) {
          hit = true;
          break;
        }
      }
      if (!hit) continue;
      muscleScore += day.weight;
      // Прямое совпадение метки ценнее группового «моста».
      if (primaryLower.includes(day.key)) muscleScore += 1;
      else if (secondaryLower.includes(day.key)) muscleScore += 0.5;
    }
    if (muscleScore <= 0) continue;

    const bucket = classifyWarmupBucket(c);
    const pattern = c.movement_pattern?.toLowerCase() ?? null;
    const approved = c.status === 'approved';

    let score = muscleScore;
    if (pattern && dayPatternKeys.has(pattern)) score += PATTERN_BONUS;
    if (bucket === 'activation') {
      score += ACTIVATION_BONUS;
      if (input.strengthFocused && hasKeyword(nonEmptyLower(c.equipment), MACHINE_KEYWORDS)) {
        score += MACHINE_ACTIVATION_BONUS;
      }
    } else if (bucket === 'mobility') {
      score += MOBILITY_BONUS;
    }
    if (c.difficulty === 'advanced') score -= ADVANCED_PENALTY;
    if (!approved) score -= NEEDS_REVIEW_PENALTY;

    // Травмы: уровень 1 — прямое противопоказание; уровень 2 — нагрузка на зону
    // (high → исключение, medium −5, low −2). Те же уровни, что в alternatives.ts.
    const contras = input.contraindications[c.id] ?? [];
    let excluded = contras.some((contra) =>
      input.activeInjuries.some((inj) => contraindicationMatchesInjury(contra, inj))
    );
    let penalty = 0;
    if (!excluded) {
      for (const injury of input.activeInjuries) {
        if (
          targetsInjuredMuscle(c.primary_muscles ?? [], c.secondary_muscles ?? [], injury.body_part)
        ) {
          if (injury.severity === 'high') {
            excluded = true;
            break;
          }
          penalty += SEVERITY_PENALTY[injury.severity] ?? SEVERITY_PENALTY.low;
        }
      }
    }
    if (excluded) {
      // Считаем зону один раз на упражнение (как делал сервис), иначе чип завышается.
      const zone =
        contras.find((contra) =>
          input.activeInjuries.some((inj) => contraindicationMatchesInjury(contra, inj))
        )?.body_part ??
        input.activeInjuries.find((inj) =>
          targetsInjuredMuscle(c.primary_muscles ?? [], c.secondary_muscles ?? [], inj.body_part)
        )?.body_part;
      if (zone) byBodyPart[zone] = (byBodyPart[zone] ?? 0) + 1;
      continue;
    }
    score -= penalty;

    scored.push({
      id: c.id,
      name: c.name,
      bucket,
      score,
      muscles: candidateMuscles,
      dominant: primaryLower[0] ?? null,
      pattern,
      durationSeconds: warmupDurationSeconds(bucket, c.duration_hint),
      approved,
      primary_muscles: c.primary_muscles ?? [],
      secondary_muscles: c.secondary_muscles ?? [],
      category: c.category ?? null,
      can_be_activation: c.can_be_activation,
    });
  }

  return scored;
}

/** Стабильный порядок: score desc → approved раньше → id (без зависит от БД). */
function byScore(a: Scored, b: Scored): number {
  if (b.score !== a.score) return b.score - a.score;
  if (a.approved !== b.approved) return a.approved ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function phaseRank(bucket: WarmupBucket, order: WarmupOrder): number {
  if (order === 'graded') {
    return { general: 0, activation: 1, mobility: 2, static: 3 }[bucket];
  }
  // Два прежних поведения сохранены 1-в-1: «активация+разогрев» против
  // «статика+мобилити», внутри фазы — по счёту.
  const dynamic = bucket === 'activation' || bucket === 'general';
  return order === 'activation_first' ? (dynamic ? 0 : 1) : dynamic ? 1 : 0;
}

export function planWarmup(input: WarmupPlanInput): WarmupPlanResult {
  const byBodyPart: Record<string, number> = {};
  const all = scoreCandidates(input, byBodyPart);
  const sorted = [...all].sort(byScore);
  const target = warmupTargetCount(
    input.daySize,
    input.strengthFocused,
    nonEmptyLower(Object.keys(input.dayPatterns))
  );

  const chosen: Scored[] = [];
  const chosenIds = new Set<string>();

  const bucketCount = (bucket: WarmupBucket): number =>
    chosen.reduce((n, c) => (c.bucket === bucket ? n + 1 : n), 0);

  /** Штраф за однотипность: доминирующая мышца/паттерн уже взяты. */
  const effectiveScore = (c: Scored): number => {
    let s = c.score;
    for (const taken of chosen) {
      if (c.dominant && taken.dominant === c.dominant) s -= DIVERSITY_MUSCLE_PENALTY;
      if (c.pattern && taken.pattern === c.pattern) s -= DIVERSITY_PATTERN_PENALTY;
    }
    return s;
  };

  /**
   * Первый подходящий кандидат по критерию, с учётом потолка бакета.
   * Потолок не «продавливается» ради покрытия: иначе обещание «не семь копий
   * одного типа» было бы декоративным. Не закрыли слот — честно в uncovered.
   */
  const takeCovering = (predicate: (c: Scored) => boolean): Scored | null => {
    for (const c of sorted) {
      if (chosenIds.has(c.id)) continue;
      if (bucketCount(c.bucket) >= MAX_PER_BUCKET[c.bucket]) continue;
      if (!predicate(c)) continue;
      chosen.push(c);
      chosenIds.add(c.id);
      return c;
    }
    return null;
  };

  // 1. Правило покрытия: top-3 мышцы дня (по весу) и top-4 паттерна дня.
  const topMuscles = Object.entries(input.dayMuscles)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key]) => key.toLowerCase());
  for (const muscle of topMuscles) {
    if (chosen.length >= target) break;
    const group = expandMuscles([muscle]);
    const hit = takeCovering((c) => [...group].some((key) => c.muscles.has(key)));
    if (!hit) continue; // слот не закрыт — ниже соберём в uncoveredGroups
  }

  const topPatterns = Object.entries(input.dayPatterns)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([key]) => key.toLowerCase());
  for (const pattern of topPatterns) {
    if (chosen.length >= target) break;
    takeCovering((c) => c.pattern === pattern);
  }

  // 2. Добор до target: взвешенная выборка из top-FILL_WINDOW по сиду.
  const rand = mulberry32(hashSeed(input.seed));
  while (chosen.length < target) {
    const window = sorted
      .filter((c) => !chosenIds.has(c.id) && bucketCount(c.bucket) < MAX_PER_BUCKET[c.bucket])
      .slice(0, FILL_WINDOW);
    if (window.length === 0) break;

    const weights = window.map((c) => Math.max(1, effectiveScore(c) + 4));
    const total = weights.reduce((s, w) => s + w, 0);
    let acc = rand() * total;
    let picked = window[0];
    for (let i = 0; i < window.length; i++) {
      acc -= weights[i];
      if (acc <= 0) {
        picked = window[i];
        break;
      }
    }
    chosen.push(picked);
    chosenIds.add(picked.id);
  }

  // 3. Непокрытые слоты — для диагностики (в UI этого пакета не показываем).
  const uncoveredGroups: string[] = [];
  for (const muscle of topMuscles) {
    const group = expandMuscles([muscle]);
    const covered = chosen.some((c) => [...group].some((key) => c.muscles.has(key)));
    if (!covered) uncoveredGroups.push(muscle);
  }
  for (const pattern of topPatterns) {
    if (!chosen.some((c) => c.pattern === pattern)) uncoveredGroups.push(`pattern:${pattern}`);
  }

  const ordered = chosen.slice().sort((a, b) => {
    const pa = phaseRank(a.bucket, input.order);
    const pb = phaseRank(b.bucket, input.order);
    if (pa !== pb) return pa - pb;
    return byScore(a, b);
  });

  const exercises: PlannedWarmupExercise[] = ordered.map((c) => ({
    id: c.id,
    name: c.name,
    bucket: c.bucket,
    duration_seconds: c.durationSeconds,
    relevance_score: Math.round(c.score * 10) / 10,
    primary_muscles: c.primary_muscles,
    secondary_muscles: c.secondary_muscles,
    category: c.category,
    can_be_activation: c.can_be_activation,
  }));

  return {
    exercises,
    uncoveredGroups,
    excludedByBodyPart: byBodyPart,
    totalSeconds: exercises.reduce((s, e) => s + e.duration_seconds, 0),
    targetCount: target,
    stats: {
      candidatesSeen: input.candidates.length,
      candidatesScored: all.length,
      needsReviewUsed: ordered.filter((c) => !c.approved).length,
    },
  };
}
