# Session notes — login-end-to-end

> Resumen de la sesión donde cerramos el feature de inicio de sesión de
> `jcs_oficial_v1`. Este archivo existe como respaldo del contexto
> porque Engram está atado al proyecto del runtime session y no se
> pudo guardar la memoria desde esta sesión (el cwd del runtime era
> `/home/jmedinac`, no `~/Documents/jcs_oficial_v1`).
>
> **Cómo recuperarlo la próxima sesión**: en una Pi abierta con cwd
> `~/Documents/jcs_oficial_v1`, Engram detecta `jcs_oficial_v1` como
> proyecto activo y carga el contexto automáticamente.

## Goal

Cerrar el flujo de inicio de sesión (email + password + Google OAuth)
sobre el stack Docker ya corriendo de `jcs_oficial_v1`. El usuario
pidió "ayuda con el inicio de sesión" y "arreglar docker del backend
y frontend si es necesario". El docker ya estaba healthy, así que el
trabajo real fue: completar el flow de Google OAuth que estaba
scaffolded en un commit WIP, wirar las env vars, documentar el setup
de Google Cloud Console y arreglar dos bugs que rompían el round-trip.

## Bug 1 — redirect target del callback (crítico)

**Síntoma**: el callback de Google, después de un OAuth exitoso,
redirigía a:

```
https://jadecapitalsuite.com/portal/dashboard?token=...&refresh=...&expires_in=...&provider=google
```

El código que lee esos tokens del querystring (`useEffect` con
`searchParams.get('token')`) vive SOLO en `LoginPage.tsx`. Cuando el
navegador llegaba a `/portal/dashboard`, se montaba `DashboardPage`
(protegido), no `LoginPage`. Los tokens se evaporaban, `ProtectedRoute`
veía usuario anónimo y rebotaba a `/login` pelado — sin banner, sin
error. Exactamente lo que el usuario reportó.

**Fix**: el callback ahora redirige a
`/login?token=...&return_to=/portal/dashboard` (pasando por LoginPage
primero). LoginPage ya tiene la lógica para guardar tokens en
`sessionStorage` y luego `window.location.assign(returnTo)`.

**Diff**:

```python
# Antes (bug):
target = f"{frontend_base}{return_to}?token={access}&refresh={refresh}..."

# Después (fix):
target = (
    f"{frontend_base}/login"
    f"?token={access}"
    f"&refresh={refresh}"
    f"&expires_in={expires_in}"
    f"&return_to={quote(return_to, safe='')}"
    f"&provider=google"
)
```

## Bug 2 — cookie `jcs_oauth_return` quoted

**Síntoma**: Starlette 0.41.3 (la versión pineada en este repo)
formatea cookies con `http.cookies.SimpleCookie.output()`, que
quote-a cualquier valor que no sea estrictamente `token`-shape
(per RFC 7230). `/portal/dashboard` empieza con `/`, no es token-shape,
entonces el `Set-Cookie` header era:

```
Set-Cookie: jcs_oauth_return="/portal/dashboard"; ...
```

Y el round-trip devolvía literalmente `"/portal/dashboard"` con
comillas. Si el SPA lo recibía y hacía
`window.location.assign('"/portal/dashboard"')`, navegaba a un path
roto.

**Fix**: parsear el cookie con `SimpleCookie` al leerlo (que SÍ
des-quotea, igual que un cookie jar conformant).

```python
from http.cookies import SimpleCookie
if oauth_return is not None:
    parsed = SimpleCookie()
    parsed.load(f"jcs_oauth_return={oauth_return}")
    oauth_return = parsed["jcs_oauth_return"].value
```

**Nota importante**: `quote=False` en `set_cookie()` NO existe en
Starlette 0.41.3 — solo aparece en versiones más nuevas. No intentar
deshabilitarlo de esa forma.

## Bug 3 (pre-existente, latente)

`find_or_create_user_from_google` pasaba `email_verified=True` al
constructor de `User`, pero el modelo expone `email_verified_at:
Mapped[datetime | None]` (timestamp), no un boolean. Latente porque
el endpoint siempre devolvía 503 sin config.

**Fix**: `email_verified_at=datetime.now(timezone.utc)`.

## Decisión de diseño: `google_sub` en `users` (no `oauth_accounts`)

`google_sub: Mapped[str | None]` (nullable, unique, indexed) en la
tabla `users` actual. v1 tiene un solo provider de OAuth (Google).
Si después suman Apple/GitHub, migrar a `oauth_accounts(user_id,
provider, sub)`.

**Lookup order** en `find_or_create_user_from_google`:

1. `google_sub` (canonical) — index hit
2. `email` (link if exists, one-shot write del `sub` para que la
   próxima vez tome el path 1)
3. Crear nuevo con placeholder bcrypt hash derivado del `sub`

