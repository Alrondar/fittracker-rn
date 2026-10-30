# -*- coding: utf-8 -*-
"""Лист приёмки текущей пары кадров с горизонтальной сеткой 10 %,
чтобы масштаб между кадрами мерился, а не угадывался.
ITEMS меняется вместе с позицией партии (09.10 — подтягивания, 23.10 — мостик, пуловер, французский жим)."""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
VIBE = os.path.join(ROOT, 'vibe_images')
OUT = os.path.join(ROOT, 'spark-output', 'export', 'qc', 'upgrip-pair-grid-v2.jpg')
CELL = (620, 413)
PAD, LABEL = 10, 30


def font(size):
    for cand in ('arialbd.ttf', 'arial.ttf', 'segoeui.ttf'):
        try:
            return ImageFont.truetype(cand, size)
        except OSError:
            continue
    return ImageFont.load_default()


def newest(prefix):
    hits = [os.path.join(VIBE, f) for f in sorted(os.listdir(VIBE)) if f.startswith(prefix)]
    return hits[-1] if hits else None


ITEMS = [
    ('vibe_images/Underhand-Grip_Dumbbell_Bench_Press_start_v2_1793347649598_a51e2863.png', 'Жим обратным — кадр 1'),
    ('vibe_images/Underhand-Grip_Dumbbell_Bench_Press_finish_1793347520929_b91e1d23.png', 'Жим обратным — кадр 2'),
]

W = len(ITEMS) * CELL[0] + (len(ITEMS) + 1) * PAD
H = CELL[1] + LABEL + 2 * PAD
sheet = Image.new('RGB', (W, H), (18, 20, 24))
d = ImageDraw.Draw(sheet)
f = font(18)

for i, (path, cap) in enumerate(ITEMS):
    x = PAD + i * (CELL[0] + PAD)
    y = PAD
    im = Image.open(path).convert('RGB')
    im.thumbnail((CELL[0], CELL[1]), Image.LANCZOS)
    ox, oy = x + (CELL[0] - im.width) // 2, y + (CELL[1] - im.height) // 2
    sheet.paste(im, (ox, oy))
    # сетка по 10 % высоты кадра
    for k in range(1, 10):
        yy = oy + int(im.height * k / 10.0)
        col = (255, 215, 160) if k % 5 == 0 else (120, 140, 170)
        d.line([(ox, yy), (ox + im.width, yy)], fill=col, width=1)
        d.text((ox + 2, yy - 14), "%d%%" % (k * 10), fill=col, font=font(14))
    d.rectangle([ox, oy, ox + im.width - 1, oy + im.height - 1], outline=(90, 110, 140), width=1)
    d.text((x + 4, y + CELL[1] + 8), cap, fill=(226, 232, 240), font=f)

sheet.save(OUT, 'JPEG', quality=90, optimize=True)
print(OUT, sheet.size)
