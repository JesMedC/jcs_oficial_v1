# JadeCapitalSuite — Backend

API REST para JadeCapitalSuite construida con **FastAPI + SQLAlchemy 2.x (async) + PostgreSQL 16 + Alembic**.

## Stack

- Python 3.11+
- FastAPI 0.115
- SQLAlchemy 2.0 (async) + asyncpg
- Alembic (migraciones)
- Pydantic v2 + pydantic-settings
- JWT (python-jose, HS256, access 15 min / refresh 14 días)
- bcrypt (cost factor 12)
- structlog (logging estructurado JSON en prod, consola en dev)

## Validación 4R

Todas las rutas pasan por cuatro verificaciones obligatorias:

- **R1 — Review**: esquemas Pydantic v2 en request y response. Validadores de campo para email, contraseña (mínimo 8, al menos una letra y un dígito) y nombre (2–80).
- **R2 — Risk**: bcrypt cost 12. JWT HS256 con access (15 min) y refresh (14 días) hasheado en reposo (sha256). CORS por lista blanca (`CORS_ALLOW_ORIGINS`). Filtro de workspace por dependencia en endpoints protegidos.
- **R3 — Reliability**: ninguna mutación de dinero o estado vive en la capa de rutas. Todo va por `app/services/*`. Aislamiento de workspace enforced a nivel de servicio.
- **R4 — Resilience**: middleware que envuelve toda respuesta de error en `{code, message, correlation_id, details}`. `X-Correlation-Id` se genera si el cliente no lo envía, se inyecta en `request.state` y en el contexto de structlog. Middleware de idempotencia para `POST/PUT/PATCH` con header `Idempotency-Key` (cache 24h).

## Quickstart (Docker — recomendado)

Desde la raíz del repo:

```bash
docker compose up -d postgres backend
curl http://localhost:8000/health
```

`docker compose` se encarga de levantar Postgres 16 en `5433`, esperar al healthcheck, aplicar migraciones de Alembic (`alembic upgrade head`) y arrancar uvicorn en `8000`.

## Quickstart (local — sin Docker)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env
# editar .env con tus valores (DATABASE_URL apunta a localhost:5432)
alembic upgrade head
python -m app.scripts.seed            # crea 3 usuarios demo + 1 workspace
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Endpoints

| Método | Ruta                       | Auth     | Descripción                                   |
|--------|----------------------------|----------|-----------------------------------------------|
| GET    | `/health`                  | público    | Liveness                                       |
| GET    | `/health/ready`            | público    | Readiness (chequea DB)                         |
| POST   | `/api/v1/auth/register`    | público    | Registro + emisión de tokens                   |
| POST   | `/api/v1/auth/login`       | público    | Login + emisión de tokens                      |
| POST   | `/api/v1/auth/refresh`     | público    | Rotación de refresh token                      |
| POST   | `/api/v1/auth/logout`      | público    | Revoca el refresh token                        |
| GET    | `/api/v1/auth/me`          | Bearer   | Usuario actual + sus workspaces                |

## Demo users (creados por el seed)

| Email                              | Contraseña    | Rol    |
|---------------------|----------------|--------|
| demo@jadecapital.local    | Demo1234!     | USER   |
| admin@jadecapital.local   | Admin1234!    | ADMIN  |
| jadestaff@jadecapital.local | Jade1234!   | BOTH   |

## Configuración de entorno

Ver `.env.example`. Las claves mínimas son `DATABASE_URL`, `JWT_SECRET` (mínimo 32 caracteres), `CORS_ALLOW_ORIGINS`.

## Tests

```bash
cd backend
pytest tests/ -v
```

Los tests usan SQLite en memoria (aiosqlite) — no requieren Postgres corriendo.

## Estructura

```
backend/
├── alembic/              # migraciones
├── app/
│   ├── api/v1/           # rutas HTTP
│   ├── config/           # settings pydantic-settings
│   ├── core/
│   │   ├── middleware/   # correlation, error envelope, idempotency
│   │   └── security/     # password, jwt, cookies
│   ├── db/               # engine + session + base
│   ├── models/           # SQLAlchemy 2.x typed models
│   ├── observability/    # structlog config
│   ├── schemas/          # Pydantic v2 schemas
│   ├── scripts/          # seed + utilidades CLI
│   ├── services/         # logica de negocio (R3)
│   └── main.py           # create_app() factory
├── tests/                # smoke tests pytest-asyncio
├── Dockerfile
├── entrypoint.sh
└── pyproject.toml
```