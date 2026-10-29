// Позиция 8-1: офлайн-проверка чистого правила напоминания.
// Запуск из корня: npx tsx scripts/check-reminders.ts
import {
  REMINDER_DEFAULTS,
  daysBetweenKeys,
  nextFireDate,
  planReminder,
  scheduleAllowsWeekday,
  weekdayOfDateKey,
  type ReminderContext,
  type ReminderSettings,
} from '../src/utils/reminders';

let ran = 0;
let failed = 0;
function check(name: string, passed: boolean, detail = '') {
  ran++;
  if (!passed) failed++;
  console.log(`${passed ? 'ок      ' : 'ВАЛЕН   '}${name}${detail ? ' — ' + detail : ''}`);
}

const on: ReminderSettings = { ...REMINDER_DEFAULTS, enabled: true };
// Опорные даты: 2026-10-26 — понедельник, 2026-10-29 — четверг.
const MON = '2026-10-26';
const THU = '2026-10-29';

function ctx(patch: Partial<ReminderContext> = {}): ReminderContext {
  return {
    dateKey: THU,
    weekday: weekdayOfDateKey(THU),
    // Расписание по умолчанию включает сам проверяемый день, а пауза — мала,
    // чтобы каждое упражнение теста меняло ровно одно условие.
    schedule: ['Чт'],
    workoutDue: true,
    programName: 'Рекомпозиция — 3 дня, акцент грудь',
    lastFinishedKey: '2026-10-28',
    ...patch,
  };
}

check(
  'выключенное напоминание не планирует ничего',
  planReminder({ ...on, enabled: false }, ctx()) === null
);

const trainingDay = planReminder(on, ctx());
check(
  'день по плану и занятие незакрыто → план «тренировка сегодня»',
  trainingDay?.kind === 'training-day',
  JSON.stringify(trainingDay)
);
check(
  'текст называет программу',
  !!trainingDay && trainingDay.body.includes('Рекомпозиция'),
  trainingDay?.body
);

const notToday = planReminder(on, ctx({ workoutDue: false }));
check('не тренировочный день и пауза мала → плана нет', notToday === null);

check(
  'день вне расписания не становится тренировочным',
  planReminder(on, ctx({ schedule: ['Пн', 'Вт'] })) === null &&
    scheduleAllowsWeekday(['Пн', 'Вт'], weekdayOfDateKey(THU)) === false
);

check(
  'расписание не задано → любой тренировочный день подходит',
  planReminder(on, ctx({ schedule: null }))?.kind === 'training-day' &&
    planReminder(on, ctx({ schedule: [] }))?.kind === 'training-day'
);

check(
  'ровно три дня без завершённой → план «давно без тренировки»',
  planReminder(on, ctx({ workoutDue: false, lastFinishedKey: '2026-10-26' }))?.kind === 'idle-days'
);
check(
  'два дня без завершённой → плана нет',
  planReminder(on, ctx({ workoutDue: false, lastFinishedKey: '2026-10-27' })) === null
);
check(
  'без единой завершённой тренировки новичка не пилим',
  planReminder(on, ctx({ workoutDue: false, lastFinishedKey: null })) === null
);
check(
  'завершённая сегодня обнуляет паузу',
  planReminder(on, ctx({ workoutDue: false, lastFinishedKey: THU })) === null
);

const both = planReminder(on, ctx({ workoutDue: true, lastFinishedKey: '2026-10-20' }));
check(
  'при двух подходящих правилах приоритет у дня тренировки',
  both?.kind === 'training-day',
  JSON.stringify(both)
);

const bodies = ['2026-10-28', '2026-10-27', '2026-10-26', '2026-10-18', '2026-10-08'].map(
  (from) => {
    const plan = planReminder(
      // Порог в один день, чтобы проверить склонение на всех числах, а не только
      // тех, что проходят базовые три дня.
      { ...on, idleDays: 1 },
      ctx({ workoutDue: false, schedule: ['Пн'], lastFinishedKey: from })
    );
    return plan?.body ?? '';
  }
);
check(
  'склонение числа дней: 1 день, 2 дня, 3 дня, 11 дней, 21 день',
  bodies[0] === 'Завершённых тренировок нет уже 1 день' &&
    bodies[1] === 'Завершённых тренировок нет уже 2 дня' &&
    bodies[2] === 'Завершённых тренировок нет уже 3 дня' &&
    bodies[3] === 'Завершённых тренировок нет уже 11 дней' &&
    bodies[4] === 'Завершённых тренировок нет уже 21 день',
  bodies.join(' | ')
);

check(
  'пауза считается от дня плана, а не от сегодня',
  planReminder(
    on,
    ctx({
      dateKey: '2026-10-30',
      weekday: weekdayOfDateKey('2026-10-30'),
      workoutDue: false,
      lastFinishedKey: '2026-10-27',
    })
  )?.kind === 'idle-days' &&
    planReminder(
      on,
      ctx({
        dateKey: THU,
        weekday: weekdayOfDateKey(THU),
        workoutDue: false,
        lastFinishedKey: '2026-10-27',
      })
    ) === null
);

check('разница дней по ключам: тот же день = 0', daysBetweenKeys(THU, THU) === 0);
check(
  'разница дней через границу месяца и года считается верно',
  daysBetweenKeys('2026-12-30', '2027-01-02') === 3 && daysBetweenKeys(MON, THU) === 3,
  `${daysBetweenKeys('2026-12-30', '2027-01-02')} / ${daysBetweenKeys(MON, THU)}`
);
check(
  'некорректный ключ даёт нулевую паузу, а не NaN',
  daysBetweenKeys('мусор', THU) === 0 &&
    planReminder(on, ctx({ workoutDue: false, lastFinishedKey: 'мусор' })) === null
);

check(
  'будни и выходные ложатся на индексы getDay',
  weekdayOfDateKey(MON) === 1 && weekdayOfDateKey('2026-10-25') === 0,
  `${weekdayOfDateKey(MON)} / ${weekdayOfDateKey('2026-10-25')}`
);

const noon = new Date(2026, 9, 29, 12, 0, 0, 0);
const sameDay = nextFireDate({ ...on, hour: 19, minute: 0 }, noon);
check(
  'время ещё не наступило → сигнал сегодня',
  sameDay.getDate() === 29 && sameDay.getHours() === 19,
  sameDay.toISOString()
);
const afterFire = new Date(2026, 9, 29, 20, 30, 0, 0);
const nextDay = nextFireDate({ ...on, hour: 19, minute: 0 }, afterFire);
check(
  'время прошло → сигнал завтра в то же время',
  nextDay.getDate() === 30 && nextDay.getHours() === 19,
  nextDay.toISOString()
);
const exact = nextFireDate({ ...on, hour: 19, minute: 0 }, new Date(2026, 9, 29, 19, 0, 0, 0));
check('ровно в назначенное время → уже завтра', exact.getDate() === 30);

console.log(`\nпроверок: ${ran}, провалов: ${failed}`);
process.exit(failed === 0 ? 0 : 1);
