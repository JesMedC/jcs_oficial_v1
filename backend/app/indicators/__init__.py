"""Indicator implementations.

Each module wraps a piece of pandas-ta-classic (or a hand-rolled detector)
behind a pure-Python function that takes a ``pandas.DataFrame`` and returns
either a ``pandas.Series`` / ``pandas.DataFrame`` or a domain-specific
``dataclass``.

Public API:

- :func:`app.indicators.ema.compute_emas`
- :func:`app.indicators.bollinger.compute_bollinger`
- :func:`app.indicators.stochastic.compute_stochastic`
- :func:`app.indicators.support_resistance.detect_levels`
- :func:`app.indicators.fibonacci.detect_retracements`
- :func:`app.indicators.trend.detect_trend`
"""

from app.indicators.bollinger import compute_bollinger
from app.indicators.ema import compute_emas
from app.indicators.fibonacci import (
    FibonacciRetracement,
    detect_retracements,
)
from app.indicators.stochastic import compute_stochastic
from app.indicators.support_resistance import (
    PivotLevel,
    detect_levels,
    nearest_resistance,
    nearest_support,
)
from app.indicators.trend import TrendDirection, detect_trend

__all__ = [
    "compute_bollinger",
    "compute_emas",
    "compute_stochastic",
    "detect_levels",
    "detect_retracements",
    "detect_trend",
    "FibonacciRetracement",
    "PivotLevel",
    "TrendDirection",
    "nearest_resistance",
    "nearest_support",
]
