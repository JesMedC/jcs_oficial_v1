"""Session service — 4-band resolver + UTC ↔ local-date helpers."""
from __future__ import annotations

from datetime import UTC, datetime

import pytest

from app.services.session_service import (
    Band,
    local_date_for_timestamp,
    session_for_timestamp,
)


def test_ny_america_window() -> None:
    """14:30 UTC in UTC tz → NY_AMERICA (12-17 UTC window)."""
    ts = datetime(2026, 9, 4, 14, 30, tzinfo=UTC)
    assert session_for_timestamp(ts, "UTC") == "NY_AMERICA"


def test_europa_window() -> None:
    """09:00 UTC in UTC tz → EUROPA (7-12 UTC window)."""
    ts = datetime(2026, 9, 4, 9, 0, tzinfo=UTC)
    assert session_for_timestamp(ts, "UTC") == "EUROPA"


def test_asia_window() -> None:
    """03:00 UTC in UTC tz → ASIA (0-7 UTC window)."""
    ts = datetime(2026, 9, 4, 3, 0, tzinfo=UTC)
    assert session_for_timestamp(ts, "UTC") == "ASIA"


def test_ny_pm_window() -> None:
    """19:00 UTC in UTC tz → NY_PM (17-24 UTC window)."""
    ts = datetime(2026, 9, 4, 19, 0, tzinfo=UTC)
    assert session_for_timestamp(ts, "UTC") == "NY_PM"


def test_session_resolver_tz_aware() -> None:
    """02:00 UTC in ``America/Buenos_Aires`` (= 23:00 -03 prior day) → NY_PM.

    Pins the edge case called out in design §9 / REQ-DISC-003: the
    local-hour bucket comes AFTER the TZ conversion. The naive UTC
    bucket alone would say ASIA, but in the user's local time it's
    NY_PM (23:00 is in the 17-24 window).
    """
    ts = datetime(2026, 9, 5, 2, 0, tzinfo=UTC)
    # 02:00 UTC on Sep 5 = 23:00 -03 on Sep 4 (Argentina does not
    # observe DST as of this date). NY_PM owns hours 17..23 inclusive.
    assert session_for_timestamp(ts, "America/Buenos_Aires") == "NY_PM"


def test_local_date_for_timestamp_tz_aware() -> None:
    """01:00 UTC on Sep 5 → Sep 4 in ``America/Buenos_Aires``."""
    ts = datetime(2026, 9, 5, 1, 0, tzinfo=UTC)
    from datetime import date

    assert local_date_for_timestamp(ts, "America/Buenos_Aires") == date(
        2026, 9, 4
    )


def test_session_resolver_unknown_tz_raises() -> None:
    """Unknown IANA tz propagates ``ZoneInfoNotFoundError`` for the
    API layer to translate to ``INVALID_TIMEZONE``.
    """
    from zoneinfo import ZoneInfoNotFoundError

    ts = datetime(2026, 9, 4, 14, 30, tzinfo=UTC)
    with pytest.raises(ZoneInfoNotFoundError):
        session_for_timestamp(ts, "Mars/Olympus_Mons")


@pytest.mark.parametrize(
    "tz,ts,band",
    [
        # 8 window × tz = many combinations; cover the four boundary
        # transitions at least once per UTC window.
        ("UTC", datetime(2026, 9, 4, 0, 0, tzinfo=UTC), "ASIA"),
        ("UTC", datetime(2026, 9, 4, 6, 59, tzinfo=UTC), "ASIA"),
        ("UTC", datetime(2026, 9, 4, 7, 0, tzinfo=UTC), "EUROPA"),
        ("UTC", datetime(2026, 9, 4, 11, 59, tzinfo=UTC), "EUROPA"),
        ("UTC", datetime(2026, 9, 4, 12, 0, tzinfo=UTC), "NY_AMERICA"),
        ("UTC", datetime(2026, 9, 4, 16, 59, tzinfo=UTC), "NY_AMERICA"),
        ("UTC", datetime(2026, 9, 4, 17, 0, tzinfo=UTC), "NY_PM"),
        ("UTC", datetime(2026, 9, 4, 23, 59, tzinfo=UTC), "NY_PM"),
    ],
)
def test_session_band_table(tz: str, ts: datetime, band: Band) -> None:
    """Boundary transitions per UTC window."""
    assert session_for_timestamp(ts, tz) == band
