"""Session classification — canonical 4-band literals (REQ-SES-001..004).

Slices A of ``sessions-configurable-cap`` renamed the legacy literals
``ASIA | EUROPA | NY_AMERICA | NY_PM`` to ``ASIA | LONDON | NEW_YORK
| SYDNEY`` while keeping the UTC window table identical. This test
pins the new literal set + window ordering + TZ-aware bucketing that
the rename must preserve.

RED expectations (the test must FAIL until T-002 lands):
- ``Band`` does not include ``EUROPA`` / ``NY_AMERICA`` / ``NY_PM``
- ``_UTC_WINDOWS`` orders ASIA → LONDON → NEW_YORK → SYDNEY
- A naive timestamp is treated as UTC, not local
"""
from __future__ import annotations

import typing
from datetime import UTC, datetime

from app.services.session_service import (
    Band,
    _UTC_WINDOWS,
    session_for_timestamp,
)


def test_band_literal_set_is_real_names() -> None:
    """REQ-SES-001: ``Band`` is exactly ``ASIA | LONDON | NEW_YORK | SYDNEY``.

    This is the API contract — every consumer (engine, frontend shared
    module, JSON serialization) MUST agree on these four strings.
    """
    assert typing.get_args(Band) == ("ASIA", "LONDON", "NEW_YORK", "SYDNEY")


def test_utc_windows_ordered_by_band() -> None:
    """REQ-SES-002 + REQ-SES-004: windows table is exactly 4 entries
    in the order ``ASIA, LONDON, NEW_YORK, SYDNEY`` with the spec'd
    UTC ranges.
    """
    assert _UTC_WINDOWS == (
        ("ASIA", 0, 7),
        ("LONDON", 7, 12),
        ("NEW_YORK", 12, 17),
        ("SYDNEY", 17, 24),
    )


def test_utc_window_boundaries_utc_tz() -> None:
    """Boundary transitions per the UTC window table.

    REQ-SES-002 covers the [start, end) end-exclusive invariant. The
    final bucket (SYDNEY) owns 17..23 inclusive — 24 is unreachable
    because ``astimezone`` clamps hours to 0..23.
    """
    # ASIA owns 0..6:59
    assert session_for_timestamp(datetime(2026, 9, 4, 0, 0, tzinfo=UTC), "UTC") == "ASIA"
    assert session_for_timestamp(datetime(2026, 9, 4, 6, 59, tzinfo=UTC), "UTC") == "ASIA"
    # LONDON owns 7..11:59
    assert session_for_timestamp(datetime(2026, 9, 4, 7, 0, tzinfo=UTC), "UTC") == "LONDON"
    assert session_for_timestamp(datetime(2026, 9, 4, 11, 59, tzinfo=UTC), "UTC") == "LONDON"
    # NEW_YORK owns 12..16:59 (hour 12 belongs to NEW_YORK — [7,12) is end-exclusive)
    assert session_for_timestamp(datetime(2026, 9, 4, 12, 0, tzinfo=UTC), "UTC") == "NEW_YORK"
    assert session_for_timestamp(datetime(2026, 9, 4, 16, 59, tzinfo=UTC), "UTC") == "NEW_YORK"
    # SYDNEY owns 17..23:59
    assert session_for_timestamp(datetime(2026, 9, 4, 17, 0, tzinfo=UTC), "UTC") == "SYDNEY"
    assert session_for_timestamp(datetime(2026, 9, 4, 23, 59, tzinfo=UTC), "UTC") == "SYDNEY"


def test_naive_timestamp_treated_as_utc() -> None:
    """REQ-SES-003 defensive case: a naive ``datetime`` is assumed UTC.

    The DB column is ``DateTime(timezone=True)`` but a malformed payload
    could slip through; the resolver localizes to UTC rather than
    crashing on ``astimezone``. 02:00 naive → ASIA (hour 2 in [0,7)).
    """
    ts = datetime(2026, 9, 4, 2, 0)  # naive — no tzinfo
    assert session_for_timestamp(ts, "UTC") == "ASIA"


def test_tz_aware_local_hour_overrides_utc() -> None:
    """REQ-SES-003: UTC 02:00 in ``America/Buenos_Aires`` is local 23:00
    prior day → SYDNEY. The naive UTC bucket alone would say ASIA, but
    the local-hour bucket (post TZ conversion) says SYDNEY.

    Pins the edge case called out in design §9 / REQ-DISC-003: the
    local-hour bucket comes AFTER the TZ conversion, not from raw UTC.
    """
    ts = datetime(2026, 9, 5, 2, 0, tzinfo=UTC)
    # Same instant, different tz → different band.
    assert session_for_timestamp(ts, "UTC") == "ASIA"
    assert session_for_timestamp(ts, "America/Buenos_Aires") == "SYDNEY"


def test_unknown_tz_raises_zoneinfo_not_found() -> None:
    """REQ-SES-003: unknown IANA tz propagates ``ZoneInfoNotFoundError``
    so the API boundary can translate to ``INVALID_TIMEZONE``.
    """
    from zoneinfo import ZoneInfoNotFoundError

    import pytest

    ts = datetime(2026, 9, 4, 14, 30, tzinfo=UTC)
    with pytest.raises(ZoneInfoNotFoundError):
        session_for_timestamp(ts, "Atlantis/Avalon")