"""analyze.py — inspect a sprite sheet and suggest cut parameters.

Usage:
    python analyze.py <image-path>
"""
from __future__ import annotations

import sys

import numpy as np
from scipy import ndimage

from _common import emit, fail
from _detect import load_rgba


def auto_suggest(arr: np.ndarray, bg: int = 245) -> dict:
    bri = arr[:, :, :3].astype(float).mean(axis=2)
    mask = bri < bg
    mask = ndimage.binary_opening(mask, structure=np.ones((2, 2)))
    labels, n = ndimage.label(mask)
    if n == 0:
        return {
            "suggested": {
                "bgThreshold": bg,
                "minSize": 400,
                "groupDilate": 2,
                "padding": 4,
                "keepShadow": True,
            },
            "profile": "normal",
            "note": "ไม่พบวัตถุ — ตรวจ background หรือลด threshold",
            "mixedSizeWarning": False,
        }
    sizes = ndimage.sum(np.ones_like(labels), labels, range(1, n + 1))
    sizes = sizes[sizes >= 50]
    if sizes.size == 0:
        median = 400.0
        ratio = 1.0
    else:
        median = float(np.median(sizes))
        ratio = float(sizes.max() / max(median, 1))

    s0 = ndimage.sum(np.ones_like(labels), labels, range(1, n + 1))
    c0 = int((s0 >= 200).sum())
    mask3 = ndimage.binary_dilation(mask, iterations=3)
    l3, n3 = ndimage.label(mask3)
    if n3 > 0:
        s3 = ndimage.sum(np.ones_like(l3), l3, range(1, n3 + 1))
        c3 = int((s3 >= 200).sum())
    else:
        c3 = 0
    merge_rate = (c0 - c3) / max(c0, 1)

    group_dilate = 1 if merge_rate > 0.1 else 2
    min_size = max(150, int(median * 0.3))
    mixed = ratio > 50

    if mixed:
        profile = "mixed_size"
        note = "ภาพนี้ขนาดวัตถุผสมมาก — แนะนำใช้โหมด Manual เลือกชิ้นเอง"
    elif merge_rate > 0.1:
        profile = "dense_icons"
        note = "ภาพนี้วัตถุชิดกัน — ตั้งค่าระวังการรวมชิ้นให้แล้ว"
    else:
        profile = "spaced"
        note = "ภาพนี้วัตถุห่างกันดี"

    return {
        "suggested": {
            "bgThreshold": bg,
            "minSize": min_size,
            "groupDilate": group_dilate,
            "padding": 4,
            "keepShadow": True,
        },
        "profile": profile,
        "note": note,
        "mixedSizeWarning": mixed,
    }


def main(argv: list[str]) -> None:
    if len(argv) < 2:
        fail("usage: analyze.py <image-path>")
    try:
        arr = load_rgba(argv[1])
    except Exception as e:
        fail(f"open image: {e}")
        return
    emit(auto_suggest(arr))


if __name__ == "__main__":
    main(sys.argv)
