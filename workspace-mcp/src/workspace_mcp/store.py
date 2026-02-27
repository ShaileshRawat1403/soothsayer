from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Generic, Iterable, Optional, Tuple, TypeVar
from collections import OrderedDict

K = TypeVar("K")
V = TypeVar("V")


@dataclass(frozen=True)
class StoreStats:
    size: int
    evicted_expired: int
    evicted_overflow: int


class BoundedStore(Generic[K, V]):
    """
    A deterministic, bounded key-value store with:
      - max_size eviction (FIFO)
      - ttl_seconds eviction (based on last_seen_at)
      - eviction on get() and set()
      - last_seen_at updated on successful get()
    """

    def __init__(self, *, max_size: int, ttl_seconds: int):
        if max_size <= 0:
            raise ValueError("max_size must be > 0")
        if ttl_seconds <= 0:
            raise ValueError("ttl_seconds must be > 0")
        self._max_size = max_size
        self._ttl_seconds = ttl_seconds
        self._data: "OrderedDict[K, Tuple[V, float]]" = OrderedDict()  # value, last_seen_at

    @property
    def max_size(self) -> int:
        return self._max_size

    @property
    def ttl_seconds(self) -> int:
        return self._ttl_seconds

    def _now(self) -> float:
        return time.time()

    def _is_expired(self, last_seen_at: float, now: float) -> bool:
        return (now - last_seen_at) > self._ttl_seconds

    def _evict_expired(self, now: float) -> int:
        """
        Evict expired entries. Iterate in insertion order for determinism.
        """
        evicted = 0
        keys_to_delete: list[K] = []
        for k, (_, last_seen_at) in self._data.items():
            if self._is_expired(last_seen_at, now):
                keys_to_delete.append(k)

        for k in keys_to_delete:
            self._data.pop(k, None)
            evicted += 1

        return evicted

    def _evict_overflow(self) -> int:
        """
        Evict oldest entries until size <= max_size.
        """
        evicted = 0
        while len(self._data) > self._max_size:
            self._data.popitem(last=False)
            evicted += 1
        return evicted

    def stats_and_evict(self) -> StoreStats:
        now = self._now()
        ev_exp = self._evict_expired(now)
        ev_ovf = self._evict_overflow()
        return StoreStats(size=len(self._data), evicted_expired=ev_exp, evicted_overflow=ev_ovf)

    def set(self, key: K, value: V) -> StoreStats:
        """
        Insert/update, touch last_seen_at, evict expired and overflow deterministically.
        """
        now = self._now()
        ev_exp = self._evict_expired(now)

        # Update insertion order deterministically:
        # if key exists, delete then re-insert to treat as "latest write"
        if key in self._data:
            self._data.pop(key, None)

        self._data[key] = (value, now)
        ev_ovf = self._evict_overflow()
        return StoreStats(size=len(self._data), evicted_expired=ev_exp, evicted_overflow=ev_ovf)

    def get(self, key: K) -> Optional[V]:
        """
        Get value if present and not expired. Updates last_seen_at and moves to end.
        Returns None if missing or expired.
        """
        now = self._now()
        self._evict_expired(now)

        if key not in self._data:
            return None

        value, _last_seen = self._data.pop(key)
        # Touch and move to end (most recently seen)
        self._data[key] = (value, now)
        return value

    def delete(self, key: K) -> bool:
        return self._data.pop(key, None) is not None

    def keys(self) -> Iterable[K]:
        # Deterministic order
        return list(self._data.keys())

    def values(self) -> Iterable[V]:
        # Deterministic order
        return [v for v, _ in self._data.values()]

    def __len__(self) -> int:
        return len(self._data)