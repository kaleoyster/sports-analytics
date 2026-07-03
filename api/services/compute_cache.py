"""Short-lived cache for expensive prediction / probability computations."""

from __future__ import annotations

import time
from collections.abc import Callable
from typing import TypeVar

from config import settings

T = TypeVar("T")

_cache: dict[str, tuple[float, object]] = {}


def _ttl() -> int:
    return settings.compute_cache_ttl_seconds


def get_cached(key: str, factory: Callable[[], T]) -> T:
    now = time.time()
    cached = _cache.get(key)
    if cached and (now - cached[0]) < _ttl():
        return cached[1]  # type: ignore[return-value]

    value = factory()
    _cache[key] = (now, value)
    return value


def matches_fingerprint(matches: list) -> str:
    """Changes when results or fixtures update."""
    finished = 0
    latest = ""
    unplayed = 0
    for m in matches:
        if m.status == "FINISHED":
            finished += 1
            if m.utc_date > latest:
                latest = m.utc_date
        elif m.home_code and m.away_code:
            unplayed += 1
    return f"{finished}:{latest}:{unplayed}"


def invalidate_compute_cache() -> None:
    _cache.clear()
