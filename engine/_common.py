"""Shared helpers for the engine scripts.

Each script writes a single JSON document to stdout and uses stderr for logs,
so the Go caller can decode stdout without filtering.
"""
from __future__ import annotations

import io
import json
import sys
from typing import Any

# Force UTF-8 on stdout/stderr. Windows defaults to cp1252 which can't
# encode Thai characters in our notes/messages.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
    sys.stderr.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
else:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")


def emit(payload: Any) -> None:
    json.dump(payload, sys.stdout, ensure_ascii=False)
    sys.stdout.write("\n")
    sys.stdout.flush()


def fail(message: str, code: int = 1) -> None:
    sys.stderr.write(f"{message}\n")
    sys.exit(code)


def read_input() -> Any:
    """Read a single JSON document from stdin. Used instead of argv to
    sidestep Windows argv-encoding issues with non-ASCII characters."""
    raw = sys.stdin.buffer.read().decode("utf-8")
    return json.loads(raw) if raw else {}
