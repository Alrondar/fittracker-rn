# -*- coding: utf-8 -*-
"""Замер офлайн-следа программы: структура + тексты упражнений + кадры свои и замен.

Зачем: решение «сохранить программу целиком» должно считаться по реальным
байтам, а не по средним. Структура и тексты берутся из прода (только чтение, тот
же анонимный ключ и RLS, что у приложения), кадры — с диска: `data/exercises/`
зеркалирует и наш хост, и upstream, поэтому размер рамы известен точно.

Запуск:
    python spark-output/export/measure-offline-footprint.py            # топ-8 программ
    python spark-output/export/measure-offline-footprint.py --limit 200 --all-own
"""
import argparse
import gzip
import io
import json
import os
from media_root import media_root
import re
import sys
import urllib.request
from collections import defaultdict

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DATA = media_root()
# Поля справочника, которые реально читают экраны (workoutService + detail + refs).
EX_SELECT = ('id,name,technique,benefits,risks,settings,media_url,'
             'primary_muscles,secondary_muscles,category,can_be_activation')
PE_SELECT = ('id,exercise_id,exercise_name,program_day_id,position,sets,reps_range,'
             'rest_seconds,intensity,target_rpe,progression_policy')

GENDERED = re.compile(r'^(.*/)00([fm])\.(jpg|jpeg|png|webp)$', re.I)
LEGACY = re.compile(r'^(.*/)(\d)\.(jpg|jpeg|png|webp)$', re.I)


def headers():
    cfg = json.load(io.open(os.path.join(ROOT, 'app.json'), encoding='utf-8'))['expo']['extra']
    base = cfg['supabaseUrl']
    key = cfg['supabaseAnonKey']
    return base, {'apikey': key, 'Authorization': 'Bearer %s' % key}


def get(base, hdr, path, limit=1000):
    """Постраничный GET: Supabase молча режет ответ на 1000 строк."""
    out, offset = [], 0
    while True:
        sep = '&' if '?' in path else '?'
        req = urllib.request.Request('%s%s%s%s=%d&%s=%d' % (base, path, sep, 'offset', offset, 'limit', limit),
                                     headers=hdr)
        with urllib.request.urlopen(req, timeout=60) as r:
            chunk = json.loads(r.read().decode('utf-8'))
        out.extend(chunk)
        if len(chunk) < limit:
            return out
        offset += limit


def frames_of(media_url, both_genders=False):
    """Те же две рамки, что достраивает parseMediaUrls, плюс вариант «обе пары»."""
    if not media_url:
        return []
    url = str(media_url).split('?')[0].strip()
    if not url:
        return []
    m = GENDERED.match(url)
    if m:
        prefix, ext = m.group(1), m.group(3)
        names = ['00f', '01f', '00m', '01m'] if both_genders else ['00f', '01f']
        return ['%s%s.%s' % (prefix, n, ext) for n in names]
    m = LEGACY.match(url)
    if m:
        return ['%s0.%s' % (m.group(1), m.group(3)), '%s1.%s' % (m.group(1), m.group(3))]
    return [url]


def local_bytes(url):
    """Байты кадра на диске: `data/exercises/` зеркалит и наш хост, и upstream."""
    for marker in ('/data/exercises/', '/exercises/'):
        idx = url.find(marker)
        if idx < 0:
            continue
        path = os.path.join(DATA, *url[idx + len(marker):].split('/'))
        return (os.path.getsize(path), path) if os.path.exists(path) else (None, path)
    return None, None


def kb(n):
    return '%.1f КБ' % (n / 1024.0)


def mb(n):
    return '%.2f МБ' % (n / 1024.0 / 1024.0)


