"""Session service — 4-band resolver by user timezone.

REQ-DISC-003: maps a UTC ``datetime`` + IANA timezone to one of
``ASIA | EUROPA | NY_AMERICA | NY_PM`` based on the LOCAL hour after
converting the timestamp to the user's TZ.

The four UTC windows in the spec:

    ASIA        00:00–07:00 UTC
    EUROPA      07:00–12:00 UTC
    NY_AMERICA  12:00–17:00 UTC
    NY_PM       17:00–24:00 UTC

Critical edge case (per design §9 / REQ-DISC-003): a UTC ``02:00``
fall inside ``NY_PM`` for ``America/Buenos_Aires`` because it's
``23:00 -03`` the previous day — the local-hour bucket must come
AFTER the TZ conversion, not from raw UTC. The test
``test_session_resolver_tz_aware`` pins this.

Why ``zoneinfo`` (stdlib Python 3.9+): zero new dependencies, the
authoritative IANA database ships with CPython. ``ZoneInfoNotFoundError``
is caught at the API boundary and re-raised as the canonical
``INVALID_TIMEZONE`` (REQ-DISC-002).

Day/session buckets downstream consume ``session_for_timestamp`` +
``local_date`` (computed inside the helper) to apply caps like
"4 ops per (local_date, band)" — see ``discipline_engine``.
"""
from __future__ import annotations

from datetime import date, datetime
from typing import Literal
from zoneinfo import ZoneInfo

Band = Literal["ASIA", "EUROPA", "NY_AMERICA", "NY_PM"]

# UTC-window table. Bands are ordered; the matching algorithm picks
# the first band whose window contains the LOCAL hour.
_UTC_WINDOWS: tuple[tuple[Band, int, int], ...] = (
    ("ASIA", 0, 7),
    ("EUROPA", 7, 12),
    ("NY_AMERICA", 12, 17),
    ("NY_PM", 17, 24),
)


def _resolve_zone(tz: str) -> ZoneInfo:
    """Resolve an IANA tz name. Raises ``ZoneInfoNotFoundError`` on
    unknown names — callers translate to ``INVALID_TIMEZONE``.
    """
    return ZoneInfo(tz)


def session_for_timestamp(ts: datetime, tz: str) -> Band:
    """Return the 4-band session for a UTC ``ts`` under IANA ``tz``.

    The conversion is two-step:

    1. Localize ``ts`` to the user's TZ (preserving the wall-clock
       instant). If ``ts`` is naive, it is assumed UTC.
    2. Look up the LOCAL hour in the UTC-window table.

    Returns the matching band. Falls through to ``NY_PM`` for the
    23:00..23:59 bucket (NY_PM owns hours 17..23 inclusive — hour 24
    is unreachable because hours wrap at 23).

    Raises ``ZoneInfoNotFoundError`` on unknown tz strings; the API
    boundary translates that to ``INVALID_TIMEZONE`` (422).
    """
    zone = _resolve_zone(tz)
    # Defensive: treat naive timestamps as UTC. The DB column is
    # ``DateTime(timezone=True)`` but a malformed payload could slip
    # through in tests; better to localize than to crash on
    # ``astimezone``.
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=ZoneInfo("UTC"))
    local = ts.astimezone(zone)
    hour = local.hour
    for band, start, end in _UTC_WINDOWS:
        if start <= hour < end:
            return band
    # Defensive fallback: hour 24 (impossible with astimezone, but
    # keep the contract explicit if Python ever changes).
    return "NY_PM"


def local_date_for_timestamp(ts: datetime, tz: str) -> date:
    """Return the LOCAL ``date`` (year-month-day) for ``ts`` in ``tz``.

    Used by the daily-cap and session-cap rules to bucket trades by
    the user's calendar day (not UTC date). Same TZ semantics as
    ``session_for_timestamp``.
    """
    zone = _resolve_zone(tz)
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=ZoneInfo("UTC"))
    return ts.astimezone(zone).date()


__all__ = [
    "Band",
    "session_for_timestamp",
    "local_date_for_timestamp",
]
