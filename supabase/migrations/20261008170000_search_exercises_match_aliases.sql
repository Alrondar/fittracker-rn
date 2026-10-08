-- ============================================================================
-- CAT-Q7: поиск по справочу упражнений не видел алиасов, короткого имени и
-- name_eng — то есть exercise_reference-данные, которые мы заполняем при
-- добавлении позиций (CAT-1 шаг 6), на находимость в UI не влияли.
--
-- Симптом: запрос «хип-траст» в библиотеке и в пикере упражнений возвращал
-- только «Трастер с гирями», хотя у «Ягодичный мостик со штангой» в aliases лежит
-- «хип-траст» и у четырёх новых позиций — «хип-траст в смите» и т. п.
--
-- Причина: предикат search_exercises матчил только name, primary_muscles и имена
-- снарядов (+ trgm по name). aliases / short_name / name_eng не участвовали ни в
-- фильтре, ни в ранжировании.
--
-- Что меняется (только это):
--   WHERE  += aliases, name_eng, short_name (та же нормализация: lower + ё→е + like)
--   ORDER BY в greatest() += word_similarity по aliases и по name_eng
-- Всё остальное — сигнатура, список выходных колонок, фильтры по мышцам/категории/
-- снарядам/разминке, сортировки popularity/name-desc, пагинация — без изменений.
--
-- Инварианты, зафиксированные после SEC-16/SEC-19 (не ронять справочник):
--   language sql, stable, set search_path = 'public', security-invoker;
--   вызовы trgm строго с префиксом схемы: extensions.word_similarity /
--   extensions.similarity (без схемы имя не резолвится, pg_trgm живёт в extensions).
--
-- Замер перед правкой (read-only, на проде, 842 строки):
--   дельта по числу совпадений: «хип-траст» 1 → 6; «жим лежа», «присед», «мостик»,
--   «становая», «румынк», «подтягиван», «ракушка», «присиданя» (опечатка), пустой
--   запрос — без изменений; lost = 0 на всех (новый предикат надмножество старого);
--   порядок первой пятёрки на «жим лежа»/«присед»/«мостик»/«становая» совпадает
--   позиция в позицию.
--
-- Реверс: применить supabase/migrations/20260924085939_fix_search_exercises_trgm_schema.sql
--   (каноническое тело до правки; файл не переписывался намеренно) либо
--   git revert этого коммита и повторный apply.
-- ============================================================================

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
),
-- CAT-Q7: один раз нормализуем расширяемые поля, дальше используем и в фильтре,
-- и в ранжировании (раньше строки пересчитывались по два раза на каждую колонку).
haystack as (
  select
    e.id,
    replace(lower(e.name), 'ё', 'е') as n_name,
    replace(lower(array_to_string(coalesce(e.aliases, '{}'), ' ')), 'ё', 'е') as n_aliases,
    replace(lower(coalesce(e.name_eng, '')), 'ё', 'е') as n_name_eng,
    replace(lower(coalesce(e.short_name, '')), 'ё', 'е') as n_short,
    replace(lower(array_to_string(coalesce(e.primary_muscles, '{}'), ' ')), 'ё', 'е') as n_muscles
  from exercises e
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
join haystack h on h.id = e.id
left join usage u on u.exercise_id = e.id
left join exercise_equipment_names een on een.exercise_id = e.id
cross join norm
where
  (
    norm.nq = ''
    or h.n_name like '%' || norm.nq || '%'
    or h.n_muscles like '%' || norm.nq || '%'
    or replace(lower(array_to_string(coalesce(een.equipment_names, '{}'), ' ')), 'ё', 'е') like '%' || norm.nq || '%'
    or extensions.word_similarity(norm.nq, h.n_name) > 0.4
    -- CAT-Q7: алиасы, короткое имя и англоязычное название
    or h.n_aliases like '%' || norm.nq || '%'
    or h.n_name_eng like '%' || norm.nq || '%'
    or h.n_short like '%' || norm.nq || '%'
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
        extensions.similarity(h.n_name, norm.nq),
        extensions.word_similarity(norm.nq, h.n_name),
        extensions.word_similarity(norm.nq, h.n_aliases),
        extensions.word_similarity(norm.nq, h.n_name_eng)
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
