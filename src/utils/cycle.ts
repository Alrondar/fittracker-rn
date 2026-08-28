// src/utils/cycle.ts
// Чистая функция расчёта фаз цикла. Без React, без Supabase.
import type { CycleEvent, CyclePhase, CalculatedCyclePhase } from '../types/cycle';
import type { ThemeColors } from '../constants/theme';

/**
 * Рассчитывает текущую фазу цикла на основе событий.
 * @param events События цикла пользователя
 * @param lutealLength Длина лютеиновой фазы (по умолчанию 14)
 * @param referenceDate Дата, для которой считаем (по умолчанию сегодня)
 * @returns CalculatedCyclePhase или null, если недостаточно данных
 */
export function calculateCyclePhases(
  events: CycleEvent[],
  lutealLength: number = 14,
  referenceDate: Date = new Date()
): CalculatedCyclePhase | null {
  if (!events || events.length === 0) return null;

  // Сортируем события по дате (от старых к новым)
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
  );

  // Находим последнее начало месячных (menstruation_start)
  const lastMenstruationStart = sortedEvents
    .filter((e) => e.event_type === 'menstruation_start')
    .pop();

  if (!lastMenstruationStart) return null;

  const refTime = referenceDate.getTime();
  const startDate = new Date(lastMenstruationStart.event_date);
  
  // Если referenceDate раньше начала месячных, данных недостаточно
  if (refTime < startDate.getTime()) return null;

  // Находим конец текущих месячных (если есть)
  const menstruationEnd = sortedEvents
    .filter((e) => e.event_type === 'menstruation_end' && new Date(e.event_date) >= startDate)
    .pop();

  const menstruationEndDate = menstruationEnd 
    ? new Date(menstruationEnd.event_date) 
    : null;

  // Проверяем, идут ли сейчас месячные
  if (!menstruationEndDate || refTime <= menstruationEndDate.getTime() + 86400000) {
    return {
      phase: 'menstrual',
      dayNumber: Math.floor((refTime - startDate.getTime()) / 86400000) + 1,
      startDate,
      endDate: menstruationEndDate || startDate,
      isEstimated: false,
    };
  }

  // Ищем следующее начало месячных (для расчёта овуляции и конца цикла)
  const nextMenstruationStart = sortedEvents
    .filter((e) => e.event_type === 'menstruation_start' && new Date(e.event_date) > startDate)
    .shift();

  // Определяем даты овуляции
  let ovulationStart: Date;
  let ovulationEnd: Date;
  let isEstimatedOvulation = false;

  const userOvulationStart = sortedEvents
    .filter((e) => e.event_type === 'ovulation_start' && new Date(e.event_date) >= startDate)
    .pop();

  const userOvulationEnd = sortedEvents
    .filter((e) => e.event_type === 'ovulation_end' && new Date(e.event_date) >= startDate)
    .pop();

  if (userOvulationStart && userOvulationEnd) {
    ovulationStart = new Date(userOvulationStart.event_date);
    ovulationEnd = new Date(userOvulationEnd.event_date);
  } else if (nextMenstruationStart) {
    // Автоматический расчёт: овуляция = следующее начало - lutealLength
    const nextStartTime = new Date(nextMenstruationStart.event_date).getTime();
    ovulationStart = new Date(nextStartTime - lutealLength * 86400000);
    ovulationEnd = new Date(ovulationStart.getTime() + 86400000); // 1 день овуляции
    isEstimatedOvulation = true;
  } else {
    // Если следующего начала нет, предполагаем стандартный цикл 28 дней
    const estimatedNextStart = new Date(startDate.getTime() + 28 * 86400000);
    ovulationStart = new Date(estimatedNextStart.getTime() - lutealLength * 86400000);
    ovulationEnd = new Date(ovulationStart.getTime() + 86400000);
    isEstimatedOvulation = true;
  }

  // Проверяем, находимся ли мы в фазе овуляции
  if (refTime >= ovulationStart.getTime() && refTime <= ovulationEnd.getTime() + 86400000) {
    return {
      phase: 'ovulation',
      dayNumber: Math.floor((refTime - startDate.getTime()) / 86400000) + 1,
      startDate: ovulationStart,
      endDate: ovulationEnd,
      isEstimated: isEstimatedOvulation,
    };
  }

  // Проверяем, находимся ли мы в лютеиновой фазе
  if (refTime > ovulationEnd.getTime() + 86400000) {
    const cycleEndDate = nextMenstruationStart 
      ? new Date(nextMenstruationStart.event_date)
      : new Date(startDate.getTime() + 28 * 86400000);
    
    return {
      phase: 'luteal',
      dayNumber: Math.floor((refTime - startDate.getTime()) / 86400000) + 1,
      startDate: new Date(ovulationEnd.getTime() + 86400000),
      endDate: cycleEndDate,
      isEstimated: isEstimatedOvulation || !nextMenstruationStart,
    };
  }

  // Иначе мы в фолликулярной фазе (после месячных, до овуляции)
  return {
    phase: 'follicular',
    dayNumber: Math.floor((refTime - startDate.getTime()) / 86400000) + 1,
    startDate: menstruationEndDate ? new Date(menstruationEndDate.getTime() + 86400000) : startDate,
    endDate: ovulationStart,
    isEstimated: isEstimatedOvulation,
  };
}

