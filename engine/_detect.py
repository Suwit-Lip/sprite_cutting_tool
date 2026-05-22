"""Shared connected-components detection used by preview.py and cut.py."""
from __future__ import annotations

from typing import Any

import numpy as np
from PIL import Image
from scipy import ndimage


def load_rgba(path: str) -> np.ndarray:
    img = Image.open(path).convert("RGBA")
    return np.asarray(img)


def detect_components(
    arr: np.ndarray,
    bg_threshold: int,
    min_size: int,
    group_dilate: int,
) -> tuple[np.ndarray, list[int]]:
    rgb = arr[:, :, :3].astype(float)
    brightness = rgb.mean(axis=2)
    mask = brightness < bg_threshold
    mask = ndimage.binary_opening(mask, structure=np.ones((2, 2)))
    if group_dilate > 0:
        mask = ndimage.binary_dilation(mask, iterations=group_dilate)
    labels, n = ndimage.label(mask)
    if n == 0:
        return labels, []
    sizes = ndimage.sum(np.ones_like(labels), labels, range(1, n + 1))
    valid = [i + 1 for i in range(n) if sizes[i] >= min_size]
    return labels, valid


def bounding_box(labels: np.ndarray, lab: int) -> tuple[int, int, int, int]:
    """Return (x, y, w, h) for the given label."""
    ys, xs = np.where(labels == lab)
    if ys.size == 0:
        return 0, 0, 0, 0
    y0, y1 = int(ys.min()), int(ys.max())
    x0, x1 = int(xs.min()), int(xs.max())
    return x0, y0, x1 - x0 + 1, y1 - y0 + 1


def make_alpha(
    sub_rgb: np.ndarray, bg_threshold: int, keep_shadow: bool
) -> np.ndarray:
    """Per-pixel alpha based on brightness. Used by alphaMode='remove'."""
    bri = sub_rgb.mean(axis=2)
    alpha = np.full(bri.shape, 255, dtype=np.uint8)
    alpha[bri >= bg_threshold] = 0
    if not keep_shadow:
        sat = sub_rgb.max(axis=2) - sub_rgb.min(axis=2)
        shadow = (bri >= 200) & (bri < bg_threshold) & (sat < 25)
        alpha[shadow] = 0
    return alpha


def make_alpha_from_mask(
    comp_mask: np.ndarray, mode: str
) -> np.ndarray:
    """Alpha derived from the component mask itself, with holes filled.
    Used by alphaMode='keep' and 'fuzzy'. Solves the bright-interior case
    where the object has white/light pixels inside its outline."""
    filled = ndimage.binary_fill_holes(comp_mask)
    if filled is None:
        filled = comp_mask
    if mode == "fuzzy":
        # Soft edge: distance from outside → smooth alpha ramp over a few px.
        dist = ndimage.distance_transform_edt(filled)
        ramp = np.clip(dist / 2.5, 0, 1)  # ~2.5 px fade
        return (ramp * 255).astype(np.uint8)
    # keep: hard mask
    return np.where(filled, 255, 0).astype(np.uint8)


def cluster_rows(
    boxes: list[dict[str, Any]], row_gap: int = 60
) -> list[dict[str, Any]]:
    """Assign row/col indices by sorting boxes top-to-bottom, left-to-right.

    A new row starts when the next box's y differs from the current row's
    representative y by more than row_gap pixels.
    """
    if not boxes:
        return boxes
    ordered = sorted(boxes, key=lambda b: (b["y"], b["x"]))
    rows: list[list[dict[str, Any]]] = []
    for box in ordered:
        if not rows or box["y"] - rows[-1][0]["y"] > row_gap:
            rows.append([box])
        else:
            rows[-1].append(box)
    for r_idx, row in enumerate(rows):
        row.sort(key=lambda b: b["x"])
        for c_idx, box in enumerate(row):
            box["row"] = r_idx + 1
            box["col"] = c_idx + 1
    return ordered
