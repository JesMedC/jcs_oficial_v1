"""In-memory alert store with PENDING -> WIN/LOSS resolution.

Design notes:

- Async because it lives inside the FastAPI lifespan task. A single
  ``asyncio.Lock`` guards the underlying state so the scanner loop and
  the resolution loop can both mutate without races.
- ``resolve_due`` is meant to be called once per scanner tick. It walks
  the PENDING alerts and resolves any whose ``expiry_time`` has passed.
- The store keeps at most ``max_recent`` resolved alerts in memory; older
  ones are evicted FIFO.
"""

from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Iterable

from app.engine.models import Alert, AlertStatus


class AlertStore:
    """Thread-safe (asyncio-safe) collection of active and recent alerts."""

    def __init__(self, *, max_recent: int = 200) -> None:
        self._lock = asyncio.Lock()
        self._pending: dict[str, Alert] = {}
        self._recent: list[Alert] = []
        self._max_recent = max_recent
        # Subscribers receive a copy of each new alert (alert_new) and
        # each resolution (alert_update). They are simple async callbacks
        # invoked in registration order.
        self._subscribers: list["asyncio.Queue[Alert]"] = []

    # ------------------------------------------------------------------ #
    # Subscription
    # ------------------------------------------------------------------ #

    def subscribe(self) -> "asyncio.Queue[Alert]":
        """Register a new subscriber and return its bounded queue.

        The queue has size 1024; if the consumer falls behind it drops
        the oldest message silently to keep the producer non-blocking.
        """
        queue: "asyncio.Queue[Alert]" = asyncio.Queue(maxsize=1024)
        self._subscribers.append(queue)
        return queue

    def unsubscribe(self, queue: "asyncio.Queue[Alert]") -> None:
        if queue in self._subscribers:
            self._subscribers.remove(queue)

    def _broadcast(self, alert: Alert) -> None:
        for q in self._subscribers:
            if q.full():
                # Drop oldest to make room.
                try:
                    q.get_nowait()
                except asyncio.QueueEmpty:
                    pass
            try:
                q.put_nowait(alert)
            except asyncio.QueueFull:
                pass

    # ------------------------------------------------------------------ #
    # Mutation
    # ------------------------------------------------------------------ #

    async def add(self, alert: Alert) -> None:
        async with self._lock:
            self._pending[alert.id] = alert
        self._broadcast(alert)

    async def resolve_due(
        self,
        *,
        now: datetime,
        price_lookup,
    ) -> list[Alert]:
        """Resolve any PENDING alerts whose ``expiry_time <= now``.

        ``price_lookup`` is a callable ``expiry_time -> float | None`` that
        returns the close price of the candle at ``expiry_time``. If the
        lookup returns ``None`` (e.g. gap in data) the alert stays PENDING
        until the next tick.

        Returns the list of alerts that changed status this call.
        """
        changed: list[Alert] = []
        async with self._lock:
            for alert in list(self._pending.values()):
                if alert.expiry_time > now:
                    continue
                resolved = price_lookup(alert.expiry_time)
                if resolved is None:
                    continue
                if alert.side == "CALL":
                    alert.status = (
                        AlertStatus.WIN if resolved > alert.entry_price else AlertStatus.LOSS
                    )
                else:  # PUT
                    alert.status = (
                        AlertStatus.WIN if resolved < alert.entry_price else AlertStatus.LOSS
                    )
                self._pending.pop(alert.id, None)
                self._recent.append(alert)
                changed.append(alert)
            # Cap the recent list.
            if len(self._recent) > self._max_recent:
                self._recent = self._recent[-self._max_recent :]

        for alert in changed:
            self._broadcast(alert)
        return changed

    # ------------------------------------------------------------------ #
    # Read-only views
    # ------------------------------------------------------------------ #

    def pending(self) -> list[Alert]:
        return list(self._pending.values())

    def recent(self, limit: int | None = None) -> list[Alert]:
        if limit is None:
            return list(self._recent)
        return list(self._recent[-limit:])

    def all(self) -> list[Alert]:
        """Active + recent, ordered by entry time descending."""
        combined: Iterable[Alert] = list(self._pending.values()) + list(self._recent)
        return sorted(combined, key=lambda a: a.entry_time, reverse=True)
