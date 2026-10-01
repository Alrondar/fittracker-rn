# Аудит женского функционала (29.09, после CRASH-FIX чипа цикла)

Метод: карта вызовов (grep) + чтение всех потребителей цикла/пола; кода не менял.

## 1. Что является «женским» функционалом и используется ли

| Фича | Где | Вызывается? | Статус |
|---|---|---|---|
| Чип фазы цикла на Главной | StatusCard.tsx:406–432 | да (female + currentPhase) | CRASH-FIX 29.09 применён (был ключ темы вместо цвета → rgba(NaN) → fatal release) |
| Цикл-чек-ин из чипа | StatusCard:600 → CycleCheckInSheet | да, `events` передаются корректно | ок |
| Цикл-чек-ин из ReadinessSheet | ReadinessSheet.tsx:284 | да, но `events={[]}` | CYC-1 (ниже) |
| Секция «Цикл» в профиле (календарь + настройки + чек-ин) | profile.tsx:401–432, 635–648 | да | ок, цвета через `colors[getCyclePhaseColor(...)]` — канон соблюдён |
| Движок: hold повышения веса при luteal/ovulation | engine/progression.ts:349–355, гейт только для `action==='increase'` (FD11-9) | да: workout/[id].tsx:125–135 → ProgressionContext.cyclePhase → calculateProgression | формула корректна, «downgrade» decrease не трогает |
| KBЖУ для женского профиля | utils/macroCalculator.ts:62–66 (Mifflin −161), 53–59 (Katch-McArdle 370+21.6·LBM) | да, goals-экран | константы верны; clamp белка/жира адекватны |
| Силовые нормативы female | utils/strengthStandards.ts:62 (other/prefer_not_to_say → male — сознательно) | да, Progress/PR | таблица используется |
| Female-силуэты BodyMap/MuscleLoadMap/InjuryBodyMap | constants/muscleOutlines.ts и др. | да | только отрисовка |
| Автоматическая readiness по циклу | — | **нет** (readinessService цикл не учитывает) | не баг — так и не проектировалось |

Dead code в цикл-модулях не найден: `calculateCyclePhases` (useCycle), `getPhaseForDate` (CycleCalendar), label/color-хелперы — все потребители живые.

## 2. Находки

### CYC-2 ✅ РЕШЕНО 29.09 (вариант A+CTA, ожидает device-прогона и коммита)
Реализовано: `CyclePhase` += `'delayed'`; `calculateCyclePhases`/`getPhaseForDate` возвращают delayed, если нет следующего `menstruation_start` и дата > ожидаемое начало (среднее по реальным интервалам старта, guard 15–60 дн, fallback 28) + `DELAY_GRACE_DAYS=7`; label «Возможна задержка», цвет textSecondary (нейтральный), легена календаря дополнена; движок не тронут по сути: hold только на `=== 'luteal'|'ovulation'`, delayed проходит без гейта (union расширен). Прогон формулы на данных 5b770d3b: 29.09 = luteal day35 (последний день grace), 01.10 → delayed; multi-start средняя 29 дн → delayed с 05.10. CTA = тап по чипу уже открывает CycleCheckInSheet.

Исходная проблема (для истории): после `menstruation_start` без следующего начала фаза была **luteal навсегда** — чип «День 34 · Лютеиновая» растёт бесконечно, календарь красит октябрь, движок вечно держит «без повышения веса» (progression.ts:349).

### CYC-1 ✅ РЕШЕНО 29.09 (ждёт коммита/девайса)
`src/components/dashboard/ReadinessSheet.tsx`: добавлен `useCycle(gender)` (queries дедуплицируются с StatusCard по ключу `['cycleEvents', userId]`), в `CycleCheckInSheet` передаются реальные `cycleEvents` вместо `[]` — «Обновить/Удалить отметку» теперь видны и из шторки готовности.

### CYC-3 ✅ РЕШЕНО 29.09 (ждёт коммита/девайса)
`src/utils/dateKey.ts`: новый канон-хелпер `fromDateKey('YYYY-MM-DD') → локальный Date (полдень)`; `CycleCheckInSheet.tsx:221` рендерит дату через него вместо `new Date(defaultDate)` (UTC-полдень → «вчера» в западных TZ). tsc/eslint 0.

## 3. Не проверено живьём на устройстве (чек-лист для прогона тем же женским аккаунтом)

1. Чип цикла после фикса: цвет фона/рамки/капли = цвет фазы (luteal→primary); ERROR в Metro исчез.
2. Чек-ин: отметить «Менструация — Начало» сегодня → чип переключается на менструальную (error-красный), день 1; кнопка «Конец» → фолликулярная (success).
3. Тот же чек-ин из ReadinessSheet: после CYC-1 — должна появляться «Обновить/Удалить отметку»; сейчас не появится (проверить, что это единственный差异).
4. Календарь в профиле: раскраска прошлых/будущих дней, edit-mode удаление события.
5. Настройки: выбрать лютеиновую 10 и 21 → сохранить → чип/календарь пересчитали овуляцию; значение вне 10–21 недостижимо (только чипы), DB CHECK 10..21 согласован.
6. Экран тренировки с luteal-фазой: рекомендация не повышает вес и показывает текст «Лютеиновая фаза цикла — без повышения веса» (progression.ts:350); после CYC-2 решение — поведение сменится.
7. КБЖУ на goals для female: BMR−161, при % жира — Кэтча; сравнить с профилем Маргариты (1934 ккал при 67.7 кг goal lose — правдоподобно).
