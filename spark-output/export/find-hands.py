# -*- coding: utf-8 -*-
"""Поиск кожных пятен (кистей) в кадре без numpy: downsampling + BFS-компоненты."""
import sys
from PIL import Image


def skin_mask(im, scale=0.25):
    w, h = im.size
    sm = im.convert('RGB').resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.BILINEAR)
    px = sm.load()
    sw, sh = sm.size
    mask = bytearray(sw * sh)
    for y in range(sh):
        for x in range(sw):
            r, g, b = px[x, y]
            if r > 110 and r > g + 8 and g > b + 4 and 18 < r - b < 130:
                mask[y * sw + x] = 1
    return mask, sw, sh, scale


def components(mask, sw, sh, min_area=25):
    seen = bytearray(sw * sh)
    out = []
    for y in range(sh):
        for x in range(sw):
            i = y * sw + x
            if not mask[i] or seen[i]:
                continue
            stack = [i]
            seen[i] = 1
            area = 0
            x0 = x1 = x
            y0 = y1 = y
            while stack:
                j = stack.pop()
                area += 1
                cy, cx = divmod(j, sw)
                if cx < x0: x0 = cx
                if cx > x1: x1 = cx
                if cy < y0: y0 = cy
                if cy > y1: y1 = cy
                for ny in (cy - 1, cy, cy + 1):
                    for nx in (cx - 1, cx, cx + 1):
                        if 0 <= nx < sw and 0 <= ny < sh:
                            k = ny * sw + nx
                            if mask[k] and not seen[k]:
                                seen[k] = 1
                                stack.append(k)
            if area >= min_area:
                out.append((area, x0, y0, x1, y1))
    out.sort(reverse=True)
    return out


def report(path, label, crop=None):
    im = Image.open(path)
    W, H = im.size
    mask, sw, sh, scale = skin_mask(im)
    comps = components(mask, sw, sh)
    print(f'{label}  {path.split("/")[-1]}  {W}x{H}')
    for area, x0, y0, x1, y1 in comps[:10]:
        cx, cy = ((x0 + x1) / 2.0) / scale, ((y0 + y1) / 2.0) / scale
        wpx, hpx = (x1 - x0 + 1) / scale, (y1 - y0 + 1) / scale
        print(f'   пятно px={area:6d}  центр=({cx:.0f},{cy:.0f}) rel=({cx/W:.3f},{cy/H:.3f})'
              f'  бокс=({x0/scale:.0f},{y0/scale:.0f},{x1/scale:.0f},{y1/scale:.0f})  {wpx:.0f}x{hpx:.0f}')
    print()


if __name__ == '__main__':
    for p in sys.argv[1:]:
        report(p, p.split('/')[-1].replace('Underhand-Grip_Dumbbell_Bench_Press_', 'U_')
                                 .replace('High_Foot_Position_Leg_Press_', 'L_'))
