/**
 * Маппинг названий мышц (из MUSCLE_GROUPS) на slug'и библиотеки
 * react-native-body-highlighter.
 *
 * Slug'и библиотеки:
 *   Front: abs, biceps, chest, obliques, quadriceps, tibialis, knees
 *   Back:  upper-back, lower-back, hamstring, gluteal, abductors
 *   Both:  trapezius, triceps, forearm, adductors, calves, deltoids
 *
 * Каждая мышца маппится на объект { front: Slug[], back: Slug[] }.
 * Если мышца видна с обеих сторон (например, дельты), оба массива заполняются.
 */

import type { Slug } from '../types/muscleMap';

export type MuscleSlugs = {
  front: Slug[];
  back: Slug[];
};

// Ключи отсортированы по длине (от длинных к коротким), чтобы fallback по подстроке
// находил специфичные названия (напр. "бицепс бедра") раньше, чем общие ("бицепс").
const MUSCLE_TO_SLUGS: Record<string, MuscleSlugs> = {
  // ===== СПИНА =====
  'широчайшие (середина/низ)': { front: [], back: ['upper-back', 'lower-back'] },
  'средняя/нижняя трапеция': { front: ['trapezius'], back: ['trapezius', 'upper-back'] },
  'квадратная мышца поясницы': { front: [], back: ['lower-back'] },
  'мышцы, поднимающие лопатку': { front: [], back: ['upper-back'] },
  'многораздельные мышцы': { front: [], back: ['lower-back'] },
  'широчайшие (верх)': { front: [], back: ['upper-back'] },
  'верхняя трапеция': { front: ['trapezius'], back: ['trapezius'] },
  'разгибатели спины': { front: [], back: ['lower-back'] },
  'большая круглая': { front: [], back: ['upper-back'] },
  широчайшие: { front: [], back: ['upper-back'] },
  трапеция: { front: ['trapezius'], back: ['trapezius'] },
  ромбовидные: { front: [], back: ['upper-back'] },

  // ===== РУКИ =====
  'бицепс (длинная головка)': { front: ['biceps'], back: [] },
  'бицепс (короткая головка)': { front: ['biceps'], back: [] },
  'трицепс (длинная головка)': { front: ['triceps'], back: ['triceps'] },
  'трицепс (латеральная головка)': { front: ['triceps'], back: ['triceps'] },
  'трицепс (медиальная головка)': { front: ['triceps'], back: ['triceps'] },
  'сгибатели предплечья': { front: ['forearm'], back: [] },
  'разгибатели предплечья': { front: [], back: ['forearm'] },
  'сгибатели пальцев': { front: ['forearm'], back: ['forearm'] },
  'мышцы предплечья': { front: ['forearm'], back: ['forearm'] },
  'локтевая мышца': { front: ['forearm'], back: ['triceps'] },
  брахиорадиалис: { front: ['forearm'], back: ['forearm'] },
  бицепс: { front: ['biceps'], back: [] },
  трицепс: { front: ['triceps'], back: ['triceps'] },
  брахиалис: { front: ['biceps', 'forearm'], back: [] },

  // ===== НОГИ =====
  'приводящие мышцы бедра': { front: ['adductors'], back: [] },
  'отводящие мышцы бедра': { front: [], back: ['abductors'] },
  'подвздошно-поясничная': { front: ['quadriceps', 'adductors'], back: [] },
  'передняя большеберцовая': { front: ['tibialis'], back: [] },
  'прямая мышца бедра': { front: ['quadriceps'], back: [] },
  'бицепс бедра': { front: [], back: ['hamstring'] },
  'большая ягодичная': { front: [], back: ['gluteal'] },
  'средняя ягодичная': { front: [], back: ['gluteal', 'abductors'] },
  'малая ягодичная': { front: [], back: ['gluteal', 'abductors'] },
  'ягодичные мышцы': { front: [], back: ['gluteal'] },
  грушевидная: { front: [], back: ['gluteal', 'abductors'] },
  квадрицепс: { front: ['quadriceps'], back: [] },
  икроножная: { front: ['calves'], back: ['calves'] },
  камбаловидная: { front: ['calves'], back: ['calves'] },

  // ===== ПЛЕЧИ =====
  'ротаторная манжета': { front: ['deltoids'], back: ['deltoids'] },
  'передняя дельта': { front: ['deltoids'], back: [] },
  'средняя дельта': { front: ['deltoids'], back: ['deltoids'] },
  'задняя дельта': { front: [], back: ['deltoids'] },
  дельтовидные: { front: ['deltoids'], back: ['deltoids'] },
  надостная: { front: [], back: ['deltoids'] },
  подостная: { front: [], back: ['deltoids'] },
  'малая круглая': { front: [], back: ['deltoids'] },
  подлопаточная: { front: [], back: ['deltoids'] },

  // ===== ГРУДЬ =====
  'верхняя часть большой грудной': { front: ['chest'], back: [] },
  'нижняя часть большой грудной': { front: ['chest'], back: [] },
  'внутренняя часть большой грудной': { front: ['chest'], back: [] },
  'большая грудная': { front: ['chest'], back: [] },
  'малая грудная': { front: ['chest'], back: [] },
  зубчатые: { front: ['chest'], back: [] },

  // ===== ПРЕСС И КОР =====
  'нижняя часть прямой мышцы живота': { front: ['abs'], back: [] },
  'прямая мышца живота': { front: ['abs'], back: [] },
  'поперечная мышца живота': { front: ['abs'], back: [] },
  'косые мышцы живота': { front: ['obliques'], back: [] },
};

