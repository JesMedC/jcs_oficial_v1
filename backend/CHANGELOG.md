# Changelog

Todas las modificaciones notables del backend de JadeCapitalSuite se documentan aquí.

## [Unreleased] — p0a.1 — backend infra + auth foundation

### Added

- Proyecto Python (FastAPI + SQLAlchemy 2.x async + Alembic + Pydantic v2 + JWT).
- Endpoints de auth: register, login, refresh (con rotación), logout, me.
- Modelos: `User`, `Workspace`, `WorkspaceMember`, `RefreshToken`, `AuditLog`.
- Esquemas Pydantic v2 con validadores (email, contraseña, nombre).
- Servicios: `auth_service`, `user_service`, `workspace_service`.
- Middleware 4R: `CorrelationId`, `ErrorEnvelope`, `Idempotency`.
- Hash bcrypt (cost 12) + JWT HS256 (access 15 min / refresh 14 días hasheado en reposo).
- Logging estructurado (structlog) con `correlation_id` propagado.
- CORS por lista blanca configurable por entorno.
- Seed con 3 usuarios demo (`demo@`, `admin@`, `jadestaff@jadecapital.local`).
- Dockerfile multi-stage + `entrypoint.sh` (alembic upgrade + uvicorn).
- docker-compose en la raíz orquestando `postgres` + `backend`.
- Tests smoke (health + auth happy/error paths) con aiosqlite.

### Deferred (siguientes slices)

- p0b — MercadoPago (variables de entorno ya reservadas, lógica no incluida).
- p0c — page views analytics.
- p0d — admin endpoints + admin UI.
- p0e+ — envío de emails (verificación, recuperación de contraseña).