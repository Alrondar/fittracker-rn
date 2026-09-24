import type { GoalType, GenderType, PharmaType } from '../services/goalsService';

export interface MacroInput {
  birthDate: string;
  height: string;
  weight: string;
  gender: GenderType | null;
  activityLevel: number | null;
  goal: GoalType | null;
  usePharma: boolean;
  pharmaType: PharmaType;
  /** P1.1: Процент жира для расчёта по формуле Кэтча-МакАрдла (опционально). */
  bodyFatPercentage?: number | null;
}

export interface MacroResult {
  calories: number;
  proteins: number;
  fats: number;
  carbs: number;
}

/**
 * Возраст по дате рождения. Если дата пустая/некорректная — fallback 25.
 */
export function calculateAge(birthDateStr: string): number {
  if (!birthDateStr) return 25;
  const birth = new Date(birthDateStr);
  if (isNaN(birth.getTime())) return 25;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Расчёт КБЖУ по формуле Миффлина-Сан Жеора с учётом цели и фармакологии.
 * Чистая функция: не мутирует state, возвращает результат.
 */
export function calculateMacros(input: MacroInput): MacroResult {
  const age = calculateAge(input.birthDate);
  const h = parseFloat(input.height) || 175;
  const w = parseFloat(input.weight) || 70;
  const g = input.gender || 'male';
  const activity = input.activityLevel || 1.55;

  // BMR (базовый метаболизм)
  let bmr: number;
  // P1.1: Если известен % жира, используем формулу Кэтча-МакАрдла (точнее для рекомпозиции)
  if (
    input.bodyFatPercentage != null &&
    input.bodyFatPercentage > 0 &&
    input.bodyFatPercentage < 100
  ) {
    const leanMass = w * (1 - input.bodyFatPercentage / 100);
    bmr = 370 + 21.6 * leanMass;
  } else {
    // Fallback: формула Миффлина-Сан Жеора
    if (g === 'male') {
      bmr = 10 * w + 6.25 * h - 5 * age + 5;
    } else {
      bmr = 10 * w + 6.25 * h - 5 * age - 161;
    }
  }

  // Целевые калории с учётом активности и цели
  let targetCalories = bmr * activity;
  if (input.goal === 'lose') {
    targetCalories = targetCalories * 0.85;
  }
  if (input.goal === 'gain') {
    targetCalories = targetCalories * 1.15;
  }

  // Макросы: научно обоснованные диапазоны (NSCA/ACSM)
  // Белок: MPS (muscle protein synthesis) достигает плато при ~2.2–2.4 г/кг.
  // Выше 2.4 г/кг избыток окисляется для энергии, создавая нагрузку на ЖКТ/почки.
  // Жиры: минимум 1.0 г/кг критичен для гормональной системы и усвоения витаминов.
  //
  // Безопасные ограничения (вместо опасных фармакологических эвристик).
  // PRODUCT.md §14: приложение не назначает фармакологию и не поощряет опасные
  // протоколы — Caps/floors применяются ВСЕГДА независимо от usePharma.
  // Clamp'ы привязаны и к г/кг, и к доле целевых калорий, поэтому реально
  // срабатывают на границах (низкие калории при большой массе и наоборот),
  // а базовые 2.0/1.0 г/кг остаются для типового пользователя.
  const PROTEIN_MAX_G_PER_KG = 2.4; // физиологический потолок усвоения
  const PROTEIN_MAX_CALORIE_SHARE = 0.35; // белок не более 35% целевых калорий
  const FAT_MIN_G_PER_KG = 1.0; // гормональный минимум
  const FAT_MIN_CALORIE_SHARE = 0.2; // жиры не менее 20% целевых калорий

  let targetProteins = Math.round(w * 2.0);
  let targetFats = Math.round(w * 1.0);

  // Верхняя граница белка: минимум из г/кг-потолка и доли калорий.
  const proteinCapByWeight = Math.round(w * PROTEIN_MAX_G_PER_KG);
  const proteinCapByCalories = Math.round((targetCalories * PROTEIN_MAX_CALORIE_SHARE) / 4);
  targetProteins = Math.min(targetProteins, proteinCapByWeight, proteinCapByCalories);

  // Нижняя граница жиров: максимум из г/кг-минимума и доли калорий.
  const fatFloorByWeight = Math.round(w * FAT_MIN_G_PER_KG);
  const fatFloorByCalories = Math.round((targetCalories * FAT_MIN_CALORIE_SHARE) / 9);
  targetFats = Math.max(targetFats, fatFloorByWeight, fatFloorByCalories);

  // Углеводы — остаток калорий
  const proteinCalories = targetProteins * 4;
  const fatCalories = targetFats * 9;
  const remainingCalories = Math.max(0, targetCalories - proteinCalories - fatCalories);
  const targetCarbs = Math.round(remainingCalories / 4);

  return {
    calories: Math.round(targetCalories),
    proteins: targetProteins,
    fats: targetFats,
    carbs: targetCarbs,
  };
}
