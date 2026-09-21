# syntax=docker/dockerfile:1.7

FROM python:3.12-slim AS builder
WORKDIR /app

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONDONTWRITEBYTECODE=1

RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential libpq-dev \
 && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./

RUN pip install --upgrade pip \
 && pip install .

# --- runtime stage ---
FROM python:3.12-slim AS runtime
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update \
 && apt-get install -y --no-install-recommends libpq5 \
 && rm -rf /var/lib/apt/lists/* \
 && useradd --create-home --shell /bin/bash jcs

COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --chown=jcs:jcs pyproject.toml ./
COPY --chown=jcs:jcs app ./app
COPY --chown=jcs:jcs alembic ./alembic
COPY --chown=jcs:jcs alembic.ini ./
COPY --chown=jcs:jcs entrypoint.sh ./entrypoint.sh

RUN chmod +x ./entrypoint.sh

USER jcs
EXPOSE 8000

ENTRYPOINT ["./entrypoint.sh"]