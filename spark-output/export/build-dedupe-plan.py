# -*- coding: utf-8 -*-
"""План дедупликации каталога (ILL-Q2): 16 пар «дубль ↔ владелец кадра».

Вход:
  spark-output/export/dup-usage.json  — снимок загрузки 32 строк (считается SQL-ем
        из отчёта catalog-dedupe-plan, см. §«как перепроверять»; поля: name, status,
        text_len = technique+benefits+risks+settings, aliases, wex = строки
        workout_exercises, wex_done = из них в завершённых тренировках, prog = строки
        program_exercises, rel = рёбра exercise_relationships с любой стороны,
        eq, warn).
  прод через PostgREST — id и name_eng по (name, status).

Правило выбора (вердикт владельца 08.10): «оставить 1 наиболее полный вариант по
описанию и содержанию, а также если он используется в программах». Реализовано так:
  1) использование (prog*3 + wex + wex_done) — если отличается, остаётся используемая;
  2) при равенстве — содержание (длина текстов + рёбра*4 + предупреждения*40 +
     снаряжение*15 + алиасы*5);
  3) при разнице содержания меньше 60 баллов — предпочитается строка со статусом
     `approved` (уже прошла проверку, иначе мы выбрасываем проверенное в пользу
     непроверенного ради пары десятков символов).

Выход:
  spark-output/export/dedupe-pairs.json — пары keep/drop с id и счётчиками;
  spark-output/export/_overlap.sql      — запрос, который считает конфликты
        перепривязки (задвоение в одной тренировке/дне, коллизии уникальных индексов).

Запуск:  python spark-output/export/build-dedupe-plan.py
"""
import argparse
import json
import os
import urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
USAGE = os.path.join(ROOT, 'spark-output', 'export', 'dup-usage.json')
OUT = os.path.join(ROOT, 'spark-output', 'export', 'dedupe-pairs.json')
SQL = os.path.join(ROOT, 'spark-output', 'export', '_overlap.sql')

# (дубль, владелец кадра) — имя + статус, если имя встречается дважды
PAIRS = [
    (('Алмазные отжимания', None), ('Отжимания узким хватом (на трицепс)', None)),
    (('Болгарские выпады', None), ('Болгарские выпады с гантелями', None)),
    (('Выпады со штангой', None), ('Выпады со штангой на плечах', None)),
    (('Жим в Хаммере (горизонтальный)', None), ('Жим в тренажере Chest Press', None)),
    (('Жим в Хаммере на плечи', None), ('Жим плеч в рычажном тренажёре', None)),
    (('Жим штанги лежа на горизонтальной скамье', None), ('Жим штанги лежа (средний хват)', None)),
    (('Зашагивания на тумбу', None), ('Зашагивания на тумбу со штангой', None)),
    (('Обратные разведения в Pec Deck', None), ('Обратные разведения в тренажере', None)),
    (('Обратные скручивания', 'needs_review'), ('Обратные скручивания', 'approved')),
    (('Приседания в Смите', None), ('Приседания в тренажере Смита', None)),
    (('Ролик для пресса (Ab Wheel)', None), ('Ролик для пресса', None)),
    (('Румынская становая тяга (румынка)', None), ('Румынская тяга со штангой', None)),
    (('Сгибание рук с гантелями нейтральным хватом (молот)', None), ('Сгибание рук на бицепс (молот)', None)),
    (('Скручивания в тренажере', None), ('Скручивания в тренажере на пресс', None)),
    (('Тяга нижнего блока к поясу сидя', None), ('Тяга горизонтального блока к поясу в кроссовере', None)),
    (('Французский жим лежа', None), ('Французский жим штанги из-за головы лежа узким хватом', None)),
    # 17-я пара (08.10, вечер): «Жим гантелей перед собой» по описанию = подъём гантелей
    # перед собой стоя → третий дубль «Мах гантелями перед собой» (Front Dumbbell Raise).
    (('Жим гантелей перед собой', None), ('Махи гантелями перед собой', 'approved')),
]
CONTENT_MARGIN = 60


def prod_rows():
    extra = json.load(open(os.path.join(ROOT, 'app.json'), encoding='utf-8'))['expo']['extra']
    url = "%s/rest/v1/exercises?select=id,name,name_eng,status&limit=1000" % extra['supabaseUrl']
    req = urllib.request.Request(url, headers={'apikey': extra['supabaseAnonKey'],
                                               'Authorization': "Bearer " + extra['supabaseAnonKey']})
    return json.loads(urllib.request.urlopen(req, timeout=30).read().decode())


def usage_index(usage):
    idx = {}
    for x in usage:
        n = x['name'].replace('__dup2__', '')
        idx.setdefault((n, x['status']), x)
    return idx


def use(x):
    return x['prog'] * 3 + x['wex'] + x['wex_done']


def content(x):
    return (x['text_len'] + x['rel'] * 4 + x['warn'] * 40 + x['eq'] * 15 + x['aliases'] * 5)


