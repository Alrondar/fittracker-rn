-- ILL-Q7 (продолжение) · румынская тяга с гантелью и доворотом корпуса, вердикт 3B.
--
-- Владелец выбрал постановку, в которой таз раскрывается следом за плечами к рабочей
-- ноге (см. `spark-output/export/wave1-spec-1.md §3`): в таком варианте часть работы
-- уходит с бицепса бедра на ягодичную рабочей стороны, поэтому большая ягодичная
-- повышается до целевой мышцы.
--
-- Blast-radius проверен до записи: строка не используется ни в одной программе
-- (`program_exercises` 0) и ни в одной завершённой тренировке (`workout_exercises` 0),
-- то есть задним числом перерасчёта нагрузки по мышцам нет. Меняются только будущие
-- представления: `src/utils/programMuscleLoad.ts` и `ProgramMuscleMap.tsx` (карта
-- нагрузки программы), `src/engine/warmupPlan.ts` + `warmupService.ts` (подбор
-- разминки), `src/engine/alternatives.ts` (чем заменить), `muscleStatsService.ts`
-- и `weeklySummaryService.ts` (статистика по мышцам). Значение «большая ягодичная»
-- валидно — у 52 позиций каталога оно уже стоит в `primary_muscles`.
--
-- Реверс:
--   UPDATE exercises SET primary_muscles = array['бицепс бедра'],
--     secondary_muscles = array['большая ягодичная','косые мышцы живота','разгибатели спины','средняя ягодичная']
--     WHERE name_eng = 'Rotational Romanian Deadlift';

update exercises set
  primary_muscles = array['бицепс бедра', 'большая ягодичная'],
  secondary_muscles = array['косые мышцы живота', 'разгибатели спины', 'средняя ягодичная']
where name_eng = 'Rotational Romanian Deadlift';
