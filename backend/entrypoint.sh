#!/usr/bin/env bash
set -euo pipefail

echo "[jcs-backend] applying migrations..."
alembic upgrade head

echo "[jcs-backend] starting uvicorn on :8000..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers