// src/utils/cycle.ts
// Чистая функция расчёта фаз цикла. Без React, без Supabase.
import type { CycleEvent, CyclePhase, CalculatedCyclePhase } from '../types/cycle';
import type { ThemeColors } from '../constants/theme';

/**
 * Нормализует дату до начала дня (00:00:00 локального времени)
 * для корректного расчёта разницы в днях без влияния часовых поясов и времени суток.
 */
function normalizeDate(date: Date | string): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * FD11-5: оценка длительности менструации, если пользователь залогировал только
 * начало. Без этой оценки фаза «менструация» длилась вечно: овуляция и
 * лютеиновая не наступали никогда, календарь был красный весь месяц.
 * 5 дней — стандартная справочная оценка (помечается isEstimated).
 */
const DEFAULT_MENSES_DURATION_DAYS = 5;

/**
 * Конец текущей менструации: реальное событие menstruation_end или оценка
 * startDate + 4 дня. estimated=true — если конец не залогирован.
 */
function resolveMenstruationEnd(
  sortedEvents: CycleEvent[],
  startDate: Date
): { end: Date; estimated: boolean } {
  const found = sortedEvents
    .filter(
      (e) =>
        e.event_type === 'menstruation_end' &&
        normalizeDate(e.event_date).getTime() >= startDate.getTime()
    )
    .pop();
  if (found) return { end: normalizeDate(found.event_date), estimated: false };
  return {
    end: normalizeDate(
      new Date(startDate.getTime() + (DEFAULT_MENSES_DURATION_DAYS - 1) * 86400000)
    ),
    estimated: true,
  };
}

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
    (a, b) => normalizeDate(a.event_date).getTime() - normalizeDate(b.event_date).getTime()
  );

  // Находим последнее начало месячных (menstruation_start)
  const lastMenstruationStart = sortedEvents
    .filter((e) => e.event_type === 'menstruation_start')
    .pop();

  if (!lastMenstruationStart) return null;

  const refTime = normalizeDate(referenceDate).getTime();
  const startDate = normalizeDate(lastMenstruationStart.event_date);

  // Если referenceDate раньше начала месячных, данных недостаточно
  if (refTime < startDate.getTime()) return null;

  // Находим конец текущих месячных (если есть)
  // FD11-5: без события menstruation_end конец оценивается в start+4 дня —
  // раньше фаза «менструация» в этом случае не заканчивалась никогда.
  const { end: menstruationEndDate, estimated: mensesEndEstimated } = resolveMenstruationEnd(
    sortedEvents,
    startDate
  );

  // Проверяем, идут ли сейчас месячные.
  // Граница фаз включает последний день фазы: день menstruation_end ещё относится
  // к менструальной фазе (аналогично ovulation_end — к овуляции, см. ниже),
  // поэтому сравнение через +1 сутки.
  if (refTime <= menstruationEndDate.getTime() + 86400000) {
    return {
      phase: 'menstrual',
      dayNumber: Math.floor((refTime - startDate.getTime()) / 86400000) + 1,
      startDate,
      endDate: menstruationEndDate,
      isEstimated: mensesEndEstimated,
    };
  }

  // Ищем следующее начало месячных (для расчёта овуляции и конца цикла)
  const nextMenstruationStart = sortedEvents
    .filter(
      (e) =>
        e.event_type === 'menstruation_start' &&
        normalizeDate(e.event_date).getTime() > startDate.getTime()
    )
    .shift();

  // Определяем даты овуляции
  let ovulationStart: Date;
  let ovulationEnd: Date;
  let isEstimatedOvulation = false;

  const userOvulationStart = sortedEvents
    .filter(
      (e) =>
        e.event_type === 'ovulation_start' &&
        normalizeDate(e.event_date).getTime() >= startDate.getTime()
    )
    .pop();

  const userOvulationEnd = sortedEvents
    .filter(
      (e) =>
        e.event_type === 'ovulation_end' &&
        normalizeDate(e.event_date).getTime() >= startDate.getTime()
    )
    .pop();

  if (userOvulationStart && userOvulationEnd) {
    ovulationStart = normalizeDate(userOvulationStart.event_date);
    ovulationEnd = normalizeDate(userOvulationEnd.event_date);
  } else if (nextMenstruationStart) {
    // Автоматический расчёт: овуляция = следующее начало - lutealLength
    const nextStartTime = normalizeDate(nextMenstruationStart.event_date).getTime();
    ovulationStart = normalizeDate(new Date(nextStartTime - lutealLength * 86400000));
    ovulationEnd = normalizeDate(new Date(ovulationStart.getTime() + 86400000)); // 1 день овуляции
    isEstimatedOvulation = true;
  } else {
    // Если следующего начала нет, предполагаем стандартный цикл 28 дней
    const estimatedNextStart = normalizeDate(new Date(startDate.getTime() + 28 * 86400000));
    ovulationStart = normalizeDate(
      new Date(estimatedNextStart.getTime() - lutealLength * 86400000)
    );
    ovulationEnd = normalizeDate(new Date(ovulationStart.getTime() + 86400000));
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
      ? normalizeDate(nextMenstruationStart.event_date)
      : normalizeDate(new Date(startDate.getTime() + 28 * 86400000));

    return {
      phase: 'luteal',
      dayNumber: Math.floor((refTime - startDate.getTime()) / 86400000) + 1,
      startDate: normalizeDate(new Date(ovulationEnd.getTime() + 86400000)),
      endDate: cycleEndDate,
      isEstimated: isEstimatedOvulation || !nextMenstruationStart,
    };
  }

  // Иначе мы в фолликулярной фазе (после месячных, до овуляции)
  return {
    phase: 'follicular',
    dayNumber: Math.floor((refTime - startDate.getTime()) / 86400000) + 1,
    startDate: normalizeDate(new Date(menstruationEndDate.getTime() + 86400000)),
    endDate: ovulationStart,
    isEstimated: isEstimatedOvulation || mensesEndEstimated,
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
    (a, b) => normalizeDate(a.event_date).getTime() - normalizeDate(b.event_date).getTime()
  );
  const targetTime = normalizeDate(targetDate).getTime();

  const lastMenstruationStart = sortedEvents
    .filter(
      (e) =>
        e.event_type === 'menstruation_start' && normalizeDate(e.event_date).getTime() <= targetTime
    )
    .pop();

  if (!lastMenstruationStart) return null;

  const startDate = normalizeDate(lastMenstruationStart.event_date);

  // FD11-5: тот же оценочный конец месячных, что и в calculateCyclePhases
  const { end: menstruationEndDate } = resolveMenstruationEnd(sortedEvents, startDate);

  if (targetTime <= menstruationEndDate.getTime() + 86400000) {
    return 'menstrual';
  }

  const nextMenstruationStart = sortedEvents
    .filter(
      (e) =>
        e.event_type === 'menstruation_start' &&
        normalizeDate(e.event_date).getTime() > startDate.getTime()
    )
    .shift();

  let ovulationStart: Date;
  let ovulationEnd: Date;

  const userOvulationStart = sortedEvents
    .filter(
      (e) =>
        e.event_type === 'ovulation_start' &&
        normalizeDate(e.event_date).getTime() >= startDate.getTime()
    )
    .pop();
  const userOvulationEnd = sortedEvents
    .filter(
      (e) =>
        e.event_type === 'ovulation_end' &&
        normalizeDate(e.event_date).getTime() >= startDate.getTime()
    )
    .pop();

  if (userOvulationStart && userOvulationEnd) {
    ovulationStart = normalizeDate(userOvulationStart.event_date);
    ovulationEnd = normalizeDate(userOvulationEnd.event_date);
  } else if (nextMenstruationStart) {
    const nextStartTime = normalizeDate(nextMenstruationStart.event_date).getTime();
    ovulationStart = normalizeDate(new Date(nextStartTime - lutealLength * 86400000));
    ovulationEnd = normalizeDate(new Date(ovulationStart.getTime() + 86400000));
  } else {
    const estimatedNextStart = normalizeDate(new Date(startDate.getTime() + 28 * 86400000));
    ovulationStart = normalizeDate(
      new Date(estimatedNextStart.getTime() - lutealLength * 86400000)
    );
    ovulationEnd = normalizeDate(new Date(ovulationStart.getTime() + 86400000));
  }

  if (targetTime >= ovulationStart.getTime() && targetTime <= ovulationEnd.getTime() + 86400000) {
    return 'ovulation';
  }
  if (targetTime > ovulationEnd.getTime() + 86400000) {
    return 'luteal';
  }

  return 'follicular';
}
