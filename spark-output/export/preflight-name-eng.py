# -*- coding: utf-8 -*-
"""Preflight для миграции «заполнить name_eng из media_url» (шаг 2, ILL-4).

Только SELECT/чтение: ничего не пишет ни в прод, ни в датасет. Запускается ПЕРЕД
применением миграции и повторяется после — чтобы сверить, что предикат поймал ровно
ожидаемое число строк и не породил коллизий.

Запуск:  python spark-output/export/preflight-name-eng.py
"""
import json
import os
import re
import sys
import urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DATA = os.path.join(ROOT, 'data', 'exercises')


def fetch():
    extra = json.load(open(os.path.join(ROOT, 'app.json'), encoding='utf-8'))['expo']['extra']
    url = "%s/rest/v1/exercises?select=id,name,name_eng,media_url,status&limit=1000" % extra['supabaseUrl']
    req = urllib.request.Request(url, headers={'apikey': extra['supabaseAnonKey'],
                                               'Authorization': "Bearer " + extra['supabaseAnonKey']})
    return json.loads(urllib.request.urlopen(req, timeout=30).read().decode('utf-8'))


def folder_of(url):
    m = re.search(r'exercises/([^/]+)/', url or '')
    return m.group(1) if m else None


# Просмотр 16 «свободных» пар глазами: у этих четырёх английское имя из папки
# описывает НЕ то же движение, что русское имя строки. name_eng в UI не показывается,
# но после CAT-Q7 участвует в поиске и задаёт имя папки на нашем хосте — писать
# его по сомнительному соответствию нельзя. Эти id уходят в bucket name_suspect.
SUSPECT = {
    '41c227ca-71f5-4c62-b1a7-4105d15f316d': '«Жим гантелей перед собой» ≠ Dumbbell Incline Shoulder Raise (это подъём/жим на наклоне)',
    'aefdc8dc-bd06-4270-b2f2-3efa4f5360e8': '«Французский жим сидя» ≠ Seated Bent-Over One-Arm Dumbbell Triceps Extension (другая опора и другая рука)',
    'bb1fbbb4-36df-4bff-b800-d82be5e1cda9': '«прямая рукоять» ≠ V-Bar Attachment (разная насадка — кадр будет врать)',
    '668309c4-7be6-41e9-a2be-a9d8ba81d547': '«обратный хват» ≠ Close-Grip (нейтральный/узкий — не супинированный)',
}


def humanize(folder):
    """Имя папки датасета → канонический name_eng: '_' → ' ', остальное сохраняем."""
    return folder.replace('_', ' ') if folder else None


def norm(s):
    """Сравнение имён: только буквы/цифры, нижний регистр, без окончания мн. числа.
    Разделители (пробел, «_», «-», «/», скобки) выкидываются — иначе «3/4 Sit-Up» и
    «3_4_Sit-Up» казались бы разными упражнениями."""
    s = re.sub(r'[^a-z0-9]', '', (s or '').lower())
    if s.endswith('ies'):
        s = s[:-3] + 'y'
    elif s.endswith('es'):
        s = s[:-2]
    elif s.endswith('s'):
        s = s[:-1]
    return s


MIGRATION = os.path.join(ROOT, 'supabase', 'migrations',
                         '20261008230000_fill_name_eng_from_media_url.sql')


def emit_migration(free):
    """Пересобрать файл миграции из списка. Каст ::uuid на ПЕРВОМ значении обязателен:
    иначе Postgres выводит колонку VALUES как text и падает `uuid = text` (проверено 08.10)."""
    rows = []
    for i, r in enumerate(sorted(free, key=lambda x: x['name_eng'])):
        cast = '::uuid' if i == 0 else ''
        rows.append("  ('%s'%s, '%s')" % (r['id'], cast, r['name_eng'].replace("'", "''")))
    ids = ", ".join("'%s'" % r['id'] for r in sorted(free, key=lambda x: x['name_eng']))
    head = open(MIGRATION, encoding='utf-8').read().split('UPDATE public.exercises')[0]
    head = re.sub(r'-- Список построен.*?-- Снимок «до».*?\n',
                  '-- Список построен скриптом preflight-name-eng.py (режим --emit-migration),\n'
                  '-- перепроверяется read-only SELECT-ом перед применением. Партия: %d строк.\n'
                  '-- Снимок «до»: name_eng IS NULL = 47 → «после» = %d.\n'
                  % (len(free), 47 - len(free)), head, flags=re.S)
    sql = (head.rstrip() + "\n\nUPDATE public.exercises e\nSET name_eng = v.name_eng\nFROM (VALUES\n"
           + ",\n".join(rows)
           + "\n) AS v(id, name_eng)\nWHERE e.id = v.id\n"
             "  AND e.name_eng IS NULL;          -- идемпотентность: повторный apply не меняет ничего\n\n"
             "-- Пост-проверка 1 (ждём filled=%d / still_null=0):\n"
             "--   SELECT count(*) FILTER (WHERE name_eng IS NOT NULL) filled,\n"
             "--          count(*) FILTER (WHERE name_eng IS NULL) still_null\n"
             "--   FROM public.exercises WHERE id = ANY(ARRAY[%s]);\n"
             "-- Пост-проверка 2 (коллизий не стало больше, было 2 — CAT-Q2):\n"
             "--   SELECT name_eng, count(*) FROM public.exercises\n"
             "--   WHERE name_eng IS NOT NULL GROUP BY name_eng HAVING count(*) > 1;\n"
             "-- Пост-проверка 3 (папки есть и отдают 200):\n"
             "--   python spark-output/export/check-media-names.py --http\n"
             % (len(free), ids))
    open(MIGRATION, 'w', encoding='utf-8').write(sql)
    print('миграция пересобрана из %d строк: %s' % (len(free), os.path.relpath(MIGRATION, ROOT)))


