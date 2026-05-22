"""preview.py — detect bounding boxes without writing files.

Usage:
    python preview.py <image-path> <params-json>

Box ids are stable across calls as long as params do not change — they map
1:1 to the connected-component label, so the frontend can reference them.
"""
from __future__ import annotations

import json
import sys

from _common import emit, fail
from _detect import bounding_box, cluster_rows, detect_components, load_rgba


def main(argv: list[str]) -> None:
    if len(argv) < 3:
        fail("usage: preview.py <image-path> <params-json>")
    try:
        params = json.loads(argv[2])
    except json.JSONDecodeError as e:
        fail(f"params json: {e}")
        return

    try:
        arr = load_rgba(argv[1])
    except Exception as e:
        fail(f"open image: {e}")
        return

    bg = int(params.get("bgThreshold", 245))
    min_size = int(params.get("minSize", 400))
    group_dilate = int(params.get("groupDilate", 2))

    labels, valid = detect_components(arr, bg, min_size, group_dilate)

    boxes: list[dict] = []
    for lab in valid:
        x, y, w, h = bounding_box(labels, lab)
        if w == 0 or h == 0:
            continue
        boxes.append({"id": int(lab), "x": x, "y": y, "w": w, "h": h})

    cluster_rows(boxes)
    rows = max((b.get("row", 0) for b in boxes), default=0)
    emit({"count": len(boxes), "boxes": boxes, "rows": rows})


if __name__ == "__main__":
    main(sys.argv)