def decide(a, b):
    """Возвращает (keep, drop, почему)."""
    if use(a) != use(b):
        keep, drop = (a, b) if use(a) > use(b) else (b, a)
        return keep, drop, 'использование: %d против %d' % (use(keep), use(drop))
    ca, cb = content(a), content(b)
    if abs(ca - cb) < CONTENT_MARGIN:
        # содержание сопоставимо → берём проверенную строку
        approved = next((x for x in (a, b) if x['status'] == 'approved'), None)
        if approved is not None:
            other = b if approved is a else a
            if other['status'] != 'approved':
                return approved, other, ('содержание сопоставимо (%d против %d), берём approved'
                                         % (ca, cb))
    keep, drop = (a, b) if ca >= cb else (b, a)
    return keep, drop, 'содержание: %d против %d' % (content(keep), content(drop))


def emit_migration(plan):
    """Собрать файл миграции дедупликации из плана пар.

    Порядок внутри файла важен: архив → перенос имени/ссылки → слияние алиасов →
    перенос рёбер (on conflict do nothing) → перепривязка программ и истории →
    удаление (остатки забирает CASCADE). Откат — по exercises_removed_archive и
    exercise_edges_archive, SQL в шапке.
    """
    pairs = ",\n".join("  ('%s'::uuid, '%s'::uuid)" % (p['drop_id'], p['keep_id']) for p in plan)
    stamp = '20261009004500'
    path = os.path.join(ROOT, 'supabase', 'migrations', '%s_dedupe_exercises.sql' % stamp)
    sql = """-- ============================================================================
-- ILL-Q2: дедупликация каталога — 16 пар «дубль ↔ позиция, чей кадр был одолжен».
--
-- Правило выбора (вердикт владельца 08.10): оставить один наиболее полный вариант
-- по описанию и содержанию; если позиция используется в программах — оставляем её;
-- при сопоставимом содержании (разница < 60 баллов) предпочитается строка `approved`.
-- Пары и обоснование по каждой: spark-output/export/dedupe-pairs.json
-- (пересобирается: python spark-output/export/build-dedupe-plan.py --emit-migration)
--
-- Blast-radius (read-only замер по проду 08.10, до записи):
--   workout_exercises: %(wex)d строк перепривязывается, из них %(done)d в завершённых
--     тренировках — история НЕ удаляется, только меняет exercise_id;
--   program_exercises: %(prog)d строк;
--   задвоений внутри одной тренировки/дня после перепривязки: 0 (проверено —
--     ни в одном дне/тренировке не оставляемая позиция уже не встречается);
--   exercise_relationships: %(rel)d рёбер с удаляемой стороны, из них %(relc)d
--     уже есть у оставляемой (сливаются через on conflict do nothing) и %(reld)d
--     идут между парой (становятся self-link → удаляются);
--   exercise_equipment: %(eq)d связей, %(eqc)d коллизий; injury_exercise_warnings:
--     %(warn)d, %(warnc)d коллизий; injury_exercise_restrictions: 0; exercise_media: %(media)d
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
%(pairs)s;

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

-- 4. Алиасы: объединяем без дублей (поиск по алиасам — CAT-Q7).
--    Файл намеренно остаётся равным ТОМУ, что применено на прод 09.10: имя удалённой
--    строки здесь не переносится, его доносит 20261009010000_carry_dropped_names_into_aliases.sql.
--    УРОК на следующий сценарий: переносить и имя, т.е.
--      || array_remove(array[d.name, d.name_eng], NULL)
--    внутри unnest — иначе у части пар старое название исчезает из поиска (09.10: 6 из 17).
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
""" % {'pairs': pairs, 'wex': sum(p['wex'] for p in plan), 'done': sum(p['wex_done'] for p in plan),
       'prog': sum(p['prog'] for p in plan), 'rel': sum(p['rel'] for p in plan),
       'relc': 91, 'reld': 3, 'eq': sum(p['eq'] for p in plan), 'eqc': 15,
       'warn': sum(p['warn'] for p in plan), 'warnc': 4, 'media': 16}
    open(path, 'w', encoding='utf-8').write(sql)
    print('миграция:', os.path.relpath(path, ROOT))
    return path


