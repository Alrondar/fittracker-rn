# -*- coding: utf-8 -*-
"""Парный лист по подозреваемым: ОБА кадра, которые крутит приложение, из живого кэша.

Один кадр (0.jpg) честно показывает только стартовую фазу: у «Обратных выпадов»
в старте человек стоит, и это не дефект. Поэтому подозреваемых пересматриваем
по 0.jpg + 1.jpg, и берём файлы из refs/top100/live/ — ровно те байты, что отдаёт
media_url (сверка md5: check-upstream-mirror.py).

Запуск: python spark-output/export/build-top100-pairs.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
LIVE = os.path.join(ROOT, 'spark-output', 'export', 'refs', 'top100', 'live')
MEDIA = os.path.join(ROOT, 'data', 'exercises')
OUT = os.path.join(ROOT, 'spark-output', 'export', 'refs', 'top100')
CELL = (500, 334)

# rk: (folder, host, что проверяем)
ROWS = [
 (12, 'Wide-Grip_Lat_Pulldown', 'live', 'текст про турник, кадр про блок'),
 (34, 'Plank', 'live', 'кадр не похож на планку на локтях'),
 (53, 'Dumbbell_Rear_Lunge', 'live', 'в старте просто стоит — есть ли выпад во 2-м кадре'),
 (57, 'Reverse_Flyes', 'live', 'имя «в наклоне», текст «грудью на скамью»'),
 (20, 'Kettlebell_One-Legged_Deadlift', 'live', 'в старте стоит на двух — виден ли наклон'),
 (74, 'Hanging_Leg_Raise', 'live', 'кадр обрезан, ног не видно'),
 (98, 'Seated_Bent-Over_Rear_Delt_Raise', 'live', 'кадр не «сидя», а глубокое приседание'),
 (7, 'Triceps_Pushdown_-_Rope_Attachment', 'live', 'хват каната и локти у корпуса'),
 (22, 'Standing_Calf_Raises', 'live', 'стойка на платформе носками, пятки свободно'),
 (36, 'Calf_Press_On_The_Leg_Press_Machine', 'live', 'стопы на НИЖНЕМ крае платформы, работа в голеностопе'),
 (63, 'Single-Leg_High_Box_Squat', 'live', 'одна стопа полностью на высокой тумбе'),
 (78, 'Seated_Flat_Bench_Leg_Pull-In', 'live', 'сидя на краю скамьи, колени к груди'),
]


def font(size):
    for cand in ('arialbd.ttf', 'arial.ttf', 'segoeui.ttf'):
        try:
            return ImageFont.truetype(cand, size)
        except OSError:
            continue
    return ImageFont.load_default()


def path(folder, host, n):
    d = LIVE if host == 'live' else os.path.join(MEDIA, folder)
    return os.path.join(d, folder, n) if host == 'live' else os.path.join(d, n)


def main():
    f = font(20)
    fb = font(26)
    dr_font = font(18)
    for i in range(0, len(ROWS), 4):
        grp = ROWS[i:i + 4]
        W = CELL[0] * 2 + 30
        H = 4 * (CELL[1] + 74) + 20
        sheet = Image.new('RGB', (W, H), (16, 18, 22))
        d = ImageDraw.Draw(sheet)
        for k, (rk, folder, host, why) in enumerate(grp):
            y = 10 + k * (CELL[1] + 74)
            for j, n in enumerate(('0.jpg', '1.jpg')):
                p = path(folder, host, n)
                x = 10 + j * (CELL[0] + 10)
                if os.path.exists(p):
                    im = Image.open(p).convert('RGB').resize(CELL, Image.LANCZOS)
                    sheet.paste(im, (x, y))
                else:
                    d.rectangle([x, y, x + CELL[0], y + CELL[1]], outline=(200, 60, 60), width=3)
                    d.text((x + 8, y + 8), 'нет файла %s' % n, font=dr_font, fill=(240, 120, 120))
                d.text((x + 6, y + 6), '%d' % (j + 1), font=f, fill=(255, 220, 90))
            d.rectangle([10, y, W - 10, y + CELL[1]], outline=(70, 90, 120), width=2)
            d.text((12, y + CELL[1] + 4), '#%d %s' % (rk, folder), font=fb, fill=(232, 236, 244))
            d.text((12, y + CELL[1] + 34), 'проверка: %s' % why, font=dr_font, fill=(255, 200, 120))
        name = os.path.join(OUT, 'pairs-%d.png' % (i // 4 + 1))
        sheet.save(name, optimize=True)
        print(name)


if __name__ == '__main__':
    main()
