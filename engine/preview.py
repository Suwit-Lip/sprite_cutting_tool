"""preview.py — detect bounding boxes without writing files.

Reads {"image","params"} from stdin. Writes PreviewResponse to stdout.
Box ids are stable across calls as long as params do not change — they map
1:1 to the connected-component label.
"""
from __future__ import annotations

from _common import emit, fail, read_input
from _detect import bounding_box, cluster_rows, detect_components, load_rgba


def main() -> None:
    req = read_input()
    image_path = req.get("image", "")
    if not image_path:
        fail("missing 'image'")
        return

    params = req.get("params", {})
    bg = int(params.get("bgThreshold", 245))
    min_size = int(params.get("minSize", 400))
    group_dilate = int(params.get("groupDilate", 2))

    try:
        arr = load_rgba(image_path)
    except Exception as e:
        fail(f"open image: {e}")
        return

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
    main()
