# -*- coding: utf-8 -*-
"""Искать склейку-коллаж внутри одного кадра.

Модель иногда возвращает один холст 1536x1024, внутри которого ДВА кадра
(верхний и нижний ракурсы одной позы). Приёмка глазами это ловит не всегда,
а в карточке с `cover` получается мусор — найден на мужском старте
Smith_Machine_Hip_Thrust 09.10.

Эвристика: горизонтальный шов = строка, которая заметно светлее (или темнее)
соседей и тянется через всю ширину. Смотрим только среднюю треть кадра — там
никогда нет настоящей границы фона, а у коллажа она ровно посередине.

Запуск:  python spark-output/export/detect-panel-seams.py [--all | --ids A,B]
"""
import argparse
import os
import sys

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DS = os.path.join(ROOT, 'data', 'exercises')
FILES = ('00f.jpg', '01f.jpg', '00m.jpg', '01m.jpg', '0.jpg', '1.jpg')


def profile(path, axis):
    """Средняя яркость каждой строки (axis='row') или колонки (axis='col').

    numpy в этом python нет, а усреднение по одной оси даёт сам resize до
    1 пикселя поперёк — LANCZOS считает ровно среднее по полосе.
    """
    im = Image.open(path).convert('L')
    w, h = im.size
    strip = im.resize((1, h), Image.LANCZOS) if axis == 'row' else im.resize((w, 1), Image.LANCZOS)
    return list(strip.tobytes()), (h if axis == 'row' else w)


def best_seam(vals, n):
    # Шов коллажа — посередине кадра; среднюю треть не смотрим целиком, иначе
    # детектор ловит нижнюю кромку скамьи и линию пола (ложные срабатывания
    # на y=0.72..0.99 при пороге 55).
    lo, hi = int(n * 0.42), int(n * 0.58)
    best, best_pos = 0.0, -1
    for y in range(max(1, lo), min(n - 2, hi)):
        up = sum(vals[max(0, y - 12):y]) / max(1, len(vals[max(0, y - 12):y]))
        dn = sum(vals[y + 1:y + 13]) / max(1, len(vals[y + 1:y + 13]))
        band = (vals[y] + vals[y + 1]) / 2.0
        gap = abs(band - (up + dn) / 2.0)
        jump = abs(vals[y] - vals[y - 1]) + abs(vals[y + 1] - vals[y])
        score = min(gap, 60) + min(jump, 60)
        if score > best:
            best, best_pos = score, y
    return best, best_pos


def seam_score(path):
    rows, h = profile(path, 'row')
    cols, w = profile(path, 'col')
    sr, yr = best_seam(rows, h)
    sc, xc = best_seam(cols, w)
    return (sr, yr) if sr >= sc else (sc, xc)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ids', help='папки через запятую')
    ap.add_argument('--all', action='store_true', help='пройтись по всей папке')
    ap.add_argument('--threshold', type=float, default=70.0)
    args = ap.parse_args()

    if args.all:
        folders = sorted(f for f in os.listdir(DS) if os.path.isdir(os.path.join(DS, f)))
    elif args.ids:
        folders = [f.strip() for f in args.ids.split(',') if f.strip()]
    else:
        print('нужно --all или --ids')
        return 2

    bad = 0
    for folder in folders:
        for fn in FILES:
            p = os.path.join(DS, folder, fn)
            if not os.path.exists(p):
                continue
            score, pos = seam_score(p)
            if score >= args.threshold:
                bad += 1
                print('  ШОВ  %-42s %-9s score=%5.1f  линия %d' % (folder, fn, score, pos))
    print('проверено папок: %d, подозрительных кадров: %d' % (len(folders), bad))
    return 0


if __name__ == '__main__':
    sys.exit(main())
