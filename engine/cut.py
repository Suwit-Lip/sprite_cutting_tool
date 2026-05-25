"""cut.py — slice a sprite sheet and write the pieces under output/<sheet>/.

Reads from stdin:
    {
      "image": "<path>",
      "outputRoot": "<path>",
      "params": {bgThreshold, minSize, groupDilate, padding, keepShadow},
      "exclude": [box_id, ...],
      "merge":   [[box_id, box_id], ...]
    }
"""
from __future__ import annotations

import json
import os
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

from _common import emit, fail, read_input
from _detect import (
    bounding_box,
    cluster_rows,
    detect_components,
    load_rgba,
    make_alpha,
    make_alpha_from_mask,
)


def main() -> None:
    req = read_input()
    image_path = req.get("image", "")
    output_root = req.get("outputRoot", "")
    if not image_path or not output_root:
        fail("missing 'image' or 'outputRoot'")
        return

    params = req.get("params", {})
    bg = int(params.get("bgThreshold", 245))
    min_size = int(params.get("minSize", 400))
    group_dilate = int(params.get("groupDilate", 2))
    padding = int(params.get("padding", 4))
    keep_shadow = bool(params.get("keepShadow", True))
    alpha_mode = str(params.get("alphaMode", "remove"))
    noise_reduction = int(params.get("noiseReduction", 2))

    exclude = set(int(i) for i in req.get("exclude", []))
    merge_groups = [[int(i) for i in g] for g in req.get("merge", []) if len(g) >= 2]

    try:
        arr = load_rgba(image_path)
    except Exception as e:
        fail(f"open image: {e}")
        return

    labels, valid = detect_components(arr, bg, min_size, group_dilate, noise_reduction)
    valid_set = set(valid)

    merged_labels: set[int] = set()
    for grp in merge_groups:
        merged_labels.update(grp)

    components: list[dict] = []
    for idx, grp in enumerate(merge_groups):
        members = [m for m in grp if m in valid_set and m not in exclude]
        if not members:
            continue
        components.append({"members": members, "kind": "merged", "syn_id": -1 - idx})
    for lab in valid:
        if lab in exclude or lab in merged_labels:
            continue
        components.append({"members": [lab], "kind": "single", "syn_id": int(lab)})

    boxes: list[dict] = []
    height, width = labels.shape
    for c in components:
        x0 = y0 = 10**9
        x1 = y1 = -1
        for lab in c["members"]:
            bx, by, bw, bh = bounding_box(labels, lab)
            if bw == 0:
                continue
            x0, y0 = min(x0, bx), min(y0, by)
            x1, y1 = max(x1, bx + bw), max(y1, by + bh)
        if x1 < 0:
            continue
        boxes.append(
            {
                "id": c["syn_id"],
                "members": c["members"],
                "x": x0,
                "y": y0,
                "w": x1 - x0,
                "h": y1 - y0,
            }
        )

    cluster_rows(boxes)

    sheet_stem = Path(image_path).stem
    out_dir = Path(output_root) / sheet_stem
    out_dir.mkdir(parents=True, exist_ok=True)

    manifest: list[dict] = []
    saved = 0
    for box in boxes:
        x, y, w, h = box["x"], box["y"], box["w"], box["h"]
        px0 = max(0, x - padding)
        py0 = max(0, y - padding)
        px1 = min(width, x + w + padding)
        py1 = min(height, y + h + padding)

        sub_rgb = arr[py0:py1, px0:px1, :3]
        sub_label = labels[py0:py1, px0:px1]

        comp_mask = np.zeros(sub_label.shape, dtype=bool)
        for lab in box["members"]:
            comp_mask |= sub_label == lab
        comp_mask = ndimage.binary_dilation(comp_mask, iterations=2)

        if alpha_mode in ("keep", "fuzzy"):
            # Use the (filled) component mask as alpha. Preserves bright/white
            # pixels that fall inside the object's outline.
            alpha = make_alpha_from_mask(comp_mask, alpha_mode)
        else:
            # "remove": per-pixel brightness test, clipped to the component.
            alpha = make_alpha(sub_rgb, bg, keep_shadow)
            alpha[~comp_mask] = 0

        out = np.zeros((sub_rgb.shape[0], sub_rgb.shape[1], 4), dtype=np.uint8)
        out[:, :, :3] = sub_rgb.astype(np.uint8)
        out[:, :, 3] = alpha

        row = box.get("row", 1)
        col = box.get("col", saved + 1)
        name = f"sprite_r{row:02d}_c{col:02d}.png"
        Image.fromarray(out, mode="RGBA").save(out_dir / name)

        manifest.append(
            {
                "file": name,
                "row": row,
                "col": col,
                "x": int(x),
                "y": int(y),
                "w": int(w),
                "h": int(h),
                "id": int(box["id"]),
            }
        )
        saved += 1

    manifest_path = out_dir / "manifest.json"
    manifest_path.write_text(
        json.dumps({"sheet": sheet_stem, "items": manifest}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    emit(
        {
            "count": saved,
            "outputDir": sheet_stem,
            "manifest": os.path.join(sheet_stem, "manifest.json"),
        }
    )


if __name__ == "__main__":
    main()
