"""Contact sheet of legacy upstream frames (0.jpg / 1.jpg) for catalog audit."""
import argparse
import os
import sys
from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "exercises"))
OUT = os.path.join(os.path.dirname(__file__), "qc")
CELL_W = 420
PAD = 10
LABEL = 16


def load(folder, name):
    path = os.path.join(ROOT, folder, name)
    if not os.path.exists(path):
        return None
    im = Image.open(path).convert("RGB")
    h = round(im.height * CELL_W / im.width)
    return im.resize((CELL_W, h))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ids", required=True, help="comma separated folder names in data/exercises")
    ap.add_argument("--name", default="legacy-sheet")
    ap.add_argument("--cols", type=int, default=3)
    args = ap.parse_args()

    folders = [f.strip() for f in args.ids.split(",") if f.strip()]
    cells = []
    for f in folders:
        a, b = load(f, "0.jpg"), load(f, "1.jpg")
        if a is None and b is None:
            print(f"MISSING {f}", file=sys.stderr)
        cells.append((f, a, b))

    tallest = max([max(a.height if a else 0, b.height if b else 0) for _, a, b in cells] + [1])
    row_h = tallest + LABEL + PAD
    col_w = CELL_W * 2 + PAD
    cols = args.cols
    rows = -(-len(cells) // cols)
    sheet = Image.new("RGB", (cols * col_w + PAD, rows * (row_h + LABEL) + PAD), (18, 18, 20))
    d = ImageDraw.Draw(sheet)

    for i, (f, a, b) in enumerate(cells):
        cx = PAD + (i % cols) * col_w
        cy = PAD + (i // cols) * (row_h + LABEL)
        d.text((cx, cy), f, fill=(235, 235, 235))
        y = cy + LABEL
        if a:
            sheet.paste(a, (cx, y))
        else:
            d.rectangle([cx, y, cx + CELL_W, y + row_h - LABEL - PAD], outline=(120, 40, 40))
        if b:
            sheet.paste(b, (cx + CELL_W + PAD, y))
        else:
            d.rectangle([cx + CELL_W + PAD, y, cx + col_w, y + row_h - LABEL - PAD], outline=(120, 40, 40))

    os.makedirs(OUT, exist_ok=True)
    dst = os.path.join(OUT, args.name + ".jpg")
    sheet.save(dst, quality=88)
    print(f"{dst} ({sheet.width}x{sheet.height}, {os.path.getsize(dst)//1024} KB)")


if __name__ == "__main__":
    main()
