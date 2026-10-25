# -*- coding: utf-8 -*-
"""Проверка текстов на CJK, суржик и целость markdown-таблиц. Источник — чистый ASCII."""
import io
import re
import sys

RANGES = [(0x3000, 0x303F), (0x3400, 0x4DBF), (0x4E00, 0x9FFF),
          (0xFF00, 0xFFEF), (0x3040, 0x30FF)]
CJK = re.compile("[" + "".join(chr(a) + "-" + chr(b) for a, b in RANGES) + "]")
SUR = re.compile("[" + "".join(chr(c) for c in (0x0454, 0x0456, 0x0457, 0x0491)) + "]")
files = sys.argv[1:]
bad = 0
for f in files:
    t = io.open(f, encoding="utf-8").read()
    lines = t.split("\n")
    cjk = [n + 1 for n, l in enumerate(lines) if CJK.search(l)]
    sur = [n + 1 for n, l in enumerate(lines) if SUR.search(l)]
    ragged = []
    for blk in re.findall(r"(?:^\|.*\n)+", t, flags=re.M):
        cols = set(l.count("|") for l in blk.strip().split("\n"))
        if len(cols) > 1:
            ragged.append((sorted(cols), blk.strip().split("\n")[0][:40].encode("utf-8")))
    print("%-58s CJK=%d SUR=%d RAGGED=%d" % (f, len(cjk), len(sur), len(ragged)))
    for r in ragged[:4]:
        print("    ", r)
    bad += len(cjk) + len(sur) + len(ragged)
print("TOTAL PROBLEMS:", bad)
