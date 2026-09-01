"""User schemas. ``UserOut`` NUNCA incluye el hash."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models import UserRole
from app.schemas.email import JcsEmail


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: JcsEmail
    name: str
    role: UserRole
    email_verified_at: datetime | None
    created_at: datetime