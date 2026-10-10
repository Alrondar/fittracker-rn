-- ============================================================================
-- ILL-Q2: дедупликация каталога — 16 пар «дубль ↔ позиция, чей кадр был одолжен».
--
-- Правило выбора (вердикт владельца 08.10): оставить один наиболее полный вариант
-- по описанию и содержанию; если позиция используется в программах — оставляем её;
-- при сопоставимом содержании (разница < 60 баллов) предпочитается строка `approved`.
-- Пары и обоснование по каждой: spark-output/export/dedupe-pairs.json
-- (пересобирается: python spark-output/export/build-dedupe-plan.py --emit-migration)
--
-- Blast-radius (read-only замер по проду 08.10, до записи):
--   workout_exercises: 28 строк перепривязывается, из них 12 в завершённых
--     тренировках — история НЕ удаляется, только меняет exercise_id;
--   program_exercises: 17 строк;
--   задвоений внутри одной тренировки/дня после перепривязки: 0 (проверено —
--     ни в одном дне/тренировке не оставляемая позиция уже не встречается);
--   exercise_relationships: 169 рёбер с удаляемой стороны, из них 91
--     уже есть у оставляемой (сливаются через on conflict do nothing) и 3
--     идут между парой (становятся self-link → удаляются);
--   exercise_equipment: 24 связей, 15 коллизий; injury_exercise_warnings:
--     9, 4 коллизий; injury_exercise_restrictions: 0; exercise_media: 16
--     (таблицу приложение не читает).
--   Итого удаляемых строк в exercises: 16 (842 → 826).
--
-- Побочный эффект для поисковой выдачи: из каталога уходят 16 названий, по которым
-- `search_exercises` мог находить строку; она остаётся находимой под именем
-- оставляемой позиции и её алиасами (алиасы сливаются в шаге 3).
--
-- Откат (полный, по архиву):
--   1) вернуть строки (в архиве те же колонки, что в exercises, плюс merged_into и
--      removed_at — потому список колонок перечислен явно):
--      INSERT INTO public.exercises (id, name, primary_muscles, secondary_muscles,
--            technique, benefits, risks, settings, media_url, created_at, reps_range,
--            category, name_eng, can_be_activation, short_name, aliases,
--            movement_pattern, difficulty, tags, status, updated_at, search_text)
--      SELECT id, name, primary_muscles, secondary_muscles, technique, benefits, risks,
--             settings, media_url, created_at, reps_range, category, name_eng,
--             can_be_activation, short_name, aliases, movement_pattern, difficulty,
--             tags, status, updated_at, search_text
--      FROM public.exercises_removed_archive a
--      WHERE NOT EXISTS (SELECT 1 FROM public.exercises e WHERE e.id = a.id);
--   2) вернуть перепривязку:
--      UPDATE public.workout_exercises w SET exercise_id = a.merged_into
--        FROM public.exercises_removed_archive a WHERE w.exercise_id = a.id
--        AND a.merged_into IS NOT NULL;   -- то же для program_exercises;
--   3) вернуть рёбра из exercise_edges_archive.payload (to_jsonb снимок каждой строки);
--   4) проверить количество: SELECT count(*) FROM public.exercises;  -- ждём 842.
--
-- Файл применяется ОДНИМ прогоном (temp-таблица merge_map живёт в сессии).
-- ============================================================================