def dump(rows):
    """Как это прилетит по сети (JSON) — и ровно те же байты в стиснутом виде."""
    return json.dumps(rows, ensure_ascii=False, separators=(',', ':')).encode('utf-8')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--top', type=int, default=8, help='показать N программ')
    ap.add_argument('--both-genders', action='store_true', help='кадры обеих пар (Ж и М), а не одной')
    a = ap.parse_args()

    base, hdr = headers()
    try:
        exercises = {e['id']: e for e in get(base, hdr, '/rest/v1/exercises?select=%s&order=id' % EX_SELECT)}
        rels = get(base, hdr, "/rest/v1/exercise_relationships?select=exercise_id,related_exercise_id,status"
                              "&status=in.(approved,suggested)&order=exercise_id")
        days = get(base, hdr, '/rest/v1/program_days?select=id,program_id,name,day_number,week_number,'
                              'phase_id&order=id')
        pes = get(base, hdr, '/rest/v1/program_exercises?select=%s&order=id' % PE_SELECT)
        programs = get(base, hdr, '/rest/v1/programs?select=id,name,created_by&order=id')
    except Exception as e:
        detail = ''
        body = getattr(e, 'read', None)
        if body:
            try:
                detail = ' — ' + e.read().decode('utf-8')[:300]
            except Exception:
                detail = ''
        sys.exit('прод недоступен (%s%s): снять блокирование запроса или поправить select' % (e, detail))

    alt_by_ex = defaultdict(set)
    for r in rels:
        if r['related_exercise_id'] and r['related_exercise_id'] != r['exercise_id']:
            alt_by_ex[r['exercise_id']].add(r['related_exercise_id'])

    day_ids_by_prog = defaultdict(list)
    day_row_by_id = {}
    for d in days:
        day_ids_by_prog[d['program_id']].append(d['id'])
        day_row_by_id[d['id']] = d
    pe_by_day = defaultdict(list)
    for pe in pes:
        pe_by_day[pe['program_day_id']].append(pe)

    both = a.both_genders
    report = []
    missing_frames = 0
    union_own, union_alt = set(), set()

    for p in programs:
        pid = p['id']
        day_ids = day_ids_by_prog.get(pid, [])
        if not day_ids:
            continue
        pe_rows = [pe for d in day_ids for pe in pe_by_day.get(d, [])]
        ex_ids = []
        for pe in pe_rows:
            if pe['exercise_id'] and pe['exercise_id'] not in ex_ids:
                ex_ids.append(pe['exercise_id'])
        alt_ids = []
        for ex_id in ex_ids:
            for alt in sorted(alt_by_ex.get(ex_id, ())):
                if alt not in ex_ids and alt not in alt_ids:
                    alt_ids.append(alt)

        structure_rows = [day_row_by_id[d] for d in day_ids] + pe_rows
        text_rows = [exercises[i] for i in ex_ids if i in exercises]
        alt_text_rows = [exercises[i] for i in alt_ids if i in exercises]
        structure_payload = dump(structure_rows)
        text_payload = dump(text_rows)
        alt_text_payload = dump(alt_text_rows)

        def frames_total(ids, sink=None):
            nonlocal missing_frames
            total, count = 0, 0
            for i in ids:
                for url in frames_of(exercises.get(i, {}).get('media_url'), both):
                    if sink is not None:
                        sink.add(url)
                    size, _ = local_bytes(url)
                    if size is None:
                        missing_frames += 1
                        continue
                    total += size
                    count += 1
            return total, count

        own_frames, own_frames_n = frames_total(ex_ids, union_own)
        alt_frames, alt_frames_n = frames_total(alt_ids, union_alt)

        report.append({
            'name': p['name'],
            'own': p['created_by'] is None,
            'days': len(day_ids),
            'rows': len(pe_rows),
            'ex': len(ex_ids),
            'ex_missing': len([i for i in ex_ids if i not in exercises]),
            'alts': len(alt_ids),
            'structure': len(structure_payload),
            'structure_gz': len(gzip.compress(structure_payload, 9)),
            'text': len(text_payload),
            'text_gz': len(gzip.compress(text_payload, 9)),
            'alt_text': len(alt_text_payload),
            'alt_text_gz': len(gzip.compress(alt_text_payload, 9)),
            'frames': own_frames, 'frames_n': own_frames_n,
            'alt_frames': alt_frames, 'alt_frames_n': alt_frames_n,
        })

    report.sort(key=lambda r: -(r['structure'] + r['text'] + r['alt_text'] + r['frames'] + r['alt_frames']))

    def human(n):
        return mb(n) if n >= 1024 * 1024 else kb(n)

    print('кадров не найдено на диске (в счёт идут нулём): %d' % missing_frames)
    print('параметр: %s' % ('кадры обеих пар (Ж и М)' if both else 'кадры одной пары (профиль пользователя)'))
    print('всего программ с днями: %d\n' % len(report))

    for n, r in enumerate(report[:a.top], 1):
        total = r['structure'] + r['text'] + r['alt_text'] + r['frames'] + r['alt_frames']
        kind = 'каталожная' if r['own'] else 'личная'
        print('%d. %s (%s)' % (n, r['name'], kind))
        print('   дней %d · строк упражнений %d · уникальных упражнений %d (нет в справочнике: %d) · замен к ним %d'
              % (r['days'], r['rows'], r['ex'], r['ex_missing'], r['alts']))
        print('   структура: %-9s (по сети %-9s)' % (human(r['structure']), human(r['structure_gz'])))
        print('   тексты:    %-9s (по сети %-9s)' % (human(r['text']), human(r['text_gz'])))
        print('   кадры:    %-9s %d шт' % (human(r['frames']), r['frames_n']))
        print('   замены:    тексты %-9s (по сети %-9s), кадры %-9s %d шт'
              % (human(r['alt_text']), human(r['alt_text_gz']), human(r['alt_frames']), r['alt_frames_n']))
        print('   ИТОГО на устройстве: %s   (без кадров: %s)\n'
              % (human(total), human(r['structure'] + r['text'] + r['alt_text'])))

    sum_struct = sum(r['structure'] for r in report)
    sum_struct_gz = sum(r['structure_gz'] for r in report)
    sum_text = sum(r['text'] for r in report)
    sum_text_gz = sum(r['text_gz'] for r in report)
    sum_frames = sum(r['frames'] for r in report)
    sum_frames_n = sum(r['frames_n'] for r in report)
    sum_alt_text = sum(r['alt_text'] for r in report)
    sum_alt_frames = sum(r['alt_frames'] for r in report)
    sum_alt_frames_n = sum(r['alt_frames_n'] for r in report)

    print('=== все %d программ разом (без дедупликации между программами) ===' % len(report))
    print('структура:            %s (по сети %s)' % (human(sum_struct), human(sum_struct_gz)))
    print('тексты упражнений:    %s (по сети %s)' % (human(sum_text), human(sum_text_gz)))
    print('кадры упражнений:     %s (%d шт)' % (human(sum_frames), sum_frames_n))
    print('тексты замен:         %s' % human(sum_alt_text))
    print('кадры замен:          %s (%d шт)' % (human(sum_alt_frames), sum_alt_frames_n))
    print('ВСЕГО:                %s' % human(sum_struct + sum_text + sum_frames + sum_alt_text + sum_alt_frames))

    def union_size(urls):
        total = 0
        for url in urls:
            size, _ = local_bytes(url)
            total += size or 0
        return total

    u_own, u_alt = union_size(union_own), union_size(union_alt)
    print('\n=== без повторов между программами (одно и то же упражнение один раз) ===')
    print('уникальных кадров программ:  %d шт — %s' % (len(union_own), human(u_own)))
    print('уникальных кадров замен:     %d шт — %s' % (len(union_alt), human(u_alt)))
    print('кадры вообще (программы + замены): %s' % human(u_own + u_alt))


if __name__ == '__main__':
    main()
