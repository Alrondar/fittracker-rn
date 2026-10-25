# -*- coding: utf-8 -*-
"""Раскладка сгенерированных кадров в структуру датасета (data/exercises).

Каждая позиция = папка data/exercises/<Id>/ с кадрами 0.jpg (старт) и 1.jpg (финиш),
850x567 (3:2) — формат, который каталог использует в 93% случаев и при котором
pickMediaFit (src/utils/mediaFit.ts) оставляет cover без letterbox.

Исходники лежат в vibe_images/ (в .gitignore, расходник). Конвенция имени файла
генерации — <Id>_start / <Id>_finish, где <Id> = name_eng с «_» (то же имя, что и
папка). Тогда раскладка не требует правки этого файла. Стилистические правила и
порядок волны — spark-output/export/illustration-style-lock.md.

Запуск:
    python spark-output/export/build-illustrations.py --ids Clamshell,Bent-Over_T-Raise
    python spark-output/export/build-illustrations.py --all      # всё, что есть по конвенции
    python spark-output/export/build-illustrations.py --legacy   # партия CAT-1 по MAP ниже

Состояние на 08.10: черновики CAT-1 (86 МБ) удалены в корзину, готовые 32 кадра
закоммичены в data/exercises. --legacy работает только если вернуть vibe_images;
просто пересобрать листов уже не чем — правь кадры в data/exercises или перегенерируй.
"""
import argparse
import glob
import os
from media_root import media_root
import re
import sys

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'vibe_images')
DST = media_root(required=False)  # кадры живут в соседнем репозитории медиа
os.makedirs(DST, exist_ok=True)
SIZE = (850, 567)
QUALITY = 88

# Legacy: партия CAT-1 названа короткими префиксами, не по конвенции — оставлено,
# чтобы тот запуск можно было воспроизвести из истории.
MAP = [
    ('Smith_Machine_Hip_Thrust', 'Smith_Hip_Thrust_start_v6', 'Smith_Hip_Thrust_finish_v6'),
    ('Dumbbell_Hip_Thrust', 'Dumbbell_Hip_Thrust_start', 'Dumbbell_Hip_Thrust_finish'),
    ('Single-Leg_Hip_Thrust', 'Single_Leg_Hip_Thrust_start', 'Single_Leg_Hip_Thrust_finish'),
    ('Machine_Hip_Thrust', 'Machine_Hip_Thrust_start', 'Machine_Hip_Thrust_finish'),
    ('Low_Cable_Hip_Abduction', 'Low_Cable_Hip_Abduction_start', 'Low_Cable_Hip_Abduction_finish'),
    ('High_Cable_Hip_Abduction', 'High_Cable_Hip_Abduction_start', 'High_Cable_Hip_Abduction_finish'),
    ('Cable_Hip_Extension_at_45_Degrees', 'Cable_Hip_Extension_45_start', 'Cable_Hip_Extension_45_finish'),
    ('Clamshell', 'Clamshell_start', 'Clamshell_finish'),
    ('Dumbbell_Romanian_Deadlift', 'Dumbbell_Romanian_Deadlift_start', 'Dumbbell_Romanian_Deadlift_finish'),
    ('B-Stance_Dumbbell_Romanian_Deadlift', 'B_Stance_RDL_start', 'B_Stance_RDL_finish'),
    ('Rotational_Romanian_Deadlift', 'Rotational_RDL_start', 'Rotational_RDL_finish'),
    ('Wide-Grip_Barbell_Upright_Row', 'Wide_Grip_Upright_Row_start', 'Wide_Grip_Upright_Row_finish'),
    ('One-Arm_Cable_Lateral_Raise', 'One_Arm_Cable_Lateral_Raise_start', 'One_Arm_Cable_Lateral_Raise_finish'),
    ('Alternating_Lateral_Raise_with_Pause', 'Alternating_Lateral_Raise_Pause_start', 'Alternating_Lateral_Raise_Pause_finish'),
    ('Bent-Over_T-Raise', 'Bent_Over_T_Raise_start', 'Bent_Over_T_Raise_finish'),
    # Y-подъём сделан раньше и лежит в датасете как есть — не перекладываем.
]

TAIL = re.compile(r'(_\d{13}_[0-9a-f]{4,}|\d{8}_\d{6})$')

# Схема имён кадров с 09.10 (вердикт владельца: два персонажа, пол по профилю +
# переключатель в слайдере): 00f/01f — женщина, 00m/01m — мужчина.
GENDERS = {'f': '', 'm': '_m'}


