// Позиция 8: чистое правило напоминания о тренировке. Без react-native, поэтому
// покрыто офлайн-проверкой scripts/check-reminders.ts.
import { fromDateKey } from './dateKey';
import { pluralWord } from './plural';

export interface ReminderSettings {
  enabled: boolean;
  hour: number;
  minute: number;
  /** Сколько дней без завершённой тренировки считаются пропуском. */
  idleDays: number;
}

export const REMINDER_DEFAULTS: ReminderSettings = {
  // По умолчанию выключено: право на уведомления запрашивается только при включении.
  enabled: false,
  hour: 19,
  minute: 0,
  idleDays: 3,
};

export interface ReminderContext {
  /** Локальный ключ дня, для которого строится план: YYYY-MM-DD. */
  dateKey: string;
  /** Индекс дня недели по getDay(): 0 — воскресенье … 6 — суббота. */
  weekday: number;
  /** Расписание активной программы — короткие имена дней ('Пн'…'Вс'). Пусто = не задано. */
  schedule: string[] | null;
  /** По указателю программы есть незакрытое занятие (то есть «этот день — тренировочный»). */
  workoutDue: boolean;
  programName: string | null;
  /** Ключ дня последней завершённой тренировки; пусто — если завершённых не было вовсе. */
  lastFinishedKey: string | null;
}

export interface ReminderPlan {
  kind: 'training-day' | 'idle-days';
  title: string;
  body: string;
}

const WEEKDAY_BY_LABEL: Record<string, number> = {
  Пн: 1,
  Вт: 2,
  Ср: 3,
  Чт: 4,
  Пт: 5,
  Сб: 6,
  Вс: 0,
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Целое число дней между двумя ключами (считается по полночным UTC, чтобы переход
 *  летнего времени не сдвигал разницу). */
export function daysBetweenKeys(fromKey: string, toKey: string): number {
  const from = Date.parse(`${fromKey}T00:00:00Z`);
  const to = Date.parse(`${toKey}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.round((to - from) / DAY_MS);
}

/** Расписание не мешает тренировке в этот день, если день в списке или список пуст. */
export function scheduleAllowsWeekday(schedule: string[] | null, weekday: number): boolean {
  if (!schedule || schedule.length === 0) return true;
  return schedule.some((label) => WEEKDAY_BY_LABEL[label] === weekday);
}

export function planReminder(
  settings: ReminderSettings,
  ctx: ReminderContext
): ReminderPlan | null {
  if (!settings.enabled) return null;

  if (ctx.workoutDue && scheduleAllowsWeekday(ctx.schedule, ctx.weekday)) {
    return {
      kind: 'training-day',
      title: 'Тренировка сегодня',
      body: ctx.programName
        ? `Сегодня день по плану — «${ctx.programName}»`
        : 'Сегодня день тренировки по плану',
    };
  }

  // Правило пропуска считается только от реально завершённой тренировки:
  // у нового пользователя без единой завершённой напоминаний нет.
  if (!ctx.lastFinishedKey) return null;

  const idleDays = daysBetweenKeys(ctx.lastFinishedKey, ctx.dateKey);
  if (idleDays < settings.idleDays) return null;

  return {
    kind: 'idle-days',
    title: 'Давно без тренировки',
    body: `Завершённых тренировок нет уже ${pluralWord(idleDays, ['день', 'дня', 'дней'])}`,
  };
}

/** Ближайшее срабатывание: сегодня в выбранное время, если оно ещё не прошло, иначе завтра. */
export function nextFireDate(settings: ReminderSettings, now: Date): Date {
  const fire = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    settings.hour,
    settings.minute,
    0,
    0
  );
  if (fire.getTime() <= now.getTime()) {
    fire.setDate(fire.getDate() + 1);
  }
  return fire;
}

export function weekdayOfDateKey(dateKey: string): number {
  return fromDateKey(dateKey).getDay();
}
