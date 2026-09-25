-- ============================================================================
-- FD-SEED-1: починка данных готовых (seeded) программ и их пользовательских копий.
-- Найдено ре-аудитом 25.09.2026 по проду (read-only SQL), три дефекта + одна
-- объёмная правка.
--
-- Область действия: шаги 1-3 (ремонт данных) применяются и к seeded-программам,
--   и к копиям пользователей — копия наследует те же битые id/имена при
--   copy_program_for_user, и в копиях safety-фильтр сломан одинаково.
--   Это безопасно, потому что UI не даёт пользователю произвольно переименовать
--   упражнение: useProgramEditor/replaceExercise всегда пишет exercise_name
--   из каталога вместе с exercise_id → любое расхождение = дефект, а не авторский
--   текст. Объём (sets/reps/rest/intensity) в шагах 1-3 НЕ трогается.
-- Шаг 4 (ребаланс объёмов) — ТОЛЬКО seeded-программы (created_by IS NULL),
--   пользовательские объёмы не меняем.
--
-- Blast-radius (проверено прод-запросами 25.09):
--   seeded: Full Body — Старт / PPL Классический / Upper/Lower / PPLUL : workouts = 0;
--           StrongLifts 5×5 : 24 workouts (данные snapshot-нуты в workout_exercises —
--           правка программы их НЕ меняет); PPL 6-day : 48 workouts, 0 строк в
--           workout_exercises (пустые плановые оболочки).
--   копии: 16 строк с NULL id + 106 строк с дрейфом имени у 4 пользователей.
--
-- Откат: реверс = update program_exercises set exercise_id = null где проставлено
--   (список имён: 'Подъем гантелей на бицепс стоя', 'Ягодичный мостик со штангой');
--   для шага 2 — вернуть id на 'Махи гантели перед собой'; для шага 3 — см.
--   исходные ярлыки в этом файле ('Румынская тяга', 'Становая тяга',
--   'Жим ногами в тренажере', 'Сгибание рук на бицепс «Молот»', 'Махи гантели в стороны');
--   для шага 4 — вернуть sets: 3 (фазы 1-2) и 2 (фаза 3) на перечисленные строки.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Строки упражнений с exercise_id IS NULL (18 в seeded + 16 в копиях).
--    Имя есть в каталоге, id не проставлен. Последствие: injury_exercise_warnings,
--    подбор альтернатив и warmup-маппинг ключуются по exercise_id → для этих строк
--    safety-фильтр не работал; созданная тренировка наследует NULL id.
--    Guard: обновляем только если имя в каталоге однозначно (count = 1).
-- ----------------------------------------------------------------------------
update program_exercises e
   set exercise_id = x.id
  from exercises x
 where e.exercise_id is null
   and x.name = e.exercise_name
   and (select count(*) from exercises x2 where x2.name = e.exercise_name) = 1;

-- ----------------------------------------------------------------------------
-- 2) 18 строк seeded (+ наследники в копиях) «Махи гантели в стороны» указывали на
--    «Махи гантели перед собой». Разные движения: боковая дельта vs передняя.
--    Последствия конкретные: ProgramMuscleMap, primary/secondary_muscles,
--    alternatives и injury-warnings считали жимовое/переднее движение там, где
--    куратор задумал маховое боковое.
--    Intent = ярлык: рядом в тех же программах стоит «Махи гантели в наклоне»
--    (задняя дельта) — классическая связка «боковые + задние», а не «передние».
--    Retarget на канонический каталожный вариант стоя.
-- ----------------------------------------------------------------------------
update program_exercises e
   set exercise_id = (select x.id from exercises x where x.name = 'Махи гантели в стороны стоя' limit 1)
 where e.exercise_name = 'Махи гантели в стороны'
   and exists (select 1 from exercises c
                where c.id = e.exercise_id and c.name = 'Махи гантели перед собой');

-- ----------------------------------------------------------------------------
-- 3) Дрейф exercise_name vs канонический exercises.name
--    (79 строк seeded + 106 в копиях; устаревшие ярлыки: 'Румынская тяга',
--     'Становая тяга', 'Жим ногами в тренажере' с "е" вместо "ё",
--     'Сгибание рук на бицепс «Молот»').
--    DayCard.tsx:157 рендерит именно program_exercises.exercise_name → пользователь
--    видел имя, которого нет в каталоге; поиск/переход в карточку упражнения и
--    импорт по share_code разъезжались. Authoritative source = каталог.
-- ----------------------------------------------------------------------------
update program_exercises e
   set exercise_name = x.name
  from exercises x
 where x.id = e.exercise_id
   and e.exercise_name is distinct from x.name;

-- ----------------------------------------------------------------------------
-- 4) PPLUL: press:pull = 1.53/1.45/1.50 (фазы 1/2/3) против 1.16–1.25 у остальных
--    программ каталога. Тяговых не хватает при 5 сессиях в неделю.
--    Правка только по low/medium-аксессуарам, базовые тяжелые движения не тронуты.
--    Ожидаемый результат: 1.24 / 1.17 / 1.29.
--    Исходные значения (для откатa): все перечисленные строки = 3 подхода (фазы 1-2)
--    или 2 подхода (фаза 3).
-- ----------------------------------------------------------------------------
-- фаза 1: жимовые аксессуары 3->2, тяговые 3->4
update program_exercises e set "sets" = 2
  from program_days d join programs p on p.id = d.program_id
  join program_phases ph on ph.id = d.phase_id
 where d.id = e.program_day_id and p.created_by is null and p.name = 'PPLUL'
   and ph.position = 1 and e.exercise_name in
       ('Разгибание рук на верхнем блоке (канат)',
        'Разводка в кроссовере (сведение рук)',
        'Французский жим сидя');

update program_exercises e set "sets" = 4
  from program_days d join programs p on p.id = d.program_id
  join program_phases ph on ph.id = d.phase_id
 where d.id = e.program_day_id and p.created_by is null and p.name = 'PPLUL'
   and ph.position = 1 and e.exercise_name in
       ('Подъем штанги на бицепс стоя',
        'Тяга верхнего блока к груди широким хватом');

-- фаза 2: дополнительно боковые махи 3->2 (16 подходов махов/нед в 6-day — там они
-- на 2 дня разнесены; здесь один Push-день, второй мах уже есть на Тяге)
update program_exercises e set "sets" = 2
  from program_days d join programs p on p.id = d.program_id
  join program_phases ph on ph.id = d.phase_id
 where d.id = e.program_day_id and p.created_by is null and p.name = 'PPLUL'
   and ph.position = 2 and e.exercise_name in
       ('Разгибание рук на верхнем блоке (канат)',
        'Разводка в кроссовере (сведение рук)',
        'Французский жим сидя',
        'Махи гантели в стороны стоя');

update program_exercises e set "sets" = 4
  from program_days d join programs p on p.id = d.program_id
  join program_phases ph on ph.id = d.phase_id
 where d.id = e.program_day_id and p.created_by is null and p.name = 'PPLUL'
   and ph.position = 2 and e.exercise_name in
       ('Подъем штанги на бицепс стоя',
        'Тяга верхнего блока к груди широким хватом');

-- фаза 3 (дилоуд): баланс тяги 2->3, жим не трогаем (объём и так минимальный)
update program_exercises e set "sets" = 3
  from program_days d join programs p on p.id = d.program_id
  join program_phases ph on ph.id = d.phase_id
 where d.id = e.program_day_id and p.created_by is null and p.name = 'PPLUL'
   and ph.position = 3 and e.exercise_name in
       ('Подъем штанги на бицепс стоя',
        'Тяга верхнего блока к груди широким хватом');
