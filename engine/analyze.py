"""analyze.py — inspect a sprite sheet and suggest cut parameters.

Usage:
    python analyze.py <image-path>

Stdout: JSON matching models.AnalyzeResponse.

Phase 0 scaffold: returns sensible defaults without inspecting the image.
Phase 1 will port the real auto_suggest() from the spec.
"""
from __future__ import annotations

import sys

from _common import emit, fail


def main(argv: list[str]) -> None:
    if len(argv) < 2:
        fail("usage: analyze.py <image-path>")
    # TODO Phase 1: implement auto_suggest from spec §6.
    emit({
        "suggested": {
            "bgThreshold": 245,
            "minSize": 400,
            "groupDilate": 2,
            "padding": 4,
            "keepShadow": True,
        },
        "profile": "normal",
        "note": "scaffold default — real analyzer not yet implemented",
        "mixedSizeWarning": False,
    })


if __name__ == "__main__":
    main(sys.argv)
