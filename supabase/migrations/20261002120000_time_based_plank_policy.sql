-- FD-SEED-2a: тайм-упражнения в seeded-программах → progression_policy='time_based'
--
-- Проблематика: `program_exercises.reps_range` у планок хранит тайминг («30 сек»),
-- а все строки жили на default 'linear' — ветка increase пыталась «поднимать вес»
-- после 30 секунд удержания. Движок уже поддерживает policy 'time_based'
-- (ветки TIME_ALL_MAX / TIME_HOLD: «держим время → усложняем вариант»).
--
-- Вердикт владельца 02.10.2026: путь (1) — помечать строки, БЕЗ DDL и без нового
-- свойства каталога. Таймдинговые упражнения в каталоге ровно 2:
-- «Планка на локтях (классическая)», «Боковая планка»
-- (проверено read-only: других reps_range с «сек» в prod нет).
--
-- Blast radius на момент применения: 16 строк program_exercises + 28 строк
-- workout_exercises (копии расписанных/исторических тренировок; для completed
-- строк policy — inert, движок читает его только при построении следующей).
-- Все 44 были на default 'linear'.
--
-- Откат:
--   UPDATE program_exercises pe SET progression_policy = 'linear'
--     FROM exercises e WHERE pe.exercise_id = e.id
--     AND e.name IN ('Планка на локтях (классическая)','Боковая планка')
--     AND pe.progression_policy = 'time_based';
--   (аналогично workout_exercises)

UPDATE program_exercises pe
SET    progression_policy = 'time_based'
FROM   exercises e
WHERE  pe.exercise_id = e.id
AND    e.name IN ('Планка на локтях (классическая)', 'Боковая планка')
AND    pe.progression_policy <> 'time_based';

UPDATE workout_exercises we
SET    progression_policy = 'time_based'
FROM   exercises e
WHERE  we.exercise_id = e.id
AND    e.name IN ('Планка на локтях (классическая)', 'Боковая планка')
AND    we.progression_policy <> 'time_based';
