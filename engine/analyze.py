"""analyze.py — inspect a sprite sheet and suggest cut parameters.

Reads {"image": "<path>"} from stdin. Writes AnalyzeResponse JSON to stdout.
"""
from __future__ import annotations

import numpy as np
from scipy import ndimage

from _common import emit, fail, read_input
from _detect import load_rgba


def _sample_bg_threshold(arr: np.ndarray) -> int:
    """Pick a bgThreshold from the brightest band in the image corners.

    Most sprite sheets have a (mostly) uniform background fill at the corners.
    We sample those corners, find the typical brightness, then set threshold
    slightly below it so the background gets masked out without eating the
    object edges.
    """
    h, w = arr.shape[:2]
    cs = max(8, min(h, w) // 20)  # corner size
    corners = np.concatenate(
        [
            arr[:cs, :cs, :3].reshape(-1, 3),
            arr[:cs, -cs:, :3].reshape(-1, 3),
            arr[-cs:, :cs, :3].reshape(-1, 3),
            arr[-cs:, -cs:, :3].reshape(-1, 3),
        ]
    )
    bri = corners.mean(axis=1)
    # 10th percentile of corner brightness — robust against the darkest
    # speck in the texture but lower than the pure-white peak.
    cutoff = int(np.percentile(bri, 10))
    # Keep within a sane range; never go below 200 (otherwise we'd cut
    # large parts of light-colored objects).
    return max(200, min(254, cutoff - 1))


def auto_suggest(arr: np.ndarray) -> dict:
    bg = _sample_bg_threshold(arr)
    bri = arr[:, :, :3].astype(float).mean(axis=2)
    mask = bri < bg
    mask = ndimage.binary_opening(mask, structure=np.ones((2, 2)))
    labels, n = ndimage.label(mask)
    if n == 0:
        return _defaults(bg, "normal", "ไม่พบวัตถุ — ตรวจ background หรือลด threshold")

    sizes_all = ndimage.sum(np.ones_like(labels), labels, range(1, n + 1))
    sizes = sizes_all[sizes_all >= 50]
    if sizes.size == 0:
        return _defaults(bg, "normal", "พบแต่ noise — ลอง bg threshold อื่น")

    median = float(np.median(sizes))
    largest = float(sizes.max())
    ratio = largest / max(median, 1)

    # Few-large-objects pattern (tarot cards, tiles, big illustrations).
    # Cue: the top 3 components own most of the foreground area.
    sorted_sizes = np.sort(sizes)[::-1]
    if len(sorted_sizes) >= 3:
        top3_sum = float(sorted_sizes[:3].sum())
        total = float(sorted_sizes.sum())
        if top3_sum / total > 0.6 and largest > 5000:
            third = float(sorted_sizes[2])
            return {
                "suggested": {
                    "bgThreshold": bg,
                    "minSize": max(500, int(third * 0.4)),
                    "groupDilate": 0,
                    "padding": 6,
                    "keepShadow": False,
                    "alphaMode": "keep",
                    "noiseReduction": 3,
                },
                "profile": "large_objects",
                "note": "ภาพมีวัตถุใหญ่ไม่กี่ชิ้น — กรอง noise สูง, ไม่รวมชิ้น, ใช้ Keep alpha",
                "mixedSizeWarning": False,
            }

    # merge_rate: how much dilation collapses the component count.
    c0 = int((sizes_all >= 200).sum())
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
            "alphaMode": "remove",
            "noiseReduction": 2,
        },
        "profile": profile,
        "note": note,
        "mixedSizeWarning": mixed,
    }


def _defaults(bg: int, profile: str, note: str) -> dict:
    return {
        "suggested": {
            "bgThreshold": bg,
            "minSize": 400,
            "groupDilate": 2,
            "padding": 4,
            "keepShadow": True,
            "alphaMode": "remove",
            "noiseReduction": 2,
        },
        "profile": profile,
        "note": note,
        "mixedSizeWarning": False,
    }


def main() -> None:
    req = read_input()
    image_path = req.get("image", "")
    if not image_path:
        fail("missing 'image'")
        return
    try:
        arr = load_rgba(image_path)
    except Exception as e:
        fail(f"open image: {e}")
        return
    emit(auto_suggest(arr))


if __name__ == "__main__":
    main()