## Quirk del `.env`

El usuario tenía `GOOGLE_OAUTH_CLIENT_ID` con `.apps.googleusercontent.com`
duplicado al final (Google Console a veces lo muestra con el sufijo,
a veces sin — fácil concatenar dos veces). Fix con sed que borró un
sufijo (99 → 72 chars).

## Patrón del proyecto: frontend sin Dockerfile

`jcs_oficial_v1` NO tiene Dockerfile para el frontend y NO es un
servicio de docker-compose. El build corre en el host
(`pnpm run build` → `dist/`) y nginx sirve `dist/` como volumen
montado `:ro`. Es decisión del repo, NO un bug. Si querés un build
reproducible, eso es un trabajo aparte.

## Commits en `feat/auth-login-completo`

```
16a7d88 chore(gitignore): exclude .env.bak.* from the index
d3beda9 fix(auth): google oauth callback now lands on /login with tokens
6f4b985 docs(readme): link google oauth setup guide from the project root
e82e6a4 docs(auth): google oauth setup guide + link
c5578c0 chore(frontend): remove unused navigate from LoginPage
fd48dc4 chore(env): add google oauth env wiring + rewrite .env.example
2dd7e13 feat(auth): add google_sub to users + link-or-create by sub + tests
b9c73c7 wip(auth): scaffold google oauth + nginx spa static
```

## Archivos tocados clave

- `backend/app/api/v1/google_oauth.py` — callback redirect fix + SimpleCookie parse
- `backend/app/services/google_oauth_service.py` — find_or_create_user_from_google: sub → email → create
- `backend/app/models/user.py` — `google_sub` column
- `backend/alembic/versions/0014_add_google_sub_to_users.py` — migración
- `backend/tests/services/test_google_oauth_service.py` — 5 tests del service
- `backend/tests/api/test_google_oauth_callback_target.py` — 2 tests del redirect target
- `backend/.env.example` — reescrito completo (antes era del scanner viejo)
- `docker-compose.yml` — `GOOGLE_OAUTH_*` env injection
- `docs/google-oauth-setup.md` — walkthrough Google Cloud Console
- `README.md` — link a la guía
- `odd/tasks/login-end-to-end.md` — task list (8/8 done)
- `src/features/auth/LoginForm.tsx` — botón "Iniciar sesión con Google"
- `src/pages/LoginPage.tsx` — handler del callback OAuth con tokens del querystring
- `src/lib/api/client.ts` — `tokenStore.setTokens()` para el flow OAuth
- `infra/nginx/nginx.conf` — soporte para SPA estático (dist)

## Next steps para el usuario

1. **Probar el flow end-to-end en incognito** contra
   `https://jadecapitalsuite.com/login` (el `GOOGLE_OAUTH_REDIRECT_URI`
   actual apunta a prod, no localhost).
2. **Verificar que el `google_sub` se guardó**:
   ```bash
   docker exec jcs-postgres psql -U jcs -d jcs -c \
     "SELECT id, email, role, google_sub IS NOT NULL AS linked FROM users WHERE google_sub IS NOT NULL;"
   ```
3. **Si sigue fallando**, el script de Playwright está en
   `/tmp/pw-debug/debug-oauth.mjs` (chromium headed, DISPLAY=:0).
4. **Cuando esté verde**, mergear la rama (`feat/auth-login-completo`).

## Para abrir Engram correctamente la próxima sesión

El runtime de Pi detecta el proyecto Engram por el cwd cuando arranca.
Si abrís una sesión nueva con cwd `~/Documents/jcs_oficial_v1`, Engram
debería detectar el proyecto `jcs_oficial_v1` (porque ya hay un
`.git` ahí con el remote configurado) y permitir guardar memorias.

Si no lo detecta automáticamente, se puede inicializar manualmente
con `mem_doctor` o `mem_session_start` desde una sesión con cwd
correcto.

## Lecciones que vale la pena no repetir

1. **Cuando emitís tokens one-shot por querystring redirect, el
   handler que los captura tiene que estar montado en la ruta de
   destino.** Si no, los tokens se pierden sin error visible.

2. **Starlette cookie values con `/` u otros chars no token-shape se
   quote-an automáticamente.** El `quote=False` solo existe en
   Starlette moderno. En 0.41.3 hay que des-quotear al leer.

3. **El modelo User tiene `email_verified_at: datetime | None`, no
   `email_verified: bool`.** Cuando marques un email como verificado,
   stampa el timestamp.

4. **Google Cloud Console muestra el `client_id` con el sufijo
   `.apps.googleusercontent.com`.** Si lo pegás en una variable que
   ya termina en ese sufijo, terminás con dos concatenados. Validá
   el largo después de pegar (debe ser ~72 chars).
