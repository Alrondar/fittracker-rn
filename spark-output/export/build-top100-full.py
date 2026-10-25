# -*- coding: utf-8 -*-
"""Полный проход по топ-100: ОБА кадра каждой строки, листами по 4 строки.

Зачем: стартовый кадр честен только наполовину. У `99e41686` («Планка») неверен именно
старт при верном втором кадре, у `8c31971a` («Обратные выпады») наоборот — в старте
человек стоит, и это правильно по тексту. Вывод по одному кадру не ставится.

Откуда файлы:
  * легаси-строки — из refs/top100/live/<папка>/{0,1}.jpg, то есть ровно те байты, что
    отдаёт media_url (сверка md5: check-upstream-mirror.py, 70 из 71 совпали);
  * наши строки — data/exercises/<папка>/{00f,01f}.jpg (женская пара; мужская
    отличается только персонажем, позу задаёт тот же промпт).

Текст техники на лист НЕ печатается: он читается из прод-запроса тем же чанком, чтобы
не переписывать 30 КБ руками и не разъезжаться с оригиналом.

Запуск:
    python spark-output/export/build-top100-full.py --from 1 --to 18
    python spark-output/export/build-top100-full.py --skip 7,12,20,22,34,36,53,57,63,74,78,95,98
"""
import argparse
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MEDIA = os.path.join(ROOT, 'data', 'exercises')
LIVE = os.path.join(ROOT, 'spark-output', 'export', 'refs', 'top100', 'live')
TSV = os.path.join(ROOT, 'spark-output', 'export', 'top100-2026-10-21.tsv')
OUT = os.path.join(ROOT, 'spark-output', 'export', 'refs', 'top100', 'full')
CELL = (500, 334)
PER = 4


def rows():
    out = []
    for line in open(TSV, encoding='utf-8'):
        if not line.strip():
            continue
        rk, rid, name, eng, folder, sa, hh, host, tlen = line.rstrip('\n').split('\t')
        out.append(dict(rk=int(rk), id=rid, name=name, eng=eng, folder=folder,
                        sa=int(sa), hh=int(hh), host=host))
    return out


def frames(r):
    if r['host'] == 'our':
        return [os.path.join(MEDIA, r['folder'], n) for n in ('00f.jpg', '01f.jpg')]
    return [os.path.join(LIVE, r['folder'], n) for n in ('0.jpg', '1.jpg')]


def font(size):
    for cand in ('arialbd.ttf', 'arial.ttf', 'segoeui.ttf'):
        try:
            return ImageFont.truetype(cand, size)
        except OSError:
            continue
    return ImageFont.load_default()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--from', dest='lo', type=int, default=1)
    ap.add_argument('--to', dest='hi', type=int, default=100)
    ap.add_argument('--skip', help='rk через запятую, уже разобранные на pairs-листах')
    a = ap.parse_args()
    skip = {int(x) for x in (a.skip.split(',') if a.skip else [])}
    rs = [r for r in rows() if a.lo <= r['rk'] <= a.hi and r['rk'] not in skip]
    os.makedirs(OUT, exist_ok=True)
    f_name, f_small = font(24), font(18)
    W = CELL[0] * 2 + 30
    H = PER * (CELL[1] + 78) + 20
    miss = []
    for i in range(0, len(rs), PER):
        grp = rs[i:i + PER]
        sheet = Image.new('RGB', (W, H), (16, 18, 22))
        d = ImageDraw.Draw(sheet)
        for k, r in enumerate(grp):
            y = 10 + k * (CELL[1] + 78)
            for j, p in enumerate(frames(r)):
                x = 10 + j * (CELL[0] + 10)
                if os.path.exists(p):
                    im = Image.open(p).convert('RGB').resize(CELL, Image.LANCZOS)
                    sheet.paste(im, (x, y))
                else:
                    miss.append((r['rk'], os.path.relpath(p, ROOT)))
                    d.rectangle([x, y, x + CELL[0], y + CELL[1]], outline=(200, 60, 60), width=3)
                    d.text((x + 8, y + 8), 'нет файла', font=f_small, fill=(240, 120, 120))
                d.text((x + 6, y + 6), str(j + 1), font=f_name, fill=(255, 220, 90))
            d.rectangle([10, y, W - 10, y + CELL[1]], outline=(70, 90, 120), width=2)
            title = r['name'] if len(r['name']) <= 46 else r['name'][:45] + '…'
            d.text((12, y + CELL[1] + 4), '#%d %s  [%s]' % (r['rk'], title, r['host']),
                   font=f_name, fill=(232, 236, 244))
            d.text((12, y + CELL[1] + 34), '%s · слоты %d · история %d · %s'
                   % (r['eng'], r['sa'], r['hh'], r['folder']), font=f_small, fill=(150, 178, 214))
        name = os.path.join(OUT, 'full-%03d.png' % grp[0]['rk'])
        sheet.save(name, optimize=True)
        print(name, 'строки: %s' % ','.join(str(r['rk']) for r in grp))
    if miss:
        print('НЕТ ФАЙЛОВ (%d):' % len(miss))
        [print('  #%d %s' % m) for m in miss]


if __name__ == '__main__':
    main()
