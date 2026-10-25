# -*- coding: utf-8 -*-
"""Листы приёмки по топ-100 популярных позиций (срез 21.10).

Зачем: `legacy-frame-audit.md` разбирал расхождения по всему каталогу, но не по
занятости. Здесь те же 100 строк, на которые приходится 1681 из 1742 вхождений в
программы и 2642 из 2667 строк истории, — то есть ровно то, что пользователи видят
чаще всего.

Ячейка = кадр, который приложение показывает первым: для строки на нашем хосте это
`00f.jpg`, для легаси — `0.jpg`. Разрешение ячейки 512x342: мелкий лист (330x183)
давал ложные находки (урок 12.10 — 2 из 19), поэтому лист большой и читается по
6 кадров на страницу.

Чего нет в `data/exercises` — скачивается в кэш `refs/top100-cache/`, а не в датасет:
чужие бинарники в репозиторий молча не кладём.

Запуск:
    python spark-output/export/build-top100-sheets.py --check    # что лежит локально
    python spark-output/export/build-top100-sheets.py            # собрать листы
"""
import argparse
import os
import urllib.request
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MEDIA = os.path.join(ROOT, 'data', 'exercises')
TSV = os.path.join(ROOT, 'spark-output', 'export', 'top100-2026-10-21.tsv')
OUT = os.path.join(ROOT, 'spark-output', 'export', 'refs', 'top100')
UP = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/'
CELL = (512, 342)
PER = 6


def rows():
    out = []
    for line in open(TSV, encoding='utf-8'):
        if not line.strip():
            continue
        rk, rid, name, eng, folder, sa, hh, host, tlen = line.rstrip('\n').split('\t')
        out.append(dict(rk=int(rk), id=rid, name=name, eng=eng, folder=folder,
                        sa=int(sa), hh=int(hh), host=host, tlen=int(tlen)))
    return out


def frame_path(r):
    """Файл, который приложение рисует первым для этой строки."""
    if r['host'] == 'our':
        p = os.path.join(MEDIA, r['folder'], '00f.jpg')
    else:
        p = os.path.join(MEDIA, r['folder'], '0.jpg')
    return p


def ensure_local(r):
    p = frame_path(r)
    if os.path.exists(p):
        return p, 'local'
    if r['host'] == 'our':
        return p, 'MISSING-OUR'          # наш кадр должен лежать в репозитории
    cache = os.path.join(OUT, 'cache', r['folder'], '0.jpg')
    if not os.path.exists(cache):
        os.makedirs(os.path.dirname(cache), exist_ok=True)
        tmp = cache + '.part'
        urllib.request.urlretrieve(UP + r['folder'] + '/0.jpg', tmp)
        os.replace(tmp, cache)
    return cache, 'fetched'


def font(size):
    for cand in ('arialbd.ttf', 'arial.ttf', 'segoeui.ttf', 'DejaVuSans-Bold.ttf'):
        try:
            return ImageFont.truetype(cand, size)
        except OSError:
            continue
    return ImageFont.load_default()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true', help='только что лежит локально')
    a = ap.parse_args()
    rs = rows()
    if a.check:
        miss = [r for r in rs if not os.path.exists(frame_path(r))]
        print('позиций: %d | кадра нет локально: %d' % (len(rs), len(miss)))
        for r in miss:
            print('  %3d %-6s %s' % (r['rk'], r['host'], r['folder']))
        return

    os.makedirs(OUT, exist_ok=True)
    f_big, f_small = font(56), font(22)
    sheets = 0
    for i in range(0, len(rs), PER):
        grp = rs[i:i + PER]
        cols, part = 2, (len(grp) + 1) // 2
        W = cols * CELL[0] + 24
        H = part * (CELL[1] + 58) + 24
        sheet = Image.new('RGB', (W, H), (16, 18, 22))
        dr = ImageDraw.Draw(sheet)
        for k, r in enumerate(grp):
            x = 12 + (k % cols) * (CELL[0] + 8)
            y = 12 + (k // cols) * (CELL[1] + 58)
            try:
                p, how = ensure_local(r)
                im = Image.open(p).convert('RGB').resize(CELL, Image.LANCZOS)
                sheet.paste(im, (x, y))
            except Exception as e:
                how = 'fail'
                dr.rectangle([x, y, x + CELL[0], y + CELL[1]], outline=(200, 60, 60), width=4)
                dr.text((x + 10, y + 10), 'НЕТ КАДРА: %s' % e, font=f_small, fill=(240, 120, 120))
            dr.rectangle([x, y, x + CELL[0] - 1, y + CELL[1] - 1], outline=(70, 90, 120), width=2)
            title = r['name'] if len(r['name']) <= 34 else r['name'][:33] + '…'
            dr.text((x + 8, y + CELL[1] + 4), '#%d %s' % (r['rk'], title), font=f_small, fill=(232, 236, 244))
            dr.text((x + 8, y + CELL[1] + 26), '%s · слоты %s · история %s · %s'
                    % (r['eng'], r['sa'], r['hh'], r['host']), font=f_small, fill=(140, 170, 210))
            dr.text((x + 8, y + 6), str(r['rk']), font=f_big, fill=(255, 220, 90))
            if how == 'fetched':
                dr.text((x + CELL[0] - 96, y + CELL[1] - 26), 'скачан', font=f_small, fill=(255, 220, 90))
        name = os.path.join(OUT, 'top100-%02d.png' % (i // PER + 1))
        sheet.save(name, optimize=True)
        print(name, sheet.size)
        sheets += 1
    print('листов:', sheets, '| позиций:', len(rs))


if __name__ == '__main__':
    main()
