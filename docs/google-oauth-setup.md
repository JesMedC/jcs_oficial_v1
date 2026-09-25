# Google OAuth setup — JadeCapitalSuite portal

> Guía paso a paso para crear el OAuth Client en Google Cloud Console,
> pegar las credenciales en el stack y verificar el flujo end-to-end.
>
> **Owner del flujo:** backend (`/api/v1/auth/google/login` +
> `/api/v1/auth/google/callback`). El frontend sólo dispara el redirect
> y captura los tokens del querystring (`src/pages/LoginPage.tsx`).

## Prerrequisitos

- Acceso al Google Cloud Console del proyecto (alguien con rol **Owner**
  o **Editor** en `jadecapitalsuite`).
- Dominio público del portal: `jadecapitalsuite.com` y/o `www.`.
- Stack local corriendo: `docker compose up -d` (postgres + backend + nginx).

## 1. Crear / seleccionar el proyecto

1. Ir a https://console.cloud.google.com/.
2. Selector de proyectos (arriba a la izquierda) → **New Project**.
3. Nombre: `JadeCapitalSuite Portal`.
4. Organización: la del equipo.
5. Click **Create**.
6. Anotar el **Project ID** (no el nombre). Lo necesitás para la API
   de credentials.

## 2. Habilitar las APIs necesarias

1. Menú hamburguesa → **APIs & Services** → **Library**.
2. Buscar `Google Identity OAuth 2.0` (no requiere habilitación
   manual en la mayoría de proyectos; viene habilitada por defecto).
3. Si el flujo va a llamar `openidconnect.googleapis.com` directamente
   (que es lo que hace `google_oauth_service.py`), no hay que habilitar
   APIs adicionales. **Confirmar que la OAuth consent screen está
   configurada** (paso 3) antes de probar.

## 3. Configurar la pantalla de consentimiento (OAuth consent screen)

1. Menú → **APIs & Services** → **OAuth consent screen**.
2. Tipo:
   - **External** — si querés que cualquier usuario de Google pueda
     loguearse (recomendado para producción).
   - **Internal** — sólo si vas a limitar a usuarios del Workspace
     del equipo.
3. Completar:
   - **App name**: `JadeCapitalSuite`.
   - **User support email**: tu mail.
   - **App logo** (opcional): 120×120 PNG.
   - **App domain**:
     - Application home page: `https://jadecapitalsuite.com`
     - Privacy policy: `https://jadecapitalsuite.com/privacy`
     - Terms of service: `https://jadecapitalsuite.com/terms`
   - **Authorized domains**: `jadecapitalsuite.com` (sin www, sin https).
   - **Developer contact email**: tu mail.
4. **Scopes**: agregar `openid`, `email`, `profile`. No hace falta más.
5. **Test users** (sólo en modo Testing): agregar los mails de los
   devs que van a probar antes de publicar.
6. Click **Save and continue** hasta el final.

## 4. Crear el OAuth Client ID

1. Menú → **APIs & Services** → **Credentials**.
2. **Create credentials** → **OAuth client ID**.
3. **Application type**: **Web application**.
4. **Name**: `JadeCapitalSuite Portal Backend` (o similar).
5. **Authorized JavaScript origins**:
   - `https://jadecapitalsuite.com`
   - `https://www.jadecapitalsuite.com`
   - `https://localhost` (sólo dev)
6. **Authorized redirect URIs** (MUY importante, debe matchear
   EXACTAMENTE el `GOOGLE_OAUTH_REDIRECT_URI` que pongas en `.env`):
   - `https://jadecapitalsuite.com/api/v1/auth/google/callback`
   - `https://www.jadecapitalsuite.com/api/v1/auth/google/callback`
   - `https://localhost/api/v1/auth/google/callback` (sólo dev)
7. Click **Create**.
8. Anotar **Client ID** y **Client secret** en un password manager.
   El secret sólo se muestra una vez.

## 5. Pegar las credenciales en el stack

### Opción A — variable de entorno en el shell

```bash
cd ~/Documents/jcs_oficial_v1
docker compose down backend
GOOGLE_OAUTH_CLIENT_ID="<tu-client-id>.apps.googleusercontent.com" \
GOOGLE_OAUTH_CLIENT_SECRET="<tu-client-secret>" \
GOOGLE_OAUTH_REDIRECT_URI="https://jadecapitalsuite.com/api/v1/auth/google/callback" \
docker compose up -d backend
```

