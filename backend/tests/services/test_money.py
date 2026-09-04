"""``ceil_to_next_dollar`` helper — pure-function unit tests."""
from __future__ import annotations

from decimal import Decimal

import pytest

from app.services.discipline import ceil_to_next_dollar


def test_ceil_to_next_dollar_101() -> None:
    """1.01 → 2 (smallest integer ≥ value)."""
    assert ceil_to_next_dollar(Decimal("1.01")) == Decimal("2")


def test_ceil_to_next_dollar_whole() -> None:
    """5.00 → 5 (whole-dollar inputs return themselves)."""
    assert ceil_to_next_dollar(Decimal("5.00")) == Decimal("5")


def test_ceil_to_next_dollar_zero() -> None:
    """0 → 0 (defensive — discipline engine never calls with this)."""
    assert ceil_to_next_dollar(Decimal("0")) == Decimal("0")


@pytest.mark.parametrize(
    "d,expected",
    [
        (Decimal("0.01"), Decimal("1")),
        (Decimal("0.99"), Decimal("1")),
        (Decimal("1.00"), Decimal("1")),
        (Decimal("1.01"), Decimal("2")),
        (Decimal("5.01"), Decimal("6")),
        (Decimal("404"), Decimal("404")),
        (Decimal("404.0001"), Decimal("405")),
    ],
)
def test_ceil_to_next_dollar_table(d: Decimal, expected: Decimal) -> None:
    """Table-driven round-up across boundary values."""
    assert ceil_to_next_dollar(d) == expected
