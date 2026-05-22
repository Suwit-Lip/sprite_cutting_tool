"""cut.py — slice a sprite sheet and write the pieces under output/<sheet>/.

Usage:
    python cut.py <image-path> <output-root> <request-json>

The request-json is {params, exclude, merge} as documented in the spec.

Stdout: JSON matching models.CutResponse.
"""
from __future__ import annotations

import sys

from _common import emit, fail


def main(argv: list[str]) -> None:
    if len(argv) < 4:
        fail("usage: cut.py <image-path> <output-root> <request-json>")
    # TODO Phase 1: port the full pipeline + exclude/merge from spec §6.
    emit({"count": 0, "outputDir": "", "manifest": ""})


if __name__ == "__main__":
    main(sys.argv)
