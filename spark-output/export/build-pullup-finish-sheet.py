# -*- coding: utf-8 -*-
"""Лист приёмки финишного кадра «Подтягивания широким хватом»: три прогона + принятая
пара соседней строки, чтобы решить, где реально дефект, а где язык пачки."""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
VIBE = os.path.join(ROOT, 'vibe_images')
MEDIA = os.path.join(ROOT, 'data', 'exercises')
LIVE = os.path.join(ROOT, 'spark-output', 'export', 'refs', 'top100', 'live')
OUT = os.path.join(ROOT, 'spark-output', 'export', 'qc', 'pullup-finish-23-10.jpg')

CELL = (500, 334)
PAD = 8
LABEL = 26


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


ROWS = [
    [
        (newest('Wide-Grip_Pull-Up_start_'), 'наш старт v1 — вис, хват широкий'),
        (newest('Wide-Grip_Pull-Up_finish_1'), 'финиш v1 — гриф у шеи, шорты и корпус разъехались'),
        (newest('Wide-Grip_Pull-Up_finish_v2'), 'финиш v2 — одежда встала, гриф всё ещё у челюсти'),
        (newest('Wide-Grip_Pull-Up_finish_v3'), 'финиш v3 — то же; стойка сменилась целиком'),
    ],
    [
        (os.path.join(LIVE, 'Wide-Grip_Lat_Pulldown', '0.jpg'),
         'ЧТО СЕЙЧАС ВИДИТ КЛИЕНТ: тяга блока сидя'),
        (os.path.join(MEDIA, 'Pullups', '00f.jpg'), 'ПРИНЯТАЯ ПАРА «Подтягивания» — старт'),
        (os.path.join(MEDIA, 'Pullups', '01f.jpg'), 'та же пара — финиш: гриф у трапеций, '
                                                    'голова сверху. Тот же язык, что у v2/v3'),
        (None, 'вывод: «гриф у шеи» — не брак генерации, а то, как пачка рисует верх подтягиваний '
               'со спины; реальный дискриминатор против соседней строки — только ширина хвата'),
    ],
]

cols = len(ROWS[0])
W = cols * CELL[0] + (cols + 1) * PAD
H = len(ROWS) * (CELL[1] + LABEL + PAD) + PAD
sheet = Image.new('RGB', (W, H), (18, 20, 24))
d = ImageDraw.Draw(sheet)
f = font(17)

for ri, row in enumerate(ROWS):
    y = PAD + ri * (CELL[1] + LABEL + PAD)
    for ci, (path, cap) in enumerate(row):
        x = PAD + ci * (CELL[0] + PAD)
        if path and os.path.exists(path):
            im = Image.open(path).convert('RGB')
            im.thumbnail(CELL, Image.LANCZOS)
            sheet.paste(im, (x + (CELL[0] - im.width) // 2, y + (CELL[1] - im.height) // 2))
        else:
            d.rectangle([x, y, x + CELL[0], y + CELL[1]], fill=(28, 32, 40))
        d.text((x + 4, y + CELL[1] + 6), cap, fill=(226, 232, 240), font=f)

sheet.save(OUT, 'JPEG', quality=88, optimize=True)
print(OUT, sheet.size)
