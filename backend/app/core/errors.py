"""Admin-specific error classes (R4 Resilience — envelopes).

These complement the canonical ``ErrorCode`` enum in
``app.schemas.envelope``. The router translates them into the standard
``ErrorEnvelope`` payload via the ``_raise_admin_error`` helper in
``app/api/v1/admin.py``.
"""
from __future__ import annotations


class CannotDeactivateSelfError(Exception):
    """Raised when an admin tries to toggle ``is_active=False`` on their own row.

    Maps to envelope code ``ADMINAC_CANNOT_DEACTIVATE_SELF`` (status 403).
    """

    def __init__(self, message: str = "No puedes desactivarte a ti mismo") -> None:
        self.message = message
        super().__init__(message)


class InvalidPriceError(Exception):
    """Raised when an admin submits a negative PlanTierPrice.

    Maps to envelope code ``ADMINAC_INVALID_PRICE`` (status 422).
    """

    def __init__(self, message: str = "Precio invalido: debe ser mayor o igual a 0") -> None:
        self.message = message
        super().__init__(message)
