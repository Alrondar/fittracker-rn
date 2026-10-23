# -*- coding: utf-8 -*-
"""Сверка локального зеркала апстримных кадров с тем, что реально читает клиент.

Зачем: приложение для легаси-строки тянет <folder>/0.jpg и 1.jpg прямо с
yuhonas/free-exercise-db. В `data/exercises` лежит наша копия тех же имён, и если
копия разошлась с апстримом, любой визуальный вердикт по локальному файлу говорит
про картинку, которой пользователь не видит. Проверка — md5 по обоим кадрам.

Запуск:
    python spark-output/export/check-upstream-mirror.py            # топ-100 из TSV
    python spark-output/export/check-upstream-mirror.py --ids a,b  # конкретные папки
"""
import argparse
import hashlib
import json
import os
import urllib.request
import urllib.error

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MEDIA = os.path.join(ROOT, 'data', 'exercises')
TSV = os.path.join(ROOT, 'spark-output', 'export', 'top100-2026-10-21.tsv')
CACHE = os.path.join(ROOT, 'spark-output', 'export', 'refs', 'top100', 'live')
UP = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/'


def md5(path):
    if not os.path.exists(path):
        return None
    h = hashlib.md5()
    with open(path, 'rb') as f:
        h.update(f.read())
    return h.hexdigest()


def live(folder, name):
    dst = os.path.join(CACHE, folder, name)
    if os.path.exists(dst):
        return dst
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    try:
        with urllib.request.urlopen(UP + folder + '/' + name, timeout=30) as r:
            data = r.read()
    except urllib.error.HTTPError as e:
        return 'HTTP %d' % e.code
    tmp = dst + '.part'
    open(tmp, 'wb').write(data)
    os.replace(tmp, dst)
    return dst


def rows():
    out = []
    for line in open(TSV, encoding='utf-8'):
        if not line.strip():
            continue
        rk, rid, name, eng, folder, sa, hh, host, tlen = line.rstrip('\n').split('\t')
        out.append(dict(rk=int(rk), id=rid, name=name, eng=eng, folder=folder,
                        sa=int(sa), hh=int(hh), host=host))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ids', help='проверить конкретные папки через запятую')
    a = ap.parse_args()
    rs = rows()
    if a.ids:
        want = set(a.ids.split(','))
        rs = [r for r in rs if r['folder'] in want]
    report, same = [], 0
    for r in rs:
        if r['host'] != 'up':
            continue
        line = {'rk': r['rk'], 'folder': r['folder'], 'name': r['name'], 'sa': r['sa'], 'hh': r['hh']}
        ok = True
        for n in ('0.jpg', '1.jpg'):
            got = live(r['folder'], n)
            loc = os.path.join(MEDIA, r['folder'], n)
            if isinstance(got, str) and got.startswith('HTTP'):
                line[n] = got
                ok = False
                continue
            lm, gm = md5(loc), md5(got)
            if lm is None:
                line[n] = 'локального нет'
                ok = False
            elif lm == gm:
                line[n] = 'совпадает'
            else:
                line[n] = 'РАЗХОЖДЕНИЕ %s vs %s' % (gm[:8], lm[:8])
                ok = False
        same += ok
        report.append(line)
    print('проверено легаси-строк: %d | зеркало целое: %d' % (len(report), same))
    for line in report:
        flags = [k for k in ('0.jpg', '1.jpg') if line[k] != 'совпадает']
        if flags:
            print('  #%3d %-52s %s | %s | %s' % (line['rk'], line['folder'][:52],
                  line['0.jpg'], line['1.jpg'], line['name']))
    json.dump(report, open(os.path.join(ROOT, 'spark-output', 'export', 'refs', 'top100',
                                        'mirror-check.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
