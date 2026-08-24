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
  if (input.bodyFatPercentage != null && input.bodyFatPercentage > 0 && input.bodyFatPercentage < 100) {
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

  // Макросы: белки 2г/кг, жиры 1г/кг
  let targetProteins = Math.round(w * 2);
  let targetFats = Math.round(w * 1);

  // Корректировки при фармакологии
  if (input.usePharma && input.pharmaType) {
    if (input.pharmaType === 'steroids') {
      targetProteins = Math.min(Math.round(w * 3), 3 * w);
      targetCalories = targetCalories * 1.1;
    }
    if (input.pharmaType === 'gh') {
      targetFats = Math.round(targetFats * 0.8);
    }
    if (input.pharmaType === 'combo') {
      targetProteins = Math.min(Math.round(w * 3), 3 * w);
      targetFats = Math.round(targetFats * 0.8);
    }
  }

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