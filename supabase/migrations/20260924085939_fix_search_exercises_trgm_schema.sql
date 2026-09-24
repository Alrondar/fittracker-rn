-- Regression-fix SEC-16: search_exercises перестала вызываться после переноса pg_trgm.
--
-- 20260924054729_move_pg_trgm_to_extensions.sql вынес pg_trgm из public в схему
-- extensions. Функция объявлена с SET search_path = 'public', поэтому её вызовы
-- word_similarity() / similarity() без схемы перестали резолвиться:
--   ERROR 42883: function word_similarity(text, text) does not exist
--   CONTEXT: SQL function "search_exercises" during startup
-- Падает на этапе построения плана, то есть при любом вызове (в том числе с
-- q IS NULL) — потому справочник и пикер упражнений показывали «не удалось
-- загрузить упражнения», хотя данные в exercises есть и гранты/RLS в порядке.
--
-- Комментарий в SEC-16 утверждал, что квалификация приложению не требуется, —
-- он учитывал только PostgREST .ilike() и ошибочен для этой RPC. Исправление
-- фиксируется здесь, сам применённый файл миграции не переписывается.
--
-- Тело функции не менялось: добавлен только префикс схемы к трём вызовам
-- (2x extensions.word_similarity, 1x extensions.similarity).
-- search_path, ACL, STABLE и сигнатура сохраняются (CREATE OR REPLACE).

create or replace function public.search_exercises(
  q text default null,
  muscle_filter text[] default null,
  category_filter text[] default null,
  equipment_filter text[] default null,
  activation_filter boolean default null,
  sort_by text default 'name-asc',
  page_limit integer default 40,
  page_offset integer default 0
)
returns table(
  id uuid,
  name text,
  primary_muscles text[],
  equipment text[],
  category text,
  popularity bigint,
  can_be_activation boolean
)
language sql
stable
set search_path to 'public'
as $function$
with usage as (
  select
    we.exercise_id,
    count(*)::bigint as cnt
  from workout_exercises we
  group by we.exercise_id
),
norm as (
  select replace(lower(btrim(coalesce(q, ''))), 'ё', 'е') as nq
),
exercise_equipment_names as (
  select
    ee.exercise_id,
    array_agg(eq.name order by eq.name) as equipment_names
  from exercise_equipment ee
  join equipment eq on eq.id = ee.equipment_id
  where eq.name is not null
    and eq.name <> ''
  group by ee.exercise_id
)
select
  e.id,
  e.name,
  e.primary_muscles,
  coalesce(een.equipment_names, '{}'::text[]) as equipment,
  e.category,
  coalesce(u.cnt, 0) as popularity,
  coalesce(e.can_be_activation, false) as can_be_activation
from exercises e
left join usage u on u.exercise_id = e.id
left join exercise_equipment_names een on een.exercise_id = e.id
cross join norm
where
  (
    norm.nq = ''
    or replace(lower(e.name), 'ё', 'е') like '%' || norm.nq || '%'
    or replace(lower(array_to_string(coalesce(e.primary_muscles, '{}'), ' ')), 'ё', 'е') like '%' || norm.nq || '%'
    or replace(lower(array_to_string(coalesce(een.equipment_names, '{}'), ' ')), 'ё', 'е') like '%' || norm.nq || '%'
    or extensions.word_similarity(norm.nq, replace(lower(e.name), 'ё', 'е')) > 0.4
  )
  and (
    muscle_filter is null
    or cardinality(muscle_filter) = 0
    or e.primary_muscles && muscle_filter
  )
  and (
    category_filter is null
    or cardinality(category_filter) = 0
    or e.category = any(category_filter)
  )
  and (
    equipment_filter is null
    or cardinality(equipment_filter) = 0
    or exists (
      select 1
      from exercise_equipment ee
      join equipment eq on eq.id = ee.equipment_id
      where ee.exercise_id = e.id
        and (
          eq.id::text = any(equipment_filter)
          or eq.name = any(equipment_filter)
          or lower(eq.name) in (
            select lower(unnest(equipment_filter))
          )
        )
    )
  )
  and (
    activation_filter is null
    or activation_filter = false
    or e.can_be_activation = true
  )
order by
  case
    when norm.nq <> '' then
      greatest(
        extensions.similarity(replace(lower(e.name), 'ё', 'е'), norm.nq),
        extensions.word_similarity(norm.nq, replace(lower(e.name), 'ё', 'е'))
      )
    else 0
  end desc,
  case
    when sort_by = 'popularity' then coalesce(u.cnt, 0)
    else 0
  end desc,
  case
    when sort_by = 'name-desc' then e.name
  end desc nulls last,
  e.name asc
limit greatest(coalesce(page_limit, 40), 1)
offset greatest(coalesce(page_offset, 0), 0);
$function$;
