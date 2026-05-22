"""tileset.py — compose cut pieces into a single tileset PNG.

Usage:
    python tileset.py <output-root> <request-json>

Stdout: JSON describing the produced tileset file + metadata path.
"""
from __future__ import annotations

import sys

from _common import emit, fail


def main(argv: list[str]) -> None:
    if len(argv) < 3:
        fail("usage: tileset.py <output-root> <request-json>")
    # TODO Phase 3.
    emit({"file": "", "url": "", "meta": ""})


if __name__ == "__main__":
    main(sys.argv)