def main():
    rows = fetch()
    if isinstance(rows, dict):
        sys.exit('прод не прочитан: %s' % rows)
    taken = {r['name_eng'] for r in rows if r.get('name_eng')}
    taken_norm = {norm(t) for t in taken}
    empty = [r for r in rows if not r.get('name_eng')]
    with_url = [r for r in empty if folder_of(r.get('media_url'))]
    without = [r for r in empty if not folder_of(r.get('media_url'))]

    print('строк: %d | name_eng пуст: %d | из них имя выводится из media_url: %d | вручную: %d'
          % (len(rows), len(empty), len(with_url), len(without)))

    # Ключевая развилка: имя из папки свободно, занято ДРУГОЙ строкой, или свободно,
    # но не совпадает со смыслом русского имени (SUSPECT — смотреть глазами).
    free, borrowed, suspect = [], [], []
    for r in with_url:
        ne = humanize(folder_of(r['media_url']))
        if r['id'] in SUSPECT:
            suspect.append((r, ne))
        elif ne in taken or norm(ne) in taken_norm:
            borrowed.append((r, ne))
        else:
            free.append((r, ne))
    dup_within = {}
    for r, ne in free:
        dup_within.setdefault(ne, []).append(r['name'])
    dups = {k: v for k, v in dup_within.items() if len(v) > 1}
    print('в миграцию: %d | одолжено у другой строки: %d | имя не совпадает по смыслу: %d'
          % (len(free), len(borrowed), len(suspect)))
    print('дублей внутри партии: %d' % len(dups))
    for k, v in dups.items():
        print('   !', k, '<-', v)
    print('\nисключены из партии (имя свободно, но описывает другое движение):')
    for r, ne in suspect:
        print('   %-46s ← %-46s %s' % (r['name'][:46], ne, SUSPECT[r['id']]))
    print('\nодолженные картинки (name_eng пуст, кадр чужой) — кандидаты на собственную генерацию:')
    for r, ne in borrowed:
        print('   %-46s ← %s' % (r['name'][:46], ne))

    # Что даст заполнение: имя папки обязано существовать в датасете, иначе кадр и так битый
    folders = {d for d in os.listdir(DATA) if os.path.isdir(os.path.join(DATA, d))}
    missing = [r for r in with_url if folder_of(r['media_url']) not in folders]
    print('из %d выводимых — папки нет локально: %d (это не блокер миграции, но кадр 404)'
          % (len(with_url), len(missing)))

    print('\nвручную (нет ни name_eng, ни ссылки):')
    for r in without:
        print('   %-70s [%s]' % (r['name'], r['status']))

    # Группа «кадр вообще про другое упражнение»: name_eng есть, папка из URL другая
    print('\n=== классификация расхождений name_eng ↔ папка URL ===')
    mech, semantic, nosuch = [], [], []
    for r in rows:
        ne, fo = r.get('name_eng'), folder_of(r.get('media_url'))
        if not ne or not fo:
            continue
        slug = ne.replace(' ', '_')
        if slug == fo:
            continue
        # механика = тот же смысл после нормализации разделителей и мн. числа
        if norm(slug) == norm(fo):
            mech.append((ne, fo))
        elif fo not in folders and slug not in folders:
            nosuch.append((ne, fo))
        else:
            semantic.append((ne, fo))
    print('механические (пунктуация/падеж/множественное): %d' % len(mech))
    print('семантические (разные упражнения): %d' % len(semantic))
    print('папки нет ни там, ни там: %d' % len(nosuch))
    print('\nсемантические — кандидаты на отдельный вердикт:')
    for ne, fo in semantic:
        print('   %-52s показывает %s' % (ne, fo))
    print('\nбез папки нигде:')
    for ne, fo in nosuch:
        print('   %-52s показывает %s' % (ne, fo))

    out = os.path.join(ROOT, 'spark-output', 'export', 'name-eng-preflight.json')
    json.dump({'fill_from_url': [{'id': r['id'], 'name': r['name'], 'name_eng': ne} for r, ne in free],
               'name_suspect': [{'id': r['id'], 'name': r['name'], 'name_eng': ne, 'why': SUSPECT[r['id']]}
                                for r, ne in suspect],
               'borrowed_picture': [{'id': r['id'], 'name': r['name'], 'owner_name_eng': ne}
                                    for r, ne in borrowed],
               'manual': [{'id': r['id'], 'name': r['name'], 'status': r['status']} for r in without],
               'mechanical': mech, 'semantic': semantic, 'no_folder': nosuch},
              open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('\nсписок для миграции:', out, '(в миграцию идёт только fill_from_url)')


if __name__ == '__main__':
    main()
