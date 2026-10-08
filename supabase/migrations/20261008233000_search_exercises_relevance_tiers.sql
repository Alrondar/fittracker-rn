-- ============================================================================
-- CAT-Q9: ранжирование выдачи поиска по справочу упражнений.
--
-- Симптом (замер 08.10 на проде, sort_by='name-asc', top-3):
--   «жим лежа»        → Французский жим лежа | Антигравитационный жим … | Жим гири лежа …
--   «подтягивания»    → Австралийские подтягивания | Австралийские … в петлях | Лопаточные …
--   «махи»            → Махи в кроссовере на заднюю дельту | …
--   «присед»          → Толчок штанги в присед | Болгарские приседания …
--   («становая», «румынка», «мостик», «бицепс», «тяга верхнего блока» — приемлемо)
-- Причина: `ORDER BY` опирался только на trgm-похожесть (`similarity`/`word_similarity`),
-- а она награждает совпадение по длине строки, а не базовое движение. Производное
-- («Французский жим лежа») короче и ближе к запросу «жим лежа», чем канонический
-- «Жим штанги лёжа», и выходит первым. `popularity` участвовал в сортировке только
-- когда явно передан `sort_by='popularity'`, то есть в обычном поиске не влиял вовсе.
--
-- Что меняется: только сортировка и служебные CTE внутри тела (`norm.words` + два
-- булевых столбца в `haystack`). `WHERE` не тронут: набор строк, который проходит
-- фильтры и нечёткий порог, остаётся ровно тем же, что и до правки — меняется лишь
-- их порядок. (Расширение *полноты* выдачи за счёт покрытия словами — отдельная
-- задача, в CAT-Q9 не входит.) Ярусы релевантности (сверху вниз):
--   4 — нормализованное имя начинается со строки запроса («жим лежа» → «Жим лежа …»);
--   3 — имя содержит запрос целиком ИЛИ содержит все его слова (порядок слов не важен:
--       «жим штанги лежа» покрывает запрос «жим лежа», хотя подстрокой не является);
--   2 — то же для aliases / short_name / name_eng (в имени не нашлось — находим, но ниже);
--   1 — сработал только нечёткий trgm-порог;
--   0 — пустой запрос (ярусы не нужны, дальше решают sort_by и имя).
-- Разделение 3 и 2 нужно, чтобы запрос «жим лежа» не выкидывал канонический жим
-- штанги за пределы имени: без учёта набора слов он попадал в ярус 2 и оказывался
-- ниже «Французский жим лежа», который содержит фразу целиком.
-- Внутри яруса: `popularity` (сколько раз упражнение реально встречается в
-- тренировках — базовые движения впереди производных), затем trgm-похожесть, затем
-- семантика `sort_by` и алфавит, как было.
-- Два ограничения, чтобы не сломать согласованное поведение списка:
--   * ключи «популярность» и «похожесть» работают только при непустом запросе и
--     только в режимах `name-asc` (дефолт поиска) и `popularity`. Иначе выбор
--     «По названию (Я-А)» в листе сортировки (`ExerciseSortSheet.tsx`) превращался
--     в сортировку по популярности;
--   * при пустом запросе (`q is null`, режим просмотра каталога + prefetch из
--     `useTabPrefetch`) все ярусы = 0, похожесть с пустой строкой = 0 у всех строк,
--     поэтому порядок остаётся ровно тем же, что был до правки (sort_by + алфавит).
--
-- НЕ меняется: сигнатура, список и порядок выходных колонок, все фильтры (мышцы,
-- категория, снаряжение, разминочные), пагинация, `language sql`, `stable`,
-- `set search_path='public'`, security-invoker, обязательный префикс `extensions.`
-- у trgm-вызовов (урок SEC-19: без него функция падает на построении плана и
-- справочник лежит целиком).
--
-- Реверс: повторный apply supabase/migrations/20261008170000_search_exercises_match_aliases.sql
-- (тело до правки, включая поиск по алиасам).
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
  select
    replace(lower(btrim(coalesce(q, ''))), 'ё', 'е') as nq,
    -- CAT-Q9: слова запроса — для ярусов «покрывает запрос целиком» (см. шапку).
    array_remove(
      regexp_split_to_array(replace(lower(btrim(coalesce(q, ''))), 'ё', 'е'), '\s+'),
      ''
    ) as words
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
haystack_norm as (
  select
    e.id,
    replace(lower(e.name), 'ё', 'е') as n_name,
    replace(lower(array_to_string(coalesce(e.aliases, '{}'), ' ')), 'ё', 'е') as n_aliases,
    replace(lower(coalesce(e.name_eng, '')), 'ё', 'е') as n_name_eng,
    replace(lower(coalesce(e.short_name, '')), 'ё', 'е') as n_short,
    replace(lower(array_to_string(coalesce(e.primary_muscles, '{}'), ' ')), 'ё', 'е') as n_muscles
  from exercises e
),
haystack as (
  select
    h.*,
    -- CAT-Q9: «покрывает запрос» = в тексте есть каждое слово запроса (именно как
    -- подстрока, поэтому работают русские падежи: «присед» ⊂ «приседания»). Порядок
    -- слов и слова между ними не важны — в отличие от LIKE '%nq%', где нужна слитная
    -- фраза. Поэтому «жим лежа» покрывает «жим штанги лежа на горизонтальной скамье».
    (select bool_and(h.n_name like '%' || w || '%') from unnest(norm.words) w) as name_covers_query,
    (
      select bool_and(
        h.n_aliases like '%' || w || '%'
        or h.n_short like '%' || w || '%'
        or h.n_name_eng like '%' || w || '%'
      )
      from unnest(norm.words) w
    ) as alt_covers_query
  from haystack_norm h
  cross join norm
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
  -- CAT-Q9: ярус релевантности вместо чистой похожести строк.
  case
    when norm.nq = '' then 0
    when h.n_name like norm.nq || '%' then 4
    when h.n_name like '%' || norm.nq || '%' or h.name_covers_query then 3
    when h.n_aliases like '%' || norm.nq || '%'
      or h.n_short like '%' || norm.nq || '%'
      or h.n_name_eng like '%' || norm.nq || '%'
      or h.alt_covers_query then 2
    else 1
  end desc,
  -- Внутри яруса — популярность: сколько раз упражнение реально встречается в
  -- тренировках. Замер 08.10: на запрос «жим лежа» канонический «Жим штанги лежа
  -- на горизонтальной скамье» имеет 85 вхождений против 21 у «Французский жим
  -- EZ-штанги лежа» и 0 у «Французский жим лежа», но trgm-похожесть ставила
  -- последние выше, потому что их имена ближе к запросу по длине.
  -- Ключ включается только для режимов «релевантность» (name-asc — дефолт поиска) и
  -- «popularity»: выбранные пользователем «Я-А» не должны превращаться в «по
  -- популярности» (лист сортировки — ExerciseSortSheet.tsx).
  case
    when norm.nq <> ''
      and coalesce(sort_by, 'name-asc') in ('name-asc', 'popularity')
      then coalesce(u.cnt, 0)
    else 0
  end desc,
  -- Похожесть — третий ключ: решает, когда популярность равна (и только в режиме
  -- релевантности, иначе алфавитная сортировка перестаёт быть алфавитной).
  case
    when norm.nq <> '' and coalesce(sort_by, 'name-asc') = 'name-asc' then greatest(
      extensions.similarity(h.n_name, norm.nq),
      extensions.word_similarity(norm.nq, h.n_name),
      extensions.word_similarity(norm.nq, h.n_aliases),
      extensions.word_similarity(norm.nq, h.n_name_eng)
    )
    else 0
  end desc,
  -- Семантика sort_by и алфавит — как были до правки.
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
