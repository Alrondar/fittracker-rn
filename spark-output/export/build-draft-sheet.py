# -*- coding: utf-8 -*-
"""Контакт-лист ЧЕРНОВИКОВ из vibe_images (до раскладки в data/exercises).

Нужен, когда кадр ещё не положен в папку позиции: собираем newest *_start / *_finish
(опционально *_start_m / *_finish_m) и сравниваем разворот, дистанцию и подсветку
одним изображением.

Запуск:
  python -X utf8 spark-output/export/build-draft-sheet.py --ids A,B --name batch2-f
  python -X utf8 spark-output/export/build-draft-sheet.py --ids A,B --gender m --name batch2-m

Вывод: spark-output/export/qc/<name>.jpg
"""
import argparse
import glob
import os

from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DRAFTS = os.path.join(ROOT, 'vibe_images')
OUT_DIR = os.path.join(os.path.dirname(__file__), 'qc')

PHASES = {'f': [('_start_', 'female start'), ('_finish_', 'female finish')],
          'm': [('_start_m_', 'male start'), ('_finish_m_', 'male finish')]}


def newest(folder, infix):
    hits = sorted(glob.glob(os.path.join(DRAFTS, '%s%s*.png' % (folder, infix))))
    return hits[-1] if hits else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ids', required=True)
    ap.add_argument('--gender', default='f', choices=['f', 'm', 'both'])
    ap.add_argument('--name', default='drafts')
    ap.add_argument('--cols', type=int, default=2)
    args = ap.parse_args()

    folders = [f.strip() for f in args.ids.split(',') if f.strip()]
    genders = ['f', 'm'] if args.gender == 'both' else [args.gender]
    rows = []
    for folder in folders:
        cells = []
        for g in genders:
            for infix, cap in PHASES[g]:
                p = newest(folder, infix)
                cells.append((cap, p))
        rows.append((folder, cells))

    # ячейка позиции: старт и финиш рядом по горизонтали, гендеры — строками
    cw, pad, lab = 760, 14, 22
    cols = args.cols
    sub = 2
    sw = cw // sub
    sh = int(sw / 1.5)
    rows_in_cell = len(genders)
    cell_h = rows_in_cell * (sh + lab) + (rows_in_cell - 1) * 4
    pitch = lab + cell_h + 2 * pad
    nrows = (len(rows) + cols - 1) // cols
    W = cols * (cw + 2 * pad) + pad
    H = nrows * pitch + pad
    canvas = Image.new('RGB', (W, H), (22, 24, 28))
    d = ImageDraw.Draw(canvas)
    for i, (folder, cells) in enumerate(rows):
        r, c = divmod(i, cols)
        x0 = pad + c * (cw + 2 * pad)
        y0 = pad + r * pitch
        d.text((x0, y0), folder, fill=(235, 235, 235))
        for j, (cap, p) in enumerate(cells):
            sr, sc = divmod(j, sub)
            x = x0 + sc * (sw + 4)
            y = y0 + lab + sr * (sh + lab + 4)
            if p:
                canvas.paste(Image.open(p).convert('RGB').resize((sw, sh)), (x, y))
                d.text((x, y + sh + 2), cap, fill=(170, 195, 220))
            else:
                d.rectangle([x, y, x + sw, y + sh], outline=(95, 45, 45), width=3)
                d.text((x + 6, y + sh // 2), cap + '  NO DRAFT', fill=(220, 120, 120))
    os.makedirs(OUT_DIR, exist_ok=True)
    dst = os.path.join(OUT_DIR, '%s.jpg' % args.name)
    canvas.save(dst, 'JPEG', quality=88)
    print('-> %s (%dx%d, %d KB)' % (os.path.relpath(dst, ROOT), W, H,
                                    os.path.getsize(dst) // 1024))


if __name__ == '__main__':
    main()
