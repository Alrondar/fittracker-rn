# -*- coding: utf-8 -*-
"""Каталог иллюстраций: манифест «что сделано / что осталось».

Пересобирается в начале каждой сессии генерации (см. illustration-style-lock.md §6):
манифест — единственный источник правды о том, какие позиции уже в нашем стиле,
какие ждут генерации и к какой волне относятся.

Источник данных — прод через PostgREST (anon-ключ из app.json, чтение справочника
разрешено RLS). Локально смотрим наличие кадров data/exercises/<Id>/0.jpg|1.jpg.

Запуск:
    python spark-output/export/build-illustration-manifest.py
    python spark-output/export/build-illustration-manifest.py --wave core --limit 30

Выход: spark-output/export/illustrations-manifest.json (+ сводка в консоль).
"""
import argparse
import json
import os
from media_root import media_root
import re
import sys
import urllib.request
from collections import Counter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DATA = media_root()
OUT = os.path.join(ROOT, 'spark-output', 'export', 'illustrations-manifest.json')

# Ставка и коэффициенты — из замера 08.10 (отчёт illustrations-full-catalog-effort).
UNIT_MIN = 3.23
MULT = {
    'strength': 1.00,
    'stretching': 1.25,
    'powerlifting': 1.30,
    'cardio': 1.40,
    'plyometrics': 1.50,
    'olympic weightlifting': 1.80,
}
NOREF_MULT = 1.35
OUR_HOST_MARK = ('Alrondar/fittracker-exercise-media', 'Alrondar/fittracker-rn')
UPSTREAM_MARK = 'yuhonas/free-exercise-db'


def folder_of(url):
    m = re.search(r'exercises/([^/]+)/', url or '')
    return m.group(1) if m else None


def slug(name_eng):
    return (name_eng or '').replace(' ', '_')


def derive_name_eng(url):
    """Английское имя из папки, на которую уже ссылается media_url."""
    f = folder_of(url)
    return f.replace('_', ' ') if f else None


def fetch_prod():
    extra = json.load(open(os.path.join(ROOT, 'app.json'), encoding='utf-8'))['expo']['extra']
    base, key = extra['supabaseUrl'], extra['supabaseAnonKey']
    hdr = {'apikey': key, 'Authorization': "Bearer %s" % key}

    def get(path):
        req = urllib.request.Request(base + path, headers=hdr)
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode('utf-8'))

    try:
        rows = get('/rest/v1/exercises?select=id,name,name_eng,media_url,status,category,'
                   'can_be_activation,primary_muscles&limit=1000')
    except Exception as e:  # сеть/VPN — просим снять, чтобы не молча писать пустой манифест
        sys.exit('не удалось прочитать прод (%s): снять блокирование запроса или передать --dump' % e)
    try:
        pe = get('/rest/v1/program_exercises?select=exercise_id&limit=10000')
        used = {r['exercise_id'] for r in pe if r.get('exercise_id')}
    except Exception as e:
        print('program_exercises не прочитан (%s) — волна core = только пул активации' % e)
        used = set()
    for r in rows:
        r['_in_program'] = r['id'] in used
    return rows, used


GENDERED_NAME = re.compile(r'00([fm])\.(jpg|jpeg|png|webp)$', re.I)


def url_frames(url):
    """Имена рамок, которые запросит клиент по этому media_url (src/utils/mediaScheme.ts)."""
    path = (url or '').split('?', 1)[0]
    name = path.rsplit('/', 1)[-1].lower()
    g = GENDERED_NAME.match(name)
    if g:
        ext = name.rsplit('.', 1)[-1]
        return ['00f.%s' % ext, '01f.%s' % ext, '00m.%s' % ext, '01m.%s' % ext]
    if re.match(r'\d\.(jpg|jpeg|png|webp)$', name):
        ext = name.rsplit('.', 1)[-1]
        return ['0.%s' % ext, '1.%s' % ext]
    return [name] if name else []


def frames_present(folder_id, names=('0.jpg', '1.jpg')):
    d = os.path.join(DATA, folder_id) if folder_id else None
    if not d or not os.path.isdir(d):
        return 0
    return sum(1 for nm in names if os.path.exists(os.path.join(d, nm)))