/**
 * Возвращает цвет для фазы цикла (семантический)
 */
export function getCyclePhaseColor(phase: CyclePhase): keyof ThemeColors {
  switch (phase) {
    case 'menstrual':
      return 'error';
    case 'follicular':
      return 'success';
    case 'ovulation':
      return 'warning';
    case 'luteal':
      return 'primary';
    default:
      return 'textSecondary';
  }
}

/**
 * Возвращает человекочитаемое название фазы
 */
export function getCyclePhaseLabel(phase: CyclePhase): string {
  switch (phase) {
    case 'menstrual':
      return 'Менструация';
    case 'follicular':
      return 'Фолликулярная';
    case 'ovulation':
      return 'Овуляция';
    case 'luteal':
      return 'Лютеиновая';
    default:
      return 'Неизвестно';
  }
}

/**
 * Рассчитывает фазу цикла для конкретной даты (для календаря).
 * В отличие от calculateCyclePhases, возвращает фазу для любого дня, а не только для referenceDate.
 */
export function getPhaseForDate(
  targetDate: Date,
  events: CycleEvent[],
  lutealLength: number = 14
): CyclePhase | null {
  if (!events || events.length === 0) return null;

  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
  );
  const targetTime = targetDate.getTime();

  const lastMenstruationStart = sortedEvents
    .filter((e) => e.event_type === 'menstruation_start' && new Date(e.event_date).getTime() <= targetTime)
    .pop();

  if (!lastMenstruationStart) return null;

  const startDate = new Date(lastMenstruationStart.event_date);
  
  const menstruationEnd = sortedEvents
    .filter((e) => e.event_type === 'menstruation_end' && new Date(e.event_date).getTime() >= startDate.getTime())
    .pop();
  const menstruationEndDate = menstruationEnd ? new Date(menstruationEnd.event_date) : null;

  if (!menstruationEndDate || targetTime <= menstruationEndDate.getTime() + 86400000) {
    return 'menstrual';
  }

  const nextMenstruationStart = sortedEvents
    .filter((e) => e.event_type === 'menstruation_start' && new Date(e.event_date).getTime() > startDate.getTime())
    .shift();

  let ovulationStart: Date;
  let ovulationEnd: Date;

  const userOvulationStart = sortedEvents
    .filter((e) => e.event_type === 'ovulation_start' && new Date(e.event_date).getTime() >= startDate.getTime())
    .pop();
  const userOvulationEnd = sortedEvents
    .filter((e) => e.event_type === 'ovulation_end' && new Date(e.event_date).getTime() >= startDate.getTime())
    .pop();

  if (userOvulationStart && userOvulationEnd) {
    ovulationStart = new Date(userOvulationStart.event_date);
    ovulationEnd = new Date(userOvulationEnd.event_date);
  } else if (nextMenstruationStart) {
    const nextStartTime = new Date(nextMenstruationStart.event_date).getTime();
    ovulationStart = new Date(nextStartTime - lutealLength * 86400000);
    ovulationEnd = new Date(ovulationStart.getTime() + 86400000);
  } else {
    const estimatedNextStart = new Date(startDate.getTime() + 28 * 86400000);
    ovulationStart = new Date(estimatedNextStart.getTime() - lutealLength * 86400000);
    ovulationEnd = new Date(ovulationStart.getTime() + 86400000);
  }

  if (targetTime >= ovulationStart.getTime() && targetTime <= ovulationEnd.getTime() + 86400000) {
    return 'ovulation';
  }
  if (targetTime > ovulationEnd.getTime() + 86400000) {
    return 'luteal';
  }

  return 'follicular';
}