create temp table merge_map (drop_id uuid not null, keep_id uuid not null);
insert into merge_map (drop_id, keep_id) values
  ('734abaa7-14b5-4c97-83d2-b282252474b8'::uuid, 'c0e0e17f-0a8a-499f-b7ea-c1730624ef35'::uuid),
  ('3ab76209-b758-4891-8a42-47247bff4d6a'::uuid, 'c28b458a-7382-44ba-a638-0432ad19bfda'::uuid),
  ('c8e0780e-910f-49f9-b183-f988c40f53d7'::uuid, 'b84d37c1-d58e-470f-857b-fbbb74c12637'::uuid),
  ('c057f49c-c0b0-41a9-9eba-0c6b878a027b'::uuid, '0a90e00b-0029-4bf3-b40f-0a2ca9cfb753'::uuid),
  ('7509a30c-62a8-4477-a76a-337d51aa0c9c'::uuid, '2f6cf819-31a7-4225-9da5-f4e5db783c06'::uuid),
  ('5944baaf-857c-4cff-8c14-52cdc3779f9c'::uuid, 'ace537ec-f0c6-4ae7-b47d-ca3bacd8188e'::uuid),
  ('28f26df8-08b0-44f8-b7a0-d4b41d900aea'::uuid, 'fef4cc00-7072-4ae5-8115-e0828a3a1e99'::uuid),
  ('48bd811a-8f7c-418c-af26-8200a80aba5d'::uuid, '85dd4a2c-1d51-4e21-a237-95c843f54d5a'::uuid),
  ('f68c00b7-aa33-44ab-ab99-27d88ed643f0'::uuid, 'b9ff1347-c093-44f5-a9df-576b28b3c468'::uuid),
  ('f4939814-2521-46da-8104-d68f801d9026'::uuid, '7348da65-09c6-4acc-84d3-6b63845bff98'::uuid),
  ('9a5c2641-6093-4320-a924-86d8f0ce6693'::uuid, 'd8a63040-8208-40f8-881c-e2c198c6187b'::uuid),
  ('64771a50-2672-4335-acc8-5dd62a2b250c'::uuid, 'be4f02cc-6958-4592-8728-820569b8710d'::uuid),
  ('68890f36-b8a7-4bd5-ad42-5f4f49713220'::uuid, 'd141a282-3f8b-40aa-91d0-9c89d56d3667'::uuid),
  ('f33c5ff4-0b9f-4d76-acc8-8ebd296fc151'::uuid, '4dbeb4a6-4c63-4342-93c9-8c007b886d9f'::uuid),
  ('fbd2f9a5-f35c-4bd1-ad0a-6eda6244f91b'::uuid, '2d072094-7f50-4a4f-bae2-a3b0b004d9ee'::uuid),
  ('78401ccf-8419-45da-97fb-4cdcdca204b7'::uuid, '1a9becb4-a26e-4a84-b7b0-d0a2a8fbc9e5'::uuid),
  ('41c227ca-71f5-4c62-b1a7-4105d15f316d'::uuid, '8a3dd8f1-0d0a-485b-a31a-75921af08be9'::uuid);

-- 1. Архив удалаемых строк (идемпотентно: повторный прогон не дублирует снимок)
create table if not exists public.exercises_removed_archive
  (like public.exercises including defaults);
alter table public.exercises_removed_archive add column if not exists merged_into uuid;
alter table public.exercises_removed_archive add column if not exists removed_at timestamptz;
-- Архив — служебная таблица: без RLS её прочитал бы anon (в public по дефолту
-- Supabase выдаются гранты anon/authenticated). Каталог публичный, но удалённые
-- строки наружу показывать нечем, поэтому RLS включаем и политик не вешаем.
alter table public.exercises_removed_archive enable row level security;
revoke all on public.exercises_removed_archive from anon, authenticated;

insert into public.exercises_removed_archive
select e.*, m.keep_id, now()
from public.exercises e
join merge_map m on m.drop_id = e.id
where not exists (select 1 from public.exercises_removed_archive a where a.id = e.id);

-- 2. Архив рёбер, которые будут перезаписаны или удалены
create table if not exists public.exercise_edges_archive (
  src_table text not null, src_id text not null, payload jsonb not null,
  merged_into uuid, removed_at timestamptz default now());
alter table public.exercise_edges_archive enable row level security;
revoke all on public.exercise_edges_archive from anon, authenticated;

insert into public.exercise_edges_archive (src_table, src_id, payload, merged_into)
select 'exercise_relationships', er.id::text, to_jsonb(er),
       case when er.exercise_id = m.keep_id then m.drop_id else m.keep_id end
from public.exercise_relationships er join merge_map m
  on er.exercise_id = m.drop_id or er.related_exercise_id = m.drop_id
where not exists (select 1 from public.exercise_edges_archive a
                  where a.src_table = 'exercise_relationships' and a.src_id = er.id::text);

insert into public.exercise_edges_archive (src_table, src_id, payload, merged_into)
select 'exercise_equipment', (ee.exercise_id::text || '|' || ee.equipment_id::text), to_jsonb(ee), m.keep_id
from public.exercise_equipment ee join merge_map m on m.drop_id = ee.exercise_id
where not exists (select 1 from public.exercise_edges_archive a
                  where a.src_table = 'exercise_equipment' and a.src_id = (ee.exercise_id::text || '|' || ee.equipment_id::text));

insert into public.exercise_edges_archive (src_table, src_id, payload, merged_into)
select 'injury_exercise_warnings', iw.id::text, to_jsonb(iw), m.keep_id
from public.injury_exercise_warnings iw join merge_map m on m.drop_id = iw.exercise_id
where not exists (select 1 from public.exercise_edges_archive a
                  where a.src_table = 'injury_exercise_warnings' and a.src_id = iw.id::text);

-- 3. Оставляемая строка наследует английское имя и ссылку на кадр, если у самой их нет.
--    Без этого шаг 6 оставил бы позицию без name_eng (а имя нужно для паттерна URL).
update public.exercises k
set name_eng = coalesce(k.name_eng, d.name_eng),
    media_url = coalesce(k.media_url, d.media_url)
from merge_map m join public.exercises d on d.id = m.drop_id
where k.id = m.keep_id and (k.name_eng is null or k.media_url is null);

