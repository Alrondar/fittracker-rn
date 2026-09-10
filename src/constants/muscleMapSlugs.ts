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

const MUSCLE_TO_SLUGS: Record<string, MuscleSlugs> = {
  // ===== ГРУДЬ =====
  'большая грудная': { front: ['chest'], back: [] },
  'верхняя часть большой грудной': { front: ['chest'], back: [] },
  'нижняя часть большой грудной': { front: ['chest'], back: [] },
  'внутренняя часть большой грудной': { front: ['chest'], back: [] },
  'малая грудная': { front: ['chest'], back: [] },
  зубчатые: { front: ['chest'], back: [] },

  // ===== СПИНА =====
  широчайшие: { front: [], back: ['upper-back'] },
  'широчайшие (верх)': { front: [], back: ['upper-back'] },
  'широчайшие (середина/низ)': { front: [], back: ['upper-back', 'lower-back'] },
  трапеция: { front: ['trapezius'], back: ['trapezius'] },
  'верхняя трапеция': { front: ['trapezius'], back: ['trapezius'] },
  'средняя/нижняя трапеция': { front: ['trapezius'], back: ['trapezius', 'upper-back'] },
  ромбовидные: { front: [], back: ['upper-back'] },
  'разгибатели спины': { front: [], back: ['lower-back'] },
  'квадратная мышца поясницы': { front: [], back: ['lower-back'] },
  'большая круглая': { front: [], back: ['upper-back'] },
  'мышцы, поднимающие лопатку': { front: [], back: ['upper-back'] },
  'многораздельные мышцы': { front: [], back: ['lower-back'] },

  // ===== ПЛЕЧИ =====
  дельтовидные: { front: ['deltoids'], back: ['deltoids'] },
  'передняя дельта': { front: ['deltoids'], back: [] },
  'средняя дельта': { front: ['deltoids'], back: ['deltoids'] },
  'задняя дельта': { front: [], back: ['deltoids'] },
  'ротаторная манжета': { front: ['deltoids'], back: ['deltoids'] },
  надостная: { front: [], back: ['deltoids'] },
  подостная: { front: [], back: ['deltoids'] },
  'малая круглая': { front: [], back: ['deltoids'] },
  подлопаточная: { front: [], back: ['deltoids'] },

  // ===== РУКИ =====
  бицепс: { front: ['biceps'], back: [] },
  'бицепс (длинная головка)': { front: ['biceps'], back: [] },
  'бицепс (короткая головка)': { front: ['biceps'], back: [] },
  трицепс: { front: ['triceps'], back: ['triceps'] },
  'трицепс (длинная головка)': { front: ['triceps'], back: ['triceps'] },
  'трицепс (латеральная головка)': { front: ['triceps'], back: ['triceps'] },
  'трицепс (медиальная головка)': { front: ['triceps'], back: ['triceps'] },
  брахиалис: { front: ['biceps', 'forearm'], back: [] },
  брахиорадиалис: { front: ['forearm'], back: ['forearm'] },
  'мышцы предплечья': { front: ['forearm'], back: ['forearm'] },
  'локтевая мышца': { front: ['forearm'], back: ['triceps'] },
  'сгибатели предплечья': { front: ['forearm'], back: [] },
  'разгибатели предплечья': { front: [], back: ['forearm'] },
  'сгибатели пальцев': { front: ['forearm'], back: ['forearm'] },

  // ===== НОГИ =====
  квадрицепс: { front: ['quadriceps'], back: [] },
  'прямая мышца бедра': { front: ['quadriceps'], back: [] },
  'бицепс бедра': { front: [], back: ['hamstring'] },
  'большая ягодичная': { front: [], back: ['gluteal'] },
  'средняя ягодичная': { front: [], back: ['gluteal', 'abductors'] },
  'малая ягодичная': { front: [], back: ['gluteal', 'abductors'] },
  'ягодичные мышцы': { front: [], back: ['gluteal'] },
  икроножная: { front: ['calves'], back: ['calves'] },
  камбаловидная: { front: ['calves'], back: ['calves'] },
  'приводящие мышцы бедра': { front: ['adductors'], back: [] },
  'отводящие мышцы бедра': { front: [], back: ['abductors'] },
  грушевидная: { front: [], back: ['gluteal', 'abductors'] },
  'подвздошно-поясничная': { front: ['quadriceps', 'adductors'], back: [] },
  'передняя большеберцовая': { front: ['tibialis'], back: [] },

  // ===== ПРЕСС И КОР =====
  'прямая мышца живота': { front: ['abs'], back: [] },
  'нижняя часть прямой мышцы живота': { front: ['abs'], back: [] },
  'косые мышцы живота': { front: ['obliques'], back: [] },
  'поперечная мышца живота': { front: ['abs'], back: [] },
};

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