def newest(folder, phase, gender):
    """Свежий черновик пары: <Id>_start[_m]*.png / <Id>_finish[_m]*.png.

    Суффикс пола отделяется строго: '_start_m...' — мужчина, '_start...' — женщина
    (обычный glob по '_start*' подхватил бы оба и отдал бы мужской как «женский»).
    """
    pref = folder + '_' + phase + GENDERS[gender]
    hits = []
    for p in glob.glob(os.path.join(SRC, pref + '*.png')):
        base = TAIL.sub('', os.path.basename(p)[:-4])
        if gender == 'f':
            if base == pref or re.match(re.escape(pref) + r'(_v\d+)?$', base):
                hits.append(p)
        else:
            if re.match(re.escape(pref) + r'(_v\d+)?$', base):
                hits.append(p)
    return sorted(hits)[-1] if hits else None


def folders_in_src():
    out = set()
    for p in glob.glob(os.path.join(SRC, '*.png')):
        base = TAIL.sub('', os.path.basename(p)[:-4])
        m = re.match(r'^(.*?)[_-](start|finish)(?:_m)?$', base)
        if m:
            out.add(m.group(1))
    return sorted(out)


def figure_box(im, thresh=40, scale=4, min_rows=0.15):
    """Фигура в долях кадра: (y0, y1, x0, x1, area) или None.

    Две вещи, на которых этот измеритель спотыкался 09.10:
    1) фон — вертикальный градиент с виньеткой, поэтому «вычесть цвет угла» или
       сравнивать с краем строки ловит саму виньетку (выходило «фигура на весь
       кадр»). Фон строки = медиана этой строки: фигура занимает меньшинство
       колонок даже в наклоне, а медиана нечувствительна к плав затемнению.
       Порог подобран калибровкой: суммарное отклонение >120 на канал-тройку,
       строка значима от ~4 пикселей (фон даёт 0-2, фигура до 34).
    2) высота рамки — плохой признак масштаба: стоя фигура высокая, в наклоне
       низкая и широкая. Инвариант позы — ПЛОЩАДЬ фигуры, она не меняется.
    """
    from statistics import median
    sm = im.resize((max(16, im.width // scale), max(16, im.height // scale)))
    w, h = sm.size
    px = sm.load()
    ys, xs, area = [], [], 0
    for y in range(h):
        row = [px[x, y] for x in range(0, w, 2)]
        bg = tuple(int(median(p[c] for p in row)) for c in range(3))
        hit = 0
        for i, x in enumerate(range(0, w, 2)):
            p = px[x, y]
            if abs(p[0] - bg[0]) + abs(p[1] - bg[1]) + abs(p[2] - bg[2]) > thresh * 3:
                hit += 1
                xs.append(x)
        if hit > 3:
            ys.append(y)
            area += hit
    if len(ys) < h * min_rows or not xs:
        return None
    return (ys[0] / h, ys[-1] / h, min(xs) / w, max(xs) / w, area / (w * h / 2))


def normalize_pair(paths, target_h=None):
    """Приводит кадры пары к одному масштабу фигуры (правка владельца 09.10:
    «1 и 2 кадр должны совпадать по углу и дистанции до фигуры»).

    Модель упорно «подъезжает» на кадре, где фигура наклонена или подняла руки,
    поэтому дистанция фиксируется не только в промпте, но и пост-обработкой:
    каждый кадр масштабируется целиком так, чтобы высота фигуры стала одинаковой,
    и прижимается к общей линии стоп. Фон — гладкий градиент, поэтому равномерный
    scale + center-crop глазу не заметен.
    """
    boxes, ims = [], []
    for p in paths:
        im = Image.open(p).convert('RGB')
        ims.append(im)
        boxes.append(figure_box(im))
    if any(b is None for b in boxes):
        return False
    areas = [b[4] for b in boxes]
    if max(areas) - min(areas) < 0.015:            # расхождение площади < 1,5 % — не трогаем
        return False
    ta = target_h or min(areas)                    # уменьшаем, а не растягиваем
    for p, im, b in zip(paths, ims, boxes):
        fy0, fy1, fx0, fx1, area = b
        s = (ta / area) ** 0.5                     # масштаб кадра, при котором площадь
                                                   # фигуры становится общей
        nw, nh = round(im.width * s), round(im.height * s)
        big = im.resize((nw, nh), Image.LANCZOS) if abs(s - 1) > 1e-3 else im
        foot = fy1 * s * im.height                 # линия стоп
        cx = (fx0 + fx1) / 2 * s * im.width        # центр фигуры
        ox = int(round(cx - SIZE[0] / 2))
        oy = int(round(foot - SIZE[1] + SIZE[1] * 0.06))   # стопы на ~94 % высоты
        ox = max(0, min(nw - SIZE[0], ox))
        oy = max(0, min(nh - SIZE[1], oy))
        crop = big.crop((ox, oy, min(nw, ox + SIZE[0]), min(nh, oy + SIZE[1])))
        if crop.size != SIZE:
            canvas = Image.new('RGB', SIZE, big.getpixel((2, 2)))
            canvas.paste(crop, (0, 0))
            crop = canvas
        crop.save(p, 'JPEG', quality=QUALITY, optimize=True)
    return True


def place(folder, srcs, normalize=False):
    """srcs: {'00f': путь, '01f': ..., '00m': ..., '01m': ...}; отсутствующие пропускаем."""
    out_dir = os.path.join(DST, folder)
    os.makedirs(out_dir, exist_ok=True)
    problems = []
    written = []
    for name, src in srcs.items():
        if not src:
            # Черновика нет, а кадр на диске уже есть (например мужская пара CAT-1,
            # черновики которой удалены) — это не проблема, молча пропускаем.
            if not os.path.exists(os.path.join(out_dir, '%s.jpg' % name)):
                problems.append('%s: нет ни исходника %s, ни готового кадра' % (folder, name))
            continue
        im = Image.open(src).convert('RGB')
        if im.size != SIZE:
            im = im.resize(SIZE, Image.LANCZOS)
        dst = os.path.join(out_dir, '%s.jpg' % name)
        im.save(dst, 'JPEG', quality=QUALITY, optimize=True)
        written.append(dst)
        print('  %-42s %s %4d КБ' % (folder, name, os.path.getsize(dst) // 1024))
    # Нормализация по умолчанию ВЫКЛЮЧЕНА (09.10): попытка выровнять масштаб по
    # площади силуэта ухудшила кадр — в наклоне тёмная одежда на тёмном фоне
    # детектором недосчитывается, и стоящий кадр уменьшали под него, оставляя
    # чёрные поля (см. four-rdl-norm.jpg). Масштаб держим промптом.
    if normalize and len(written) > 1:
        # нормализуем в пределах одного пола: женская и мужская пары могут differing
        for g in ('f', 'm'):
            grp = [p for p in written if p.endswith('%s.jpg' % g)]
            if len(grp) == 2 and normalize_pair(grp):
                print('  %-42s масштаб выровнен по полу %s' % (folder, g))
    return problems


def pair_srcs(folder, legacy=False):
    """Четыре кадра пары по конвенции имён черновиков (legacy — партия CAT-1)."""
    if legacy:
        return None
    return {'00f': newest(folder, 'start', 'f'), '01f': newest(folder, 'finish', 'f'),
            '00m': newest(folder, 'start', 'm'), '01m': newest(folder, 'finish', 'm')}


def newest_glob(pattern):
    hits = sorted(glob.glob(os.path.join(SRC, pattern)))
    return hits[-1] if hits else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ids', help='папки по конвенции имён, через запятую')
    ap.add_argument('--all', action='store_true', help='все пары, найденные в vibe_images')
    ap.add_argument('--legacy', action='store_true', help='партия CAT-1 по MAP (0.jpg/1.jpg)')
    a = ap.parse_args()

    if not os.path.isdir(SRC):
        sys.exit('нет vibe_images/: после генерации кадров он создаётся автоматически; '
                 'для проверки раскладки без генерации верни черновики из корзины')

    problems, count, folders = [], 0, []
    if a.legacy:
        for folder, sp, fp in MAP:
            srcs = {'00f': newest_glob(sp + '*.png'), '01f': newest_glob(fp + '*.png')}
            problems += place(folder, srcs)
            count += 1
    else:
        folders = ([s.strip() for s in a.ids.split(',') if s.strip()] if a.ids
                   else (folders_in_src() if a.all else []))
        if not folders:
            sys.exit('укажи --ids <Папка>[,<Папка>] или --all (MAP партии CAT-1 — через --legacy)')
        for folder in folders:
            srcs = pair_srcs(folder)
            if not any(srcs.values()):
                problems.append('%s: в vibe_images нет ни <Id>_start, ни <Id>_finish (ни _m)' % folder)
                continue
            problems += place(folder, srcs)
            count += 1

    print('\nпозиций разложено: %d' % count)
    if problems:
        print('ПРОБЛЕМЫ (%d):' % len(problems))
        [print('  ', p) for p in problems]
        sys.exit(1)
    print('дальше: python spark-output/export/check-media-names.py --http --ids %s'
          % ','.join(folders))


if __name__ == '__main__':
    main()
