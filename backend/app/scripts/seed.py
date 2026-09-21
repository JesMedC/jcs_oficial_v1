"""Seed: crea 3 usuarios demo + workspaces + trials + precios de tiers.

Uso::

    python -m app.scripts.seed

Idempotente — se puede correr varias veces. Si los emails ya están
registrados, actualiza ``first_name``, ``last_name`` y ``phone`` al valor
canónico (útil post-migración 0002 que añadió esas columnas).

p0b.1a: se seedean también las filas de ``PlanTierPrice`` (Starter $0 /
Plus $9.99 / Elite $29.99) y la subscripción STARTER / TRIAL / 7 días
para los 3 demos (idempotente: si ya tienen trial, no duplica).
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from sqlalchemy import select

from app.core.security.password import hash_password
from app.db.session import dispose_engine, make_engine, make_session_factory
from app.models import (
    PlanTierPrice,
    Subscription,
    SubscriptionStatus,
    SubscriptionTier,
    User,
    UserRole,
    Workspace,
    WorkspaceMember,
    WorkspaceMemberRole,
)
from app.services.subscription_service import create_trial
from app.services.workspace_service import create_default_workspace_for_user
from app.config import get_settings


DEMO_USERS: list[dict[str, str]] = [
    {
        "email": "demo@jadecapital.local",
        "password": "Demo1234!",
        "first_name": "Demo",
        "last_name": "Trader",
        "phone": "+34612345678",
        "role": UserRole.USER.value,
    },
    {
        "email": "admin@jadecapital.local",
        "password": "Admin1234!",
        "first_name": "Demo",
        "last_name": "Admin",
        "phone": "+34612345679",
        "role": UserRole.ADMIN.value,
    },
    {
        "email": "jadestaff@jadecapital.local",
        "password": "Jade1234!",
        "first_name": "Jade",
        "last_name": "Staff",
        "phone": "+34612345680",
        "role": UserRole.BOTH.value,
    },
]

PLAN_TIER_PRICES: list[dict] = [
    {
        "tier": SubscriptionTier.STARTER,
        "price_usd": 0.00,
        "billing_period_days": 30,
    },
    {
        "tier": SubscriptionTier.PLUS,
        "price_usd": 9.99,
        "billing_period_days": 30,
    },
    {
        "tier": SubscriptionTier.ELITE,
        "price_usd": 29.99,
        "billing_period_days": 30,
    },
]


async def seed() -> None:
    settings = get_settings()
    make_engine(str(settings.database_url))
    factory = make_session_factory()

    now = datetime.now(timezone.utc)

    async with factory() as db:
        # --- 3 demo users (create + update if exists for the new columns) ---
        for spec in DEMO_USERS:
            existing = await db.scalar(
                select(User).where(User.email == spec["email"])
            )
            if existing is not None:
                # Actualizamos los campos añadidos en p0b.1a por si vienen
                # de la migración 0002 con valores placeholder.
                existing.first_name = spec["first_name"]
                existing.last_name = spec["last_name"]
                existing.phone = spec["phone"]
                await db.flush()
                user = existing
                print(f"  = user {spec['email']} (updated)")
            else:
                user = User(
                    email=spec["email"],
                    password_hash=hash_password(spec["password"]),
                    first_name=spec["first_name"],
                    last_name=spec["last_name"],
                    phone=spec["phone"],
                    role=UserRole(spec["role"]),
                    is_active=True,
                )
                db.add(user)
                await db.flush()
                await create_default_workspace_for_user(db, user)
                print(f"  + user {spec['email']} ({spec['role']})")

        # --- Trial subscription para los 3 demos (idempotente) ---
        for spec in DEMO_USERS:
            user = await db.scalar(
                select(User).where(User.email == spec["email"])
            )
            if user is None:
                continue
            existing_trial = await db.scalar(
                select(Subscription).where(
                    Subscription.user_id == user.id,
                    Subscription.status == SubscriptionStatus.TRIAL,
                )
            )
            if existing_trial is not None:
                print(f"  = trial {spec['email']} (ya existe)")
                continue
            # Reusamos la lógica del service para coherencia.
            ws_result = await db.execute(
                select(Workspace)
                .where(Workspace.owner_user_id == user.id)
                .order_by(Workspace.created_at.asc())
                .limit(1)
            )
            ws = ws_result.scalars().first()
            if ws is None:
                print(f"  ! trial {spec['email']} sin workspace — skip")
                continue
            await create_trial(db, user=user, workspace=ws, correlation_id=None)
            print(f"  + trial {spec['email']} → STARTER / 7d")

        # --- Plan tier prices (seed + idempotent update si cambió el precio) ---
        for price_spec in PLAN_TIER_PRICES:
            existing_price = await db.scalar(
                select(PlanTierPrice).where(
                    PlanTierPrice.tier == price_spec["tier"],
                    PlanTierPrice.is_active.is_(True),
                )
            )
            if existing_price is not None:
                existing_price.price_usd = price_spec["price_usd"]
                existing_price.billing_period_days = price_spec[
                    "billing_period_days"
                ]
                await db.flush()
                print(f"  = price {price_spec['tier'].value} (updated)")
                continue
            entry = PlanTierPrice(
                tier=price_spec["tier"],
                price_usd=price_spec["price_usd"],
                billing_period_days=price_spec["billing_period_days"],
                is_active=True,
                effective_from=now,
                effective_until=None,
            )
            db.add(entry)
            await db.flush()
            print(f"  + price {price_spec['tier'].value} ${price_spec['price_usd']}")

        # --- Workspace de demo con plan_tier=NONE, owned por demo@ ---
        demo = await db.scalar(
            select(User).where(User.email == "demo@jadecapital.local")
        )
        if demo is not None:
            stmt = select(Workspace).where(
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
