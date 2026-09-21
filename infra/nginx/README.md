# infra/nginx — reverse proxy local

Terminacion SSL + load-balancing round-robin para los 3 replicas del backend
FastAPI. Sin PgBouncer, sin Redis, sin replica de Postgres en este scope
(work-unit p0infra.1).

## How to start

Una sola vez (o cada vez que se cae el cert):

```bash
bash infra/nginx/generate-cert.sh
```

Levantar el stack con 3 replicas del backend:

```bash
docker compose up -d --build --scale backend=3
```

## Verify

```bash
# Health check via Nginx (redirige 80 -> 443 primero).
curl -k https://localhost/health

# OpenAPI docs accesibles.
curl -k https://localhost/docs | head -20

# 3 backends + 1 nginx deben estar corriendo.
docker compose ps
```

`docker compose ps` debe listar 4 servicios healthy:
- `jcs-postgres` (1)
- `jcs-backend-1`, `jcs-backend-2`, `jcs-backend-3` (3)
- `jcs-nginx` (1)

## Logs

```bash
# Nginx — conexiones upstream, errores SSL, etc.
docker compose logs -f nginx

# Backend (los 3 replicas).
docker compose logs backend
```

## Renew cert

`generate-cert.sh` es idempotente. Si el cert tiene >= 300 dias de validez
restantes, no regenera. Si lo borras manualmente, vuelve a correrlo.

```bash
rm infra/nginx/certs/local.crt infra/nginx/certs/local.key
bash infra/nginx/generate-cert.sh
docker compose restart nginx
```

## Out of scope (futuros work-units)

- PgBouncer en transaction mode (p0infra.2+)
- Redis + fastapi-cache2 (p0infra.3+)
- Postgres replica (p0infra.4+)
- Multi-tenancy workspace_id (p0api.X)
- Certs validos via mkcert o CA corporativa (no dev)
