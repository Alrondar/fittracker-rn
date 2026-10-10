# -*- coding: utf-8 -*-
"""QC-лист кадров техники: 2x2 сетка (00f/01f сверху, 00m/01m снизу) на позицию.

Нужен для визуальной приёмки пары: смотрим, что в паре совпали угол и дистанция,
взгляд и рабочая нога не переехали, снаряд в работе, «рентген» на нужной мышце.
По одному листу на позицию — в 2x2 кадр остаётся достаточно пикселей, чтобы
различить направление взгляда и постановку стопы.

Запуск:  python spark-output/export/build-qc-sheet.py --ids Smith_Machine_Hip_Thrust
Вывод:   spark-output/export/qc/<FolderId>.jpg
"""
import argparse
import os

from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DS = os.path.join(ROOT, 'data', 'exercises')
OUT_DIR = os.path.join(os.path.dirname(__file__), 'qc')

CELL_W, CELL_H = 640, 427   # 850x567 -> масштаб 0.75, пропорции те же
PAD = 14
LABEL_H = 26


def sheet(folder):
    src = os.path.join(DS, folder)
    cells = [('00f.jpg', 'start / female'), ('01f.jpg', 'finish / female'),
             ('00m.jpg', 'start / male'), ('01m.jpg', 'finish / male')]
    found = []
    for fn, cap in cells:
        p = os.path.join(src, fn)
        if os.path.exists(p):
            im0 = Image.open(p)
            found.append((im0.convert('RGB').resize((CELL_W, CELL_H)), cap, im0.size))
    if not found:
        print('  %s: кадров нет' % folder)
        return None

    cols, rows = 2, (len(found) + 1) // 2
    W = cols * CELL_W + (cols + 1) * PAD
    H = rows * (CELL_H + LABEL_H) + (rows + 1) * PAD
    canvas = Image.new('RGB', (W, H), (24, 26, 30))
    d = ImageDraw.Draw(canvas)
    d.text((PAD, 6), folder, fill=(235, 235, 235))
    for i, (im, cap, src_size) in enumerate(found):
        r, c = divmod(i, cols)
        x = PAD + c * (CELL_W + PAD)
        y = PAD + LABEL_H + r * (CELL_H + LABEL_H + PAD)
        canvas.paste(im, (x, y))
        d.text((x, y - LABEL_H + 4), '%s  %dx%d  %d КБ' % (cap, src_size[0], src_size[1],
               os.path.getsize(os.path.join(src, cells[i][0])) // 1024), fill=(180, 200, 220))
    os.makedirs(OUT_DIR, exist_ok=True)
    dst = os.path.join(OUT_DIR, '%s.jpg' % folder)
    canvas.save(dst, 'JPEG', quality=90)
    print('  %-40s -> %s (%dx%d, %d КБ)' % (folder, os.path.relpath(dst, ROOT), W, H,
                                            os.path.getsize(dst) // 1024))
    return dst


def combined(folders, name='all'):
    """Один лист: строки = 00f/01f/00m/01m, столбцы = позиции. Ячейки мельче,
    но хватает, чтобы сравнить дистанцию и разворот внутри пары."""
    cols = len(folders)
    cw, ch = 430, 287
    rows = 4
    row_caps = ['start / female', 'finish / female', 'start / male', 'finish / male']
    files = ['00f.jpg', '01f.jpg', '00m.jpg', '01m.jpg']
    W = cols * cw + (cols + 1) * PAD
    H = rows * (ch + LABEL_H) + (rows + 1) * PAD + LABEL_H
    canvas = Image.new('RGB', (W, H), (24, 26, 30))
    d = ImageDraw.Draw(canvas)
    for c, folder in enumerate(folders):
        x = PAD + c * (cw + PAD)
        d.text((x, 6), folder, fill=(235, 235, 235))
        for r, fn in enumerate(files):
            p = os.path.join(DS, folder, fn)
            y = LABEL_H + PAD + r * (ch + LABEL_H + PAD)
            if os.path.exists(p):
                canvas.paste(Image.open(p).convert('RGB').resize((cw, ch)), (x, y))
            else:
                d.rectangle([x, y, x + cw, y + ch], outline=(90, 40, 40), width=3)
                d.text((x + 8, y + ch // 2), 'НЕТ КАДРА', fill=(220, 120, 120))
            d.text((x, y - LABEL_H + 4), row_caps[r], fill=(150, 170, 190))
    os.makedirs(OUT_DIR, exist_ok=True)
    dst = os.path.join(OUT_DIR, '%s.jpg' % name)
    canvas.save(dst, 'JPEG', quality=88)
    print('  %-40s -> %s (%dx%d, %d КБ)' % ('combined', os.path.relpath(dst, ROOT), W, H,
                                            os.path.getsize(dst) // 1024))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ids', required=True, help='через запятую: папки в data/exercises')
    ap.add_argument('--combined', action='store_true', help='один общий лист вместо 2x2 на позицию')
    ap.add_argument('--name', default='all')
    args = ap.parse_args()
    folders = [f.strip() for f in args.ids.split(',') if f.strip()]
    if args.combined:
        combined(folders, args.name)
    else:
        for folder in folders:
            sheet(folder)


if __name__ == '__main__':
    main()
