"""preview.py — detect bounding boxes without writing files.

Usage:
    python preview.py <image-path> <params-json>

Stdout: JSON matching models.PreviewResponse.
Box ids are stable across calls as long as params do not change — they map
1:1 to the connected-component label, so the frontend can reference them.
"""
from __future__ import annotations

import sys

from _common import emit, fail


def main(argv: list[str]) -> None:
    if len(argv) < 3:
        fail("usage: preview.py <image-path> <params-json>")
    # TODO Phase 1: port detect_components from spec §6.
    emit({"count": 0, "boxes": [], "rows": 0})


if __name__ == "__main__":
    main(sys.argv)