def prev_pairs():
    """Раньше сохранённые пары: {(имя, статус) -> строка-замена}.

    После применения дедупликации удалённых строк в проде уже нет, и без этого
    фолбэка генератор перестал бы воспроизводить собственный файл миграции.
    """
    if not os.path.exists(OUT):
        return {}
    out = {}
    for p in json.load(open(OUT, encoding='utf-8')):
        out[(p['drop'], p['drop_status'])] = {'id': p['drop_id'], 'name': p['drop'],
                                              'status': p['drop_status'], 'name_eng': p['drop_ne']}
        out[(p['keep'], p['keep_status'])] = {'id': p['keep_id'], 'name': p['keep'],
                                              'status': p['keep_status'], 'name_eng': p['keep_ne']}
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--emit-migration', action='store_true',
                    help='записать файл миграции дедупликации по текущему плану')
    a = ap.parse_args()
    usage = usage_index(json.load(open(USAGE, encoding='utf-8')))
    prod = prod_rows()
    plan = []
    prev = prev_pairs()
    for (dn, ds), (on, os_) in PAIRS:
        rows = {}
        for (nm, st), role in (((dn, ds), 'dup'), ((on, os_), 'owner')):
            hits = [x for x in prod if x['name'] == nm and (not st or x['status'] == st)]
            if not hits and (nm, st or '') in prev:
                hits = [prev[(nm, st or '')]]
            if len(hits) != 1:
                raise SystemExit('неоднозначно: %r (статус %r) -> %d строк' % (nm, st, len(hits)))
            hit = hits[0]
            u = usage.get((nm, hit['status'])) or next((v for k, v in usage.items()
                                                        if k[0] == nm), None)
            if u is None:
                raise SystemExit('нет записи загрузки для %r' % nm)
            rows[role] = dict(u, id=hit['id'], name=nm, status=hit['status'],
                              name_eng=hit['name_eng'], role=role)
        keep, drop, why = decide(rows['dup'], rows['owner'])
        plan.append({'keep_id': keep['id'], 'keep': keep['name'], 'keep_status': keep['status'],
                     'keep_ne': keep['name_eng'], 'drop_id': drop['id'], 'drop': drop['name'],
                     'drop_status': drop['status'], 'drop_ne': drop['name_eng'],
                     'why': why, 'use_keep': use(keep), 'use_drop': use(drop),
                     'content_keep': content(keep), 'content_drop': content(drop),
                     **{k: drop[k] for k in ('wex', 'wex_done', 'prog', 'rel', 'eq', 'warn')}})

    json.dump(plan, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    tot = {k: sum(p[k] for p in plan) for k in ('wex', 'wex_done', 'prog', 'rel', 'eq', 'warn')}
    print('пар: %d | перепривязать: wex %d (заверш. %d), prog %d, rel %d, eq %d, warn %d'
          % (len(plan), tot['wex'], tot['wex_done'], tot['prog'], tot['rel'], tot['eq'], tot['warn']))
    for p in plan:
        print('  оставить %-44s | удалить %-44s | %s' % (p['keep'][:44], p['drop'][:44], p['why']))

    vals = ",\n".join("  ('%s'::uuid,'%s'::uuid)" % (p['drop_id'], p['keep_id']) for p in plan)
    open(SQL, 'w', encoding='utf-8').write("""-- Конфликты перепривязки перед удалением дублей (read-only).
with pair(drop_id, keep_id) as (values
%s
)
select
  (select count(*) from program_exercises pe join pair p on pe.exercise_id = p.drop_id
     where exists (select 1 from program_exercises pk
                   where pk.program_day_id = pe.program_day_id and pk.exercise_id = p.keep_id)) as prog_overlap,
  (select count(*) from workout_exercises we join pair p on we.exercise_id = p.drop_id
     where exists (select 1 from workout_exercises wk
                   where wk.workout_id = we.workout_id and wk.exercise_id = p.keep_id)) as wex_overlap,
  (select count(*) from exercise_relationships er join pair p on er.exercise_id = p.drop_id
     where exists (select 1 from exercise_relationships ek where ek.exercise_id = p.keep_id
                   and ek.related_exercise_id = er.related_exercise_id and ek.relation_type = er.relation_type)) as rel_conflict,
  (select count(*) from exercise_relationships er join pair p on (er.exercise_id = p.drop_id and er.related_exercise_id = p.keep_id)
        or (er.exercise_id = p.keep_id and er.related_exercise_id = p.drop_id)) as rel_direct,
  (select count(*) from exercise_equipment ee join pair p on ee.exercise_id = p.drop_id
     where exists (select 1 from exercise_equipment ek where ek.exercise_id = p.keep_id
                   and ek.equipment_id = ee.equipment_id)) as eq_conflict,
  (select count(*) from injury_exercise_warnings iw join pair p on iw.exercise_id = p.drop_id
     where exists (select 1 from injury_exercise_warnings ik where ik.exercise_id = p.keep_id
                   and ik.body_part = iw.body_part and ik.injury_type = iw.injury_type and ik.level = iw.level)) as warn_conflict,
  (select count(*) from injury_exercise_restrictions ir join pair p on ir.exercise_id = p.drop_id) as restr_rows,
  (select count(*) from exercise_media em join pair p on em.exercise_id = p.drop_id) as media_rows
""" % vals)
    print('\nзапрос конфликтов:', os.path.relpath(SQL, ROOT))
    print('пары:', os.path.relpath(OUT, ROOT))
    if a.emit_migration:
        emit_migration(plan)


if __name__ == '__main__':
    main()
