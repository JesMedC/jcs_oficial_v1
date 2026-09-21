"""Money discipline helpers — single-purpose utilities for the
1×1000 trading discipline.

``ceil_to_next_dollar`` (REQ-DISC-004) lives here per the spec
(``discipline-engine`` REQ-DISC-004): a 5-line pure helper that rounds
any positive ``Decimal`` up to the next whole USD. ``Decimal("5.00")``
returns ``Decimal("5")``; ``Decimal("1.01")`` returns ``Decimal("2")``.

The co-location rationale (spec REQ-DISC-004): even though
``discipline_engine`` is the only caller today, putting the helper in
a separate module (instead of inlining it) keeps the rule engine
focused on the cap logic and makes the helper independently unit-
testable. ``discipline_engine.py`` imports from here.

Why ceil (not floor, not round):

- The 1×1000 rule says the trader commits at most 0.25% of capital
  *per trade*, and ``ceil`` ensures we never go BELOW the cap when
  the math produces a fractional USD — protecting capital even if
  the user types ``importe=24.99`` by accident. ``floor`` would let
  the actual risk drift above the 0.25% ceiling, ``round`` is
  ambiguous on 0.5 boundaries.
- The preview badge (``Sugerido: $X``) on the frontend surfaces this
  helper as a hint, so the rounding direction must be predictable
  to the user.
"""
from __future__ import annotations

from decimal import ROUND_CEILING, Decimal


def ceil_to_next_dollar(d: Decimal) -> Decimal:
    """Round a ``Decimal`` UP to the next whole USD.

    Whole-dollar inputs return themselves (quantized to integer
    scale). Any positive fraction rounds up to ``floor(d) + 1``.

    >>> from decimal import Decimal
    >>> ceil_to_next_dollar(Decimal("1.01"))
    Decimal('2')
    >>> ceil_to_next_dollar(Decimal("5.00"))
    Decimal('5')
    >>> ceil_to_next_dollar(Decimal("5.01"))
    Decimal('6')
    >>> ceil_to_next_dollar(Decimal("0.99"))
    Decimal('1')

    Negative or zero inputs return ``Decimal("0")`` — discipline rules
    always treat those as "no trade", and the engine never calls this
    helper with a negative value (the engine rejects ``importe <= 0``
    earlier in the pipeline).
    """
    if d <= Decimal("0"):
        return Decimal("0")
    return d.quantize(Decimal("1"), rounding=ROUND_CEILING)


__all__ = ["ceil_to_next_dollar"]
