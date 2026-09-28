-- AUDIT-28.09 (BUG-3/4): диагностика строк, записанных с UTC-сдвигом.
-- READ-ONLY: только SELECT. Запускать через Supabase MCP (execute_sql) или SQL Editor.
--
-- Root cause (исправлен в коде 28.09): UI писал event_date/metric_date через
-- toISOString() (канон-запрет: src/utils/dateKey.ts / FD-5):
--  * cycle_events: тап по дню календаря ЦИКЛА всегда писал D-1 для UTC+ (независимо от часа);
--  * body_metrics: «сегодня» через toISOString сдвигалось на D-1 только в окнах
--    локальных 00:00–02:59 (UTC+3).
-- Оценка смещения сделана для tz='Europe/Moscow' (основная аудитория; в БД
-- часового пояса пользователя нет — для других tz счётчики ниже занижают/завышают,
-- при необходимости прогоните с другой tz).
--
-- ВЫВОД: строки с is_suspect=true потенциально смещены на −1 день.
-- Любые UPDATE — только отдельной миграцией и только после явного подтверждения владельца.

-- 1) cycle_events: запись календарём цикла (тап по дню) — почти всегда смещена.
select
  ce.user_id,
  count(*) as rows_total,
  count(*) filter (
    where ce.event_date = ((ce.created_at at time zone 'Europe/Moscow')::date - 1)
  ) as rows_suspect_shifted,
  count(*) filter (
    where ce.event_date = ((ce.created_at at time zone 'Europe/Moscow')::date)
  ) as rows_ok_same_day
from cycle_events ce
group by ce.user_id
order by rows_suspect_shifted desc;

-- 2) cycle_events в разрезе строк за последние 12 месяцев (для сверки вручную).
select
  ce.id,
  ce.user_id,
  ce.event_type,
  ce.event_date,
  (ce.created_at at time zone 'Europe/Moscow')::date as created_local_date,
  ce.created_at,
  (ce.event_date = ((ce.created_at at time zone 'Europe/Moscow')::date - 1)) as is_suspect
from cycle_events ce
where ce.created_at >= now() - interval '12 months'
order by is_suspect desc, ce.created_at desc
limit 200;

-- 3) body_metrics: смещены только ночи (локальные 00:00–02:59 = created_at UTC 21:00–23:59 предыдущих суток).
select
  bm.id,
  bm.user_id,
  bm.metric_date,
  (bm.created_at at time zone 'Europe/Moscow')::date as created_local_date,
  extract(hour from (bm.created_at at time zone 'Europe/Moscow')) as created_local_hour,
  (
    bm.metric_date = ((bm.created_at at time zone 'Europe/Moscow')::date - 1)
    and extract(hour from (bm.created_at at time zone 'Europe/Moscow')) < 3
  ) as is_suspect
from body_metrics bm
where bm.created_at >= now() - interval '12 months'
order by is_suspect desc, bm.created_at desc
limit 200;

-- 4) Итог по пользователям для решения о бэкфилле.
select
  'cycle_events' as tbl,
  count(*) filter (
    where event_date = ((created_at at time zone 'Europe/Moscow')::date - 1)
  ) as suspect_rows,
  count(*) as total_rows
from cycle_events
union all
select
  'body_metrics',
  count(*) filter (
    where metric_date = ((created_at at time zone 'Europe/Moscow')::date - 1)
      and extract(hour from (created_at at time zone 'Europe/Moscow')) < 3
  ),
  count(*)
from body_metrics;
