"""PageView model — un row por cada visita a una página pública o
protegida de JadeCapitalSuite.

p0c: el backend expone ``POST /api/v1/analytics/pageview`` (público, sin
auth) que el SPA llama automáticamente en cada cambio de ruta. El
``anonymous_id`` se persiste en una cookie no-httpOnly
(``jcs.analytics.anon_id``) para correlacionar visitas del mismo
visitante sin necesidad de cuenta.

Las agregaciones viven en ``analytics_service`` — usan los índices
compuestos para mantener el dashboard admin barato.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PageView(Base):
    """Una visita a una página. Append-only — sin ``updated_at``."""

    __tablename__ = "page_views"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # Nullable: visitantes anónimos no tienen user_id. La API rellena
    # uno u otro pero nunca ambos a la vez.
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        default=None,
    )
    # UUID v4 — generado por el cliente o el backend en el primer hit.
    anonymous_id: Mapped[str | None] = mapped_column(
        String(36), nullable=True, default=None
    )
    page_path: Mapped[str] = mapped_column(String(200), nullable=False)
    page_title: Mapped[str | None] = mapped_column(
        String(200), nullable=True, default=None
    )
    referrer: Mapped[str | None] = mapped_column(
        String(500), nullable=True, default=None
    )
    user_agent: Mapped[str | None] = mapped_column(
        String(500), nullable=True, default=None
    )
    # ``session_id`` agrupa hits en una misma sesión de navegación.
    session_id: Mapped[str | None] = mapped_column(
        String(36), nullable=True, default=None
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    __table_args__ = (
        Index("ix_page_views_path_created", "page_path", "created_at"),
        Index("ix_page_views_user_created", "user_id", "created_at"),
        Index("ix_page_views_anon_created", "anonymous_id", "created_at"),
        Index("ix_page_views_session_id", "session_id"),
    )

    def __repr__(self) -> str:
        return (
            f"<PageView path={self.page_path!r} user={self.user_id} "
            f"anon={self.anonymous_id} at={self.created_at}>"
        )


__all__ = ["PageView"]