# Feature: login-end-to-end

> Cierra el flujo de inicio de sesión de `jcs_oficial_v1` (email + password
> verificado + Google OAuth completo) sobre el stack Docker ya corriendo.

## Contexto

- El stack Docker está corriendo healthy: postgres 5433, backend 8000,
  nginx 80/443, dist servido por nginx.
- El working tree tiene 9 archivos modificados + 2 nuevos sin commitear
  que ya implementan gran parte de Google OAuth (router + service + UI
  callback) pero les faltan dos cosas críticas: el campo `google_sub` en
  `User` y las variables de entorno en `docker-compose.yml`.
- Sin Google OAuth configurado, `GET /api/v1/auth/google/login` responde
  503 con `Google login no esta configurado`.
- Login email + password existe como endpoint, devuelve JWTs estándar.
  Falta probar end-to-end con un usuario real.

## Decisiones de diseño

- `google_sub` vive en `users` (nullable, unique, indexed). Cuando
  sumemos Apple/GitHub, evaluamos migrar a `oauth_accounts`.
- El callback OAuth emite los mismos JWTs que `/auth/login` y los pasa
  por querystring al SPA, que los persiste en sessionStorage.
- `.env.example` se reescribe completo: el actual es del scanner viejo
  (Dukascopy/Oanda), no aplica.

## Tareas

| ID | Título | Commit | Estado |
|----|--------|--------|--------|
| T1 | Commit WIP working tree | `wip(auth): scaffold google oauth + nginx spa static` | in_progress |
| T2 | Verificar login email/password end-to-end | `test(auth): verify email-password end-to-end` | pending |
| T3 | Schema + migración `User.google_sub` | `feat(auth): add google_sub to users` | pending |
| T4 | `find_or_create_user_from_google` con `google_sub` | `feat(auth): google oauth links by google_sub first` | pending |
| T5 | docker-compose + .env.example Google OAuth | `chore(env): add google oauth env wiring` | pending |
| T6 | Smoke test backend Google OAuth | `test(auth): verify google oauth endpoint behavior` | pending |
| T7 | Smoke test frontend build | `chore(build): verify frontend builds with auth changes` | pending |
| T8 | Doc de setup Google Cloud Console | `docs(auth): google oauth setup guide` | pending |

## Evidencia

- Branch base: `main`
- Rama: `feat/auth-login-completo`
- Stack base: postgres:16-alpine + FastAPI + nginx:1.27-alpine (corriendo)

## No-goals

- No agregar Dockerfile al frontend (se compila en host por diseño).
- No tocar la integración de MercadoPago (otro scope).
- No cambiar el formato del JWT ni la rotación de refresh tokens.

## Riesgos

- Si el usuario no completa T8 con credenciales reales de Google Cloud
  Console, T6 puede validar solo el path 503, no el 302 real.
- La migración 0014 es no-op para filas existentes (campo nullable).

## Próximo paso

Arrancar T1: rama + commit WIP del working tree actual.