/**
 * Обратный маппинг: slug -> массив названий мышц на русском.
 * Используется для отображения баблов при выборе группы мышц.
 */
export const SLUG_TO_MUSCLE_NAMES: Record<string, string[]> = {
  chest: ['Грудь', 'Большая грудная', 'Малая грудная'],
  'upper-back': ['Верх спины', 'Широчайшие', 'Ромбовидные', 'Трапеция (средняя/нижняя)'],
  'lower-back': ['Низ спины', 'Разгибатели спины', 'Квадратная мышца поясницы'],
  trapezius: ['Трапеция', 'Верхняя трапеция'],
  deltoids: ['Дельты', 'Передняя дельта', 'Средняя дельта', 'Задняя дельта'],
  biceps: ['Бицепс', 'Бицепс (длинная головка)', 'Бицепс (короткая головка)'],
  triceps: ['Трицепс', 'Трицепс (длинная головка)', 'Трицепс (латеральная головка)'],
  forearm: ['Предплечья', 'Сгибатели предплечья', 'Разгибатели предплечья'],
  abs: ['Пресс', 'Прямая мышца живота', 'Косые мышцы'],
  obliques: ['Косые мышцы'],
  quadriceps: ['Квадрицепсы', 'Прямая мышца бедра'],
  hamstring: ['Бицепс бедра'],
  gluteal: ['Ягодицы', 'Большая ягодичная', 'Средняя ягодичная'],
  adductors: ['Приводящие мышцы бедра'],
  abductors: ['Отводящие мышцы бедра'],
  calves: ['Икры', 'Икроножная', 'Камбаловидная'],
  tibialis: ['Передняя большеберцовая'],
};

export function getMuscleNamesForSlug(slug: string): string[] {
  return SLUG_TO_MUSCLE_NAMES[slug] || [slug];
}

/**
 * Возвращает slug'и для конкретной мышцы.
 * Использует точный поиск по ключу, затем fallback по вхождению подстроки.
 */
export function getSlugsForMuscle(muscleName: string): MuscleSlugs {
  // Точный поиск
  const exact = MUSCLE_TO_SLUGS[muscleName];
  if (exact) return exact;

  // Fallback: поиск по вхождению подстроки (для вариаций названий)
  const lowerName = muscleName.toLowerCase();
  for (const [key, slugs] of Object.entries(MUSCLE_TO_SLUGS)) {
    if (lowerName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerName)) {
      return slugs;
    }
  }

  return { front: [], back: [] };
}

/**
 * Собирает все уникальные slug'и из списка мышц.
 * Используется для передачи в Body component.
 */
export function collectAllSlugs(
  primaryMuscles: string[],
  secondaryMuscles: string[]
): { primarySlugs: MuscleSlugs[]; secondarySlugs: MuscleSlugs[] } {
  const primarySlugs = primaryMuscles.map(getSlugsForMuscle);
  const secondarySlugs = secondaryMuscles.map(getSlugsForMuscle);
  return { primarySlugs, secondarySlugs };
}
