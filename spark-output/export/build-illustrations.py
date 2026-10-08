# -*- coding: utf-8 -*-
"""CAT-1b · раскладка сгенерированных кадров в структуру датасета.

Каждая позиция = папка <dataset>/<Id>/ с кадрами 0.jpg (старт) и 1.jpg (финиш),
850x567 (3:2) — формат, который каталог использует в 93% случаев и при котором
pickMediaFit (src/utils/mediaFit.ts) оставляет cover без letterbox.

MAP: id папки -> (исходник старта, исходник финиша) внутри vibe_images/.
Исходники ищем по префиксу имени, чтобы не переписывать путь после каждой перегенерации.

Запуск:  python spark-output/export/build-illustrations.py
"""
import glob
import os

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'vibe_images')
DST = os.path.join(ROOT, 'data', 'exercises')
SIZE = (850, 567)
QUALITY = 88

# (id папки датасета, префикс стартового кадра, префикс финишного кадра)
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


def newest(prefix):
    hits = sorted(glob.glob(os.path.join(SRC, prefix + '*.png')))
    if not hits:
        raise SystemExit('нет исходника по префиксу: %s' % prefix)
    return hits[-1]


def main():
    total = 0
    for folder, start_pref, finish_pref in MAP:
        out_dir = os.path.join(DST, folder)
        os.makedirs(out_dir, exist_ok=True)
        for idx, pref in ((0, start_pref), (1, finish_pref)):
            src = newest(pref)
            im = Image.open(src).convert('RGB').resize(SIZE, Image.LANCZOS)
            dst = os.path.join(out_dir, '%d.jpg' % idx)
            im.save(dst, 'JPEG', quality=QUALITY, optimize=True)
            total += 1
        print('%-38s %s' % (folder, os.path.getsize(os.path.join(out_dir, '0.jpg')) // 1024))
    print('кадров записано:', total)


if __name__ == '__main__':
    main()
