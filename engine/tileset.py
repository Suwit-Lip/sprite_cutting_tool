"""tileset.py — compose cut pieces into a single tileset PNG.

Usage:
    python tileset.py <output-root> <request-json>

request-json:
    {
      "files": ["sheet1/sprite_r01_c01.png", ...],   # paths relative to output-root
      "mode": "floor" | "wall",
      "cellSize": 64,
      "transforms": { "<file>": { "skewX":0, "skewY":0, "rotate":0, "scale":1 } }
    }
"""
from __future__ import annotations

import json
import math
import sys
from datetime import datetime
from pathlib import Path

from PIL import Image

from _common import emit, fail


def fit_into_cell(img: Image.Image, cell: int) -> Image.Image:
    w, h = img.size
    ratio = min(cell / w, cell / h)
    new_w = max(1, int(w * ratio))
    new_h = max(1, int(h * ratio))
    resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (cell, cell), (0, 0, 0, 0))
    canvas.paste(resized, ((cell - new_w) // 2, (cell - new_h) // 2), resized)
    return canvas


def apply_transform(img: Image.Image, t: dict) -> Image.Image:
    skew_x = math.tan(math.radians(t.get("skewX", 0) or 0))
    skew_y = math.tan(math.radians(t.get("skewY", 0) or 0))
    rotate = t.get("rotate", 0) or 0
    scale = t.get("scale", 1) or 1

    if skew_x or skew_y:
        # PIL affine: (a, b, c, d, e, f) → x' = a*x + b*y + c, y' = d*x + e*y + f
        # We want forward skew; PIL needs inverse, so use the inverse matrix.
        det = 1 - skew_x * skew_y
        if det == 0:
            det = 1
        a = 1 / det
        b = -skew_x / det
        d = -skew_y / det
        e = 1 / det
        img = img.transform(img.size, Image.Transform.AFFINE, (a, b, 0, d, e, 0), Image.Resampling.BICUBIC)
    if rotate:
        img = img.rotate(rotate, resample=Image.Resampling.BICUBIC, expand=False)
    if scale and scale != 1:
        w, h = img.size
        nw = max(1, int(w * scale))
        nh = max(1, int(h * scale))
        scaled = img.resize((nw, nh), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        canvas.paste(scaled, ((w - nw) // 2, (h - nh) // 2), scaled)
        img = canvas
    return img


def main(argv: list[str]) -> None:
    if len(argv) < 3:
        fail("usage: tileset.py <output-root> <request-json>")
    output_root = Path(argv[1])
    try:
        req = json.loads(argv[2])
    except json.JSONDecodeError as e:
        fail(f"request json: {e}")
        return

    files: list[str] = req.get("files", [])
    mode = req.get("mode", "floor")
    cell = int(req.get("cellSize", 64))
    transforms: dict[str, dict] = req.get("transforms", {})

    if not files:
        fail("no files supplied")
        return

    pieces: list[tuple[str, Image.Image]] = []
    for rel in files:
        p = output_root / rel
        try:
            img = Image.open(p).convert("RGBA")
        except Exception as e:
            fail(f"open {rel}: {e}")
            return
        fitted = fit_into_cell(img, cell)
        if rel in transforms:
            fitted = apply_transform(fitted, transforms[rel])
        pieces.append((rel, fitted))

    n = len(pieces)
    if mode == "wall":
        cols = max(1, min(n, 8))
        rows = math.ceil(n / cols)
    else:
        cols = math.ceil(math.sqrt(n))
        rows = math.ceil(n / cols)

    canvas = Image.new("RGBA", (cols * cell, rows * cell), (0, 0, 0, 0))
    meta_items = []
    for idx, (rel, img) in enumerate(pieces):
        r = idx // cols
        c = idx % cols
        canvas.paste(img, (c * cell, r * cell), img)
        meta_items.append({"file": rel, "row": r, "col": c, "x": c * cell, "y": r * cell})

    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_name = f"tileset_{mode}_{stamp}.png"
    meta_name = f"tileset_{mode}_{stamp}.json"
    out_dir = output_root / "_tilesets"
    out_dir.mkdir(parents=True, exist_ok=True)
    canvas.save(out_dir / out_name)
    (out_dir / meta_name).write_text(
        json.dumps(
            {"mode": mode, "cellSize": cell, "cols": cols, "rows": rows, "items": meta_items},
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    emit(
        {
            "file": f"_tilesets/{out_name}",
            "url": f"/api/output/file/_tilesets/{out_name}",
            "meta": f"_tilesets/{meta_name}",
        }
    )


if __name__ == "__main__":
    main(sys.argv)