def build(rows):
    used_folders = Counter()
    items = []
    for r in rows:
        url = r.get('media_url')
        name_eng = r.get('name_eng') or derive_name_eng(url)
        fid = slug(name_eng) if name_eng else None
        host = ('ours' if url and any(m in url for m in OUR_HOST_MARK) else
                'upstream' if url and UPSTREAM_MARK in url else
                'none' if not url else 'other')
        url_folder = folder_of(url)
        wanted = url_frames(url)
        url_name = (url or '').split('?', 1)[0].rsplit('/', 1)[-1].lower()
        gendered = bool(GENDERED_NAME.match(url_name))
        # «Наш кадр нарисован нами» — это гендерная схема (00f/01f/00m/01m), а не хост:
        # с 25.10 мы отдаём и зеркало апстрима, поэтому по одному хосту готовность
        # волны больше не определяется (ложный done = 758 позиций).
        present = frames_present(url_folder, wanted) if (host == 'ours' and url_folder) else 0
        done = host == 'ours' and gendered and present == len(wanted)
        # Референс = локально есть на что посмотреть: и наша рисовка, и зеркало.
        ref_frames = present or (frames_present(fid) if fid else 0)
        ref = ('ours' if done else
               'upstream' if ref_frames else 'none')
        if done:
            used_folders[url_folder or fid] += 1
        wave = ('done' if done else
                'core' if (r.get('can_be_activation') or r.get('_in_program')) else
                'approved' if r.get('status') == 'approved' else 'rest')
        est = UNIT_MIN * max(MULT.get(r.get('category'), 1.0), NOREF_MULT if ref == 'none' else 0)
        if not r.get('name_eng'):
            est += 0.25
        items.append({
            'id': r['id'],
            'name': r.get('name'),
            'name_eng': name_eng,
            'name_eng_derived': not r.get('name_eng'),
            'folder': fid,
            'url_folder': url_folder,
            'folder_mismatch': bool(fid and url_folder and fid != url_folder),
            'category': r.get('category'),
            'status': r.get('status'),
            'activation': bool(r.get('can_be_activation')),
            'in_program': bool(r.get('_in_program')),
            'primary': (r.get('primary_muscles') or [None])[0],
            'media_host': host,
            'media_url': url,
            'frames_local': present,
            'authored': done,
            'ref': ref,
            'wave': wave,
            'est_min': round(est, 2),
        })
    collisions = [f for f, n in used_folders.items() if n > 1]
    return items, collisions


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dump', help='вместо прода читать JSON-снимок (для офлайна)')
    ap.add_argument('--program-ids', help='JSON-массив id упражнений из program_exercises')
    ap.add_argument('--wave', choices=['core', 'approved', 'rest', 'done'])
    ap.add_argument('--category')
    ap.add_argument('--limit', type=int)
    ap.add_argument('--out', default=OUT)
    a = ap.parse_args()

    if a.dump:
        rows = json.load(open(a.dump, encoding='utf-8'))
        if a.program_ids:
            ids = set(json.load(open(a.program_ids, encoding='utf-8')))
            for r in rows:
                r['_in_program'] = r['id'] in ids
    else:
        rows, used = fetch_prod()
    items, collisions = build(rows)
    # Порядок фиксации: внутри волны — от дешёвого и доказанного класса к дорогому
    # (strength первым, олимпик последним), затем по целевой мышце, чтобы семья
    # держалась вместе и шаблон промпта не переписывали на каждой позиции.
    wave_order = {'core': 0, 'approved': 1, 'rest': 2, 'done': 3}
    cat_order = {'strength': 0, 'powerlifting': 1, 'stretching': 2,
                 'cardio': 3, 'plyometrics': 4, 'olympic weightlifting': 5}
    items.sort(key=lambda i: (wave_order.get(i['wave'], 9), cat_order.get(i['category'], 8),
                              i['primary'] or '', i['folder'] or ''))

    todo = [i for i in items if i['wave'] != 'done']
    summary = {
        'positions': len(items),
        'done': len(items) - len(todo),
        'todo': len(todo),
        'todo_by_wave': dict(Counter(i['wave'] for i in todo)),
        'todo_by_category': dict(Counter(i['category'] for i in todo)),
        'todo_without_reference': sum(1 for i in todo if i['ref'] == 'none'),
        'todo_missing_name_eng': sum(1 for i in todo if not i.get('name_eng')),
        'todo_folder_mismatch': sum(1 for i in todo if i['folder_mismatch']),
        'in_program_anon_visible': sum(1 for i in items if i['in_program']),
        'frames_needed': len(todo) * 2,
        'imagegen_calls_est': round(len(todo) * 2.36),
        'hours_est': round(sum(i['est_min'] for i in todo) / 60, 1),
        'name_eng_collisions_on_our_host': collisions,
        'note': ('волна core = can_be_activation + упражнения из программ, видимых анону '
                 '(RLS); через service_role упражнений в программах больше (~113)'),
    }
    doc = {'generated_from_prod_snapshot': True, 'unit_min': UNIT_MIN,
           'mult': MULT, 'noref_mult': NOREF_MULT, 'summary': summary, 'items': items}
    with open(a.out, 'w', encoding='utf-8') as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)

    print(json.dumps(summary, ensure_ascii=False, indent=1))
    sel = [i for i in todo if (not a.wave or i['wave'] == a.wave) and (not a.category or i['category'] == a.category)]
    if a.limit:
        sel = sel[:a.limit]
    if a.wave or a.category:
        print('\nвыбрано %d позиций (волна=%s, категория=%s):' % (len(sel), a.wave, a.category))
        for i in sel:
            print('  %-44s %-20s %-18s ref=%-8s %4.2f мин' % (
                (i['folder'] or '-')[:44], (i['category'] or '-')[:20], (i['primary'] or '-')[:18],
                i['ref'], i['est_min']))
    print('\nманифест:', os.path.relpath(a.out, ROOT))


if __name__ == '__main__':
    main()
