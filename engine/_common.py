"""Shared helpers for the engine scripts.

Each script writes a single JSON document to stdout and uses stderr for logs,
so the Go caller can decode stdout without filtering.
"""
from __future__ import annotations

import json
import sys
from typing import Any


def emit(payload: Any) -> None:
    json.dump(payload, sys.stdout, ensure_ascii=False)
    sys.stdout.write("\n")
    sys.stdout.flush()


def fail(message: str, code: int = 1) -> None:
    sys.stderr.write(f"{message}\n")
    sys.exit(code)
