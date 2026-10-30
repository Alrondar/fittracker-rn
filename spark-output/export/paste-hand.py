# -*- coding: utf-8 -*-
"""Перенос кисти из принятого женского кадра в мужской по пикселям.

Кисть — единственное, что модель упорно рисует зеркально, поэтому её не
генерируют заново, а берут из кадра, который владелец принял. Патч тон-
корректируется по коже мужчины и клеится пером из объединения эллипсов.

Запуск:  python paste-hand.py <cfg.py-имя>
Конфиги — в HAND_JOBS ниже.
"""
import sys
from PIL import Image, ImageDraw, ImageFilter

ROOT = 'vibe_images/'


def skin_mean(im, box):
    c = im.convert('RGB').crop(box)
    px = list(c.getdata())
    n = len(px)
    return tuple(sum(p[k] for p in px) / n for k in range(3))


def tone_match(patch, ref_female, ref_male):
    """Пер-канальный множитель: тон патча приводится к тону кожи мужчины."""
    f = skin_mean(ref_female[0], ref_female[1])
    m = skin_mean(ref_male[0], ref_male[1])
    gain = [min(1.6, max(0.6, (m[k] + 1.0) / (f[k] + 1.0))) for k in range(3)]
    src = patch.load()
    out = Image.new('RGB', patch.size)
    dst = out.load()
    w, h = patch.size
    for y in range(h):
        for x in range(w):
            r, g, b = src[x, y]
            dst[x, y] = (min(255, int(r * gain[0])), min(255, int(g * gain[1])),
                         min(255, int(b * gain[2])))
    return out, gain


def paste(female_path, male_path, out_path, boxes, blur=6, gain_box=None,
          guard=True):
    F = Image.open(female_path).convert('RGB')
    M = Image.open(male_path).convert('RGB')
    W, H = F.size
    if gain_box is None:
        gain_box = (int(0.575 * W), int(0.52 * H), int(0.615 * W), int(0.545 * H))
    patch, gain = tone_match(F, (F, gain_box), (M, gain_box))

    mask = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(mask)
    for (x0, y0, x1, y1) in boxes:
        d.ellipse((x0, y0, x1, y1), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(blur))
    if guard:
        # светлая кожа женщины не должна ложиться на тёмный шорты/блин мужчины:
        # режем уже размытую маску, иначе перо затянет светлое обратно в вырез
        fl = F.convert('L').load()
        ml = M.convert('L').load()
        mp = mask.load()
        cut = 0
        for y in range(max(0, min(b[1] for b in boxes) - 10),
                       min(H, max(b[3] for b in boxes) + 10)):
            for x in range(max(0, min(b[0] for b in boxes) - 10),
                           min(W, max(b[2] for b in boxes) + 10)):
                if mp[x, y] and fl[x, y] > 88 and ml[x, y] < 112:
                    mp[x, y] = 0
                    cut += 1
        print(f'   guard: вырезано пикселей {cut}')
        mask = mask.filter(ImageFilter.GaussianBlur(1.2))

    res = Image.composite(patch, M, mask)
    res.save(out_path)
    print(f'{out_path}  gain={[round(g, 3) for g in gain]}  '
          f'кожа_ж={tuple(round(v,1) for v in skin_mean(F, gain_box))} '
          f'кожа_м={tuple(round(v,1) for v in skin_mean(M, gain_box))}')
    # контрольный кроп перенесённой кисти
    crop_box = (min(b[0] for b in boxes) - 30, min(b[1] for b in boxes) - 30,
                max(b[2] for b in boxes) + 30, max(b[3] for b in boxes) + 30)
    c = res.crop(crop_box)
    c = c.resize((c.width * 2, c.height * 2), Image.LANCZOS)
    ref = F.crop(crop_box)
    ref = ref.resize((ref.width * 2, ref.height * 2), Image.LANCZOS)
    sheet = Image.new('RGB', (ref.width * 2 + 12, ref.height), 'white')
    sheet.paste(ref, (0, 0))
    sheet.paste(c, (ref.width + 12, 0))
    qc = out_path.split('/')[-1].replace('.png', '_pastecheck.jpg')
    sheet.save('spark-output/export/qc/' + qc, quality=92)
    print('   проверка:', 'spark-output/export/qc/' + qc)


HAND_JOBS = {}

if __name__ == '__main__':
    job = HAND_JOBS[sys.argv[1]]
    paste(*job[:3], boxes=job[3], **job[4] if len(job) > 4 else {})