-- 4. Алиасы: объединяем без дублей (поиск по алиасам — CAT-Q7)
update public.exercises k
set aliases = coalesce((select array_agg(distinct x order by x)
               from unnest(coalesce(k.aliases, '{}'::text[]) || coalesce(d.aliases, '{}'::text[])) x),
               '{}'::text[])   -- array_agg по пустому набору даёт NULL, а на aliases стоит NOT NULL
from merge_map m join public.exercises d on d.id = m.drop_id
where k.id = m.keep_id;

-- 5. Рёбра-замены: переносим на оставляемую строку, пропуская self-link и коллизии.
--    where a <> b обязателен: на таблице висит CHECK (exercise_id <> related_exercise_id),
--    а рёбра, идущие между самой парой (замерено — 3), после подмены превращаются в
--    ссылку позиции на себя. ON CONFLICT от этого не спасает: это не дубль, а нарушение
--    CHECK. Смысл такой связи после слияния пустой — позиция не может быть вариацией сама
--    себе, поэтому она просто не переносится (строка-первоисточник всё равно удалится каскадом).
insert into public.exercise_relationships
       (exercise_id, related_exercise_id, relation_type, confidence, status)
select a, b, relation_type, confidence, status
from (
  select case when er.exercise_id = m.drop_id then m.keep_id else er.exercise_id end           as a,
         case when er.related_exercise_id = m.drop_id then m.keep_id else er.related_exercise_id end as b,
         er.relation_type, er.confidence, er.status
  from public.exercise_relationships er join merge_map m
    on er.exercise_id = m.drop_id or er.related_exercise_id = m.drop_id
) s
where a <> b
on conflict (exercise_id, related_exercise_id, relation_type) do nothing;

-- 6. Снаряжение и предупреждения — так же
insert into public.exercise_equipment (exercise_id, equipment_id)
select m.keep_id, ee.equipment_id
from public.exercise_equipment ee join merge_map m on m.drop_id = ee.exercise_id
on conflict (exercise_id, equipment_id) do nothing;

insert into public.injury_exercise_warnings
       (body_part, muscle_group, warning_level, recommendation, exercise_id, injury_type, level)
select iw.body_part, iw.muscle_group, iw.warning_level, iw.recommendation, m.keep_id, iw.injury_type, iw.level
from public.injury_exercise_warnings iw join merge_map m on m.drop_id = iw.exercise_id
on conflict (exercise_id, body_part, injury_type, level) do nothing;

-- 7. Программа и история тренировок: перепривязка (задвоений нет — см. blast-radius)
update public.program_exercises pe set exercise_id = m.keep_id
from merge_map m where pe.exercise_id = m.drop_id;

update public.workout_exercises we set exercise_id = m.keep_id
from merge_map m where we.exercise_id = m.drop_id;

-- 7b. program_exercises.exercise_name — денормализованное поле, его рендерит DayCard
--     (урок FD-SEED-1: пользователи видели имя, отсутствующее в каталоге). После
--     перепривязки там осталось имя удалённой строки → синхронизируем с каталогом.
--     Трогаем только строки затронутых пар, весь дрейф имён чинится отдельным пакетом.
update public.program_exercises pe set exercise_name = e.name
from public.exercises e
where pe.exercise_id = e.id
  and pe.exercise_id in (select keep_id from merge_map)
  and pe.exercise_name is distinct from e.name;

-- 8. Удаление. Остатки рёбер забирает CASCADE (все FK на exercises — CASCADE,
--    кроме program_exercises SET NULL, который уже перепривязан шагом 7).
delete from public.exercises e using merge_map m where e.id = m.drop_id;

-- Пост-проверка 1: 842 → 826, и ни одна пара не осталась с двумя строками
--   SELECT count(*) FROM public.exercises;                                   -- 826
--   SELECT count(*) FROM public.exercises_removed_archive;                   -- 16
-- Пост-проверка 1b: имена в программах совпадают с каталогом (был дрейф — FD-SEED-1)
--   SELECT count(*) FROM public.program_exercises pe JOIN public.exercises e ON e.id = pe.exercise_id
--   WHERE pe.exercise_name IS DISTINCT FROM e.name;                          -- 0 на затронутых
-- Пост-проверка 2: история и программы не потеряли ссылки
--   SELECT count(*) FROM program_exercises WHERE exercise_id IS NULL;        -- было N, стало N
--   SELECT count(*) FROM workout_exercises w LEFT JOIN exercises e ON e.id = w.exercise_id
--     WHERE e.id IS NULL;                                                    -- 0
-- Пост-проверка 3: коллизий name_eng не стало больше (было 2 — CAT-Q2)
--   SELECT name_eng, count(*) FROM public.exercises
--   WHERE name_eng IS NOT NULL GROUP BY name_eng HAVING count(*) > 1;
-- Пост-проверка 4: self-link рёбер нет
--   SELECT count(*) FROM public.exercise_relationships WHERE exercise_id = related_exercise_id;  -- 0
