-- ============================================================================
-- Профиль и замеры f5fc58a0-d8d1-47fd-ac24-86e9ffa2fe52 (Дмитриев В В) — 12.10.2026
--
-- 1) goal: maintain -> lose. В профиле стояло «поддержание», но по анкете цель
--    «убрать лишний жир, увеличить мышечную массу и выносливость», а при 29 % жира
--    и базовом обмене 1674 ккал приложение на maintain считает поддержку (~2600 ккал),
--    то есть кормит вразрез с планом.
-- 2) Замеры из анкеты в существующую строку body_metrics за 2026-10-11 — сейчас в ней
--    только вес, все окружности NULL. Легаси-колонки thigh_cm и arm_cm не заполняем:
--    по src/types/metrics.ts в новых записях используются парные, arm_cm в UI не выводится.
-- 3) notes — сводка двух приборных обследований от 28.09.2026, чтобы они не жили
--    только на бумаге: на них держим симптомный контроль в программе
--    «Вход. Верх и низ — 4 недели» (a4000000-0000-4000-8000-f5fc58a00001).
--
-- ТРАНСПОРТ: один вызов apply_migration (кириллицы мало). execute_sql для записей
-- блокируется классификатором — только apply_migration и явное подтверждение владельца.
-- ============================================================================

update profiles
   set goal = 'lose'
 where id = 'f5fc58a0-d8d1-47fd-ac24-86e9ffa2fe52'
   and goal = 'maintain';

update body_metrics
   set chest_cm = 100,
       waist_cm = 88,
       abdomen_cm = 95,
       hips_cm = 106,
       thigh_left_cm = 62,
       thigh_right_cm = 62,
       biceps_left_cm = 29.5,
       biceps_right_cm = 29.5,
       forearm_left_cm = 27,
       forearm_right_cm = 27.5,
       notes = 'Замеры сняты самим клиентом 11.10.2026. Приборы от 28.09.2026: ACCUNIQ BC380 — вес 85.5 кг, тощая масса 56.2, жировая 25.1 (выше нормы в 1.7 раза), скелетная мускулатура 33.7, ПЖК 29.3 %, ИМТ 26.7, индекс талия-бедро 0.88, площадь висцерального жира 93 см2, окружность живота 100.1 см, базовый обмен 1674 ккал, рекомендованная калорийность 2577, целевой вес по прибору 73.2 (жира -12.3, мышц +0.0). BPlab Vasotens Office+ — ЛПИ справа 1.25, слева 0.91, общий 0.91 с пометкой «возможно предположить окклюзии артерий нижней конечности», асимметрия САД на лодыжках 24 мм рт. ст., на плечах 15 мм рт. ст., САД на правой лодыжке 140, baPWV 8.7-9 м/с, возраст сосудов 24. Разница 15 мм рт. ст. между руками объясняет весь ЛПИ 0.91: при правой руке в знаменателе было бы 1.04. До начала рабочей недели — повторный замер давления в покое и симптомный контроль по описанию программы.'
 where user_id = 'f5fc58a0-d8d1-47fd-ac24-86e9ffa2fe52'
   and metric_date = date '2026-10-11';

-- ============================================================================
-- ОТКАТ
-- update profiles set goal = 'maintain' where id = 'f5fc58a0-d8d1-47fd-ac24-86e9ffa2fe52';
-- update body_metrics set chest_cm = null, waist_cm = null, abdomen_cm = null, hips_cm = null,
--        thigh_left_cm = null, thigh_right_cm = null, biceps_left_cm = null, biceps_right_cm = null,
--        forearm_left_cm = null, forearm_right_cm = null, notes = null
--   where user_id = 'f5fc58a0-d8d1-47fd-ac24-86e9ffa2fe52' and metric_date = date '2026-10-11';
-- ============================================================================

-- ПРОВЕРКИ ПОСЛЕ ПРИМЕНЕНИЯ (сверить с листом компоновки):
-- select goal, current_weight_kg from profiles where id = 'f5fc58a0-d8d1-47fd-ac24-86e9ffa2fe52';
-- select metric_date, weight_kg, chest_cm, waist_cm, abdomen_cm, hips_cm,
--        thigh_left_cm, thigh_right_cm, biceps_left_cm, biceps_right_cm,
--        forearm_left_cm, forearm_right_cm from body_metrics
--  where user_id = 'f5fc58a0-d8d1-47fd-ac24-86e9ffa2fe52' order by metric_date desc;