Para dev local usar:

```bash
GOOGLE_OAUTH_REDIRECT_URI="https://localhost/api/v1/auth/google/callback"
```

### Opción B — `.env` en el repo root

`docker-compose.yml` ya lee del shell environment con defaults
vacíos. Crear `~/Documents/jcs_oficial_v1/.env` (NO commitearlo,
ya está en `.gitignore`) con:

```
GOOGLE_OAUTH_CLIENT_ID=<tu-client-id>.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=<tu-client-secret>
GOOGLE_OAUTH_REDIRECT_URI=https://jadecapitalsuite.com/api/v1/auth/google/callback
```

Luego:

```bash
docker compose up -d --build backend
```

### Verificar que la config se aplicó

```bash
docker exec jcs_oficial_v1-backend-1 printenv | grep GOOGLE_OAUTH
# Debe mostrar las 3 vars con valores reales.

curl -sk -i https://localhost/api/v1/auth/google/login
# Debe devolver 302 a accounts.google.com con location header.
```

## 6. Probar el flujo end-to-end

### Dev (con `localhost`)

1. Asegurarse que nginx está sirviendo el SPA: `curl -sk
   https://localhost/` debe devolver HTML con el `<div id="root">`.
2. Abrir `https://localhost/login` en el navegador.
3. Click **Iniciar sesion con Google**.
4. Elegir la cuenta de Google.
5. Aceptar los scopes en la consent screen.
6. Google redirige a `https://localhost/api/v1/auth/google/callback?code=...&state=...`.
7. El backend valida el `state` contra la cookie `jcs_oauth_state`,
   intercambia el `code` por tokens, busca/crea el user, y redirige
   a `https://localhost/portal/dashboard?token=...&refresh=...
   &expires_in=900&provider=google`.
8. El SPA (`LoginPage`) captura los tokens del querystring, los
   guarda en `sessionStorage`, hace strip del querystring y hace
   `window.location.assign('/portal/dashboard')`.
9. El `AuthProvider` hace `/api/v1/auth/me` y muestra el dashboard
   autenticado.

### Verificación programática

```bash
# Después del OAuth, en el backend:
docker exec jcs-postgres psql -U jcs -d jcs -c \
  "SELECT id, email, role, google_sub FROM users WHERE google_sub IS NOT NULL;"
```

Debe devolver una fila con el `google_sub` (un string largo tipo
`1092837462183746251928374619`) poblado.

## Troubleshooting

| Síntoma | Causa probable | Fix |
|---------|---------------|-----|
| 503 con `Google login no esta configurado` | Alguna de las 3 env vars está vacía | `docker exec jcs_oficial_v1-backend-1 printenv \| grep GOOGLE_OAUTH` |
| 400 con `redirect_uri_mismatch` | El `GOOGLE_OAUTH_REDIRECT_URI` no matchea la Authorized redirect URI de Google | Revisar la lista en Credentials y agregar el valor exacto |
| 400 con `OAuth state invalido (posible CSRF)` | La cookie `jcs_oauth_state` no se persistió entre el `/login` y el `/callback` (navegador sin cookies, o redirect cross-site bloqueado) | Verificar que el navegador acepta cookies HttpOnly Secure SameSite=Lax |
| 400 con `Google no devolvio un email verificado` | La cuenta de Google no tiene email verificado, o el scope `email` no se pidió | Forzar email verificado en la cuenta, o revisar que `scope=openid+email+profile` está en la URL de Google |
| 400 con `Faltan parametros code o state` | El callback se llamó sin los query params (Google redirigió con error) | Inspeccionar la URL completa del callback |
| 302 a `/login?oauth_error=denied` | El usuario clickeó "Cancelar" en la consent screen | Comportamiento esperado. El `LoginPage` muestra un banner amarillo. |

## Variables relacionadas

- `GOOGLE_OAUTH_CLIENT_ID`: client ID de Google (termina en
  `.apps.googleusercontent.com`).
- `GOOGLE_OAUTH_CLIENT_SECRET`: client secret. **Tratar como
  password**. Nunca commitear.
- `GOOGLE_OAUTH_REDIRECT_URI`: URL exacta que se registró en
  Google Cloud Console. El backend la usa también para derivar el
  origin del frontend (`_frontend_base_from_redirect` en
  `backend/app/api/v1/google_oauth.py`).
