"""Seed: crea 3 usuarios demo + 1 workspace si no existen.

Uso::

    python -m app.scripts.seed

Idempotente — se puede correr varias veces. Si los emails ya están
registrados, no duplica; sólo crea los que faltan.
"""
from __future__ import annotations

import asyncio

from sqlalchemy import select

from app.core.security.password import hash_password
from app.db.session import dispose_engine, make_engine, make_session_factory
from app.models import User, UserRole, Workspace, WorkspaceMember, WorkspaceMemberRole
from app.services.workspace_service import create_default_workspace_for_user
from app.config import get_settings


DEMO_USERS: list[dict[str, str]] = [
    {
        "email": "demo@jadecapital.local",
        "password": "Demo1234!",
        "name": "Demo Trader",
        "role": UserRole.USER.value,
    },
    {
        "email": "admin@jadecapital.local",
        "password": "Admin1234!",
        "name": "Demo Admin",
        "role": UserRole.ADMIN.value,
    },
    {
        "email": "jadestaff@jadecapital.local",
        "password": "Jade1234!",
        "name": "Jade Staff",
        "role": UserRole.BOTH.value,
    },
]


async def seed() -> None:
    settings = get_settings()
    make_engine(str(settings.database_url))
    factory = make_session_factory()

    async with factory() as db:
        for spec in DEMO_USERS:
            existing = await db.scalar(
                select(User).where(User.email == spec["email"])
            )
            if existing is not None:
                continue
            user = User(
                email=spec["email"],
                password_hash=hash_password(spec["password"]),
                name=spec["name"],
                role=UserRole(spec["role"]),
                is_active=True,
            )
            db.add(user)
            await db.flush()
            await create_default_workspace_for_user(db, user)
            print(f"  + user {spec['email']} ({spec['role']})")

        # Workspace de demo con plan_tier=NONE, owned por demo@
        from sqlalchemy import select as _select

        demo = await db.scalar(
            _select(User).where(User.email == "demo@jadecapital.local")
        )
        if demo is not None:
            stmt = _select(Workspace).where(
                Workspace.name == "Demo Trader Workspace"
            )
            existing_ws = await db.scalar(stmt)
            if existing_ws is None:
                ws = Workspace(
                    name="Demo Trader Workspace",
                    owner_user_id=demo.id,
                )
                db.add(ws)
                await db.flush()
                db.add(
                    WorkspaceMember(
                        workspace_id=ws.id,
                        user_id=demo.id,
                        role=WorkspaceMemberRole.OWNER,
                    )
                )
                print("  + workspace 'Demo Trader Workspace'")

        await db.commit()

    await dispose_engine()
    print("Seed completo.")


if __name__ == "__main__":
    asyncio.run(seed())