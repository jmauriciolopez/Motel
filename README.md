# Sistema de Gestión de Moteles

Sistema SaaS multi-tenant para la gestión operativa de moteles. Permite administrar turnos, habitaciones, inventario, caja, compras, reservas y reportes desde una interfaz web.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + React-Admin 5 + MUI 6 + Vite |
| Backend | NestJS 10 + Prisma 5 |
| Base de datos | PostgreSQL |
| Auth | JWT en cookie HttpOnly + bcrypt |
| Gráficos | Recharts |
| Infra frontend | AWS S3 + CloudFront (Terraform) |
| Infra backend | Render (Blueprint) |

## Estructura del proyecto

```
/
├── .github/workflows/          # CI/CD (GitHub Actions)
│   ├── backend-deploy.yml      # Trigger deploy en Render al pushear backend/
│   ├── frontend-deploy.yml     # Build + sync S3 + invalidar CloudFront
│   └── frontend-build.yml      # Build check en PRs
├── backend/                    # API NestJS
│   ├── prisma/                 # Schema, migraciones y seed
│   └── src/
│       ├── compartido/bases/   # BaseController y BaseService genéricos
│       ├── modulos/            # Un módulo por recurso
│       └── main.ts
├── frontend/                   # SPA React-Admin
│   ├── terraform/              # Infraestructura AWS (S3 + CloudFront)
│   └── src/
│       ├── Operaciones/        # CRUD de recursos operativos
│       ├── Reportes/           # Reportes y dashboards
│       ├── shared/api/         # HttpClient centralizado
│       └── context/            # MotelContext (selector de motel activo)
├── render.yaml                 # Blueprint de Render (backend + DB)
└── README.md
```

## Modelo de datos principal

- **Propietario** → tiene uno o más **Moteles**
- **Usuario** → asignado a uno o más moteles via `MotelUsuario`
- **Motel** → contiene habitaciones, tarifas, depósitos, productos, turnos, caja, etc.
- **Turno** → ciclo de vida de una habitación (ingreso → consumos → pago → limpieza)
- **Caja** → registro contable de movimientos con saldo acumulado por motel

## Roles

| Rol | Permisos |
|-----|---------|
| `SUPERADMIN` | Acceso total de lectura, no puede crear registros operativos |
| `ADMINISTRADOR` | Gestión completa del motel |
| `SUPERVISOR` | Operaciones + aprobaciones |
| `RECEPCIONISTA` | Operaciones básicas (turnos, consumos, caja) |

## Multi-tenancy

El `motelId` viaja en el JWT — el backend lo extrae del token en cada request. El frontend no envía `motelId` en queries ni en el body de mutaciones.

- `BaseService` detecta si el modelo tiene `motelId` y aplica el filtro automáticamente en `getList`.
- `BaseController` inyecta `motelId` del token en `create` y `update`.

## Seguridad

- JWT almacenado en **cookie HttpOnly** (no accesible desde JS).
- `Helmet` activo con CSP configurada para Google Fonts.
- CORS restringido al origen del frontend (`FRONTEND_URL`).
- `ValidationPipe` con `whitelist: true` en todos los endpoints.

---

## Setup local

### Requisitos

- Node.js >= 24
- PostgreSQL

### Backend

```bash
cd backend
cp .env.example .env   # configurar DATABASE_URL, JWT_SECRET y FRONTEND_URL
npm install
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

Variables mínimas en `backend/.env`:
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/motel
JWT_SECRET=una_clave_larga_y_aleatoria
FRONTEND_URL=http://localhost:3002
PORT=3000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Variable en `frontend/.env`:
```env
VITE_API_URL=http://localhost:3000
VITE_PORT=3002
```

---

## Despliegue a Producción

### Arquitectura

```
GitHub push → main
  ├── backend/** → GitHub Action → Render Deploy Hook → Render Web Service
  └── frontend/** → GitHub Action → npm build → S3 sync → CloudFront invalidation
```

---

### Backend — Render

El backend se despliega en **Render** usando el Blueprint definido en `render.yaml`.

#### Opción A: Blueprint (recomendado)

1. Ir a [Render Blueprints](https://dashboard.render.com/blueprints).
2. Conectar este repositorio.
3. Render crea automáticamente el Web Service `motel-backend` y la base de datos `motel-db`.
4. Configurar manualmente `FRONTEND_URL` con la URL de CloudFront (ver abajo).

#### Opción B: Manual

| Campo | Valor |
|-------|-------|
| Root Directory | `backend` |
| Build Command | `./render-build.sh` |
| Start Command | `npm run start:prod` |
| Health Check | `/api/health` |

#### Variables de entorno en Render

| Variable | Descripción | Cómo configurar |
|----------|-------------|-----------------|
| `DATABASE_URL` | Conexión a PostgreSQL | Auto-vinculada por Blueprint |
| `JWT_SECRET` | Clave de firma JWT | Auto-generada por Blueprint |
| `JWT_EXPIRES_IN` | Expiración del token | `1d` |
| `FRONTEND_URL` | URL del frontend (CORS) | `https://xxxx.cloudfront.net` |
| `PORT` | Puerto de escucha | `3000` |

#### CI/CD

El workflow `.github/workflows/backend-deploy.yml` llama al **Render Deploy Hook** (`RENDER_DEPLOY_HOOK_URL`) en cada push a `main` que modifique archivos en `backend/`.

Agregar el secret en GitHub: **Settings → Secrets → `RENDER_DEPLOY_HOOK_URL`** (se obtiene en Render → Web Service → Settings → Deploy Hook).

---

### Frontend — AWS S3 + CloudFront

#### 1. Infraestructura (una sola vez)

```bash
cd frontend/terraform
cp terraform.tfvars.example terraform.tfvars  # configurar bucket y dominio
terraform init
terraform apply
```

Esto crea:
- Bucket S3 privado (`moteles-frontend-prod`)
- Distribución CloudFront con OAC
- Certificado SSL en ACM (dominio: `moteles.criterioingenieria.online`)

Anotar el **CloudFront domain** del output (`xxxx.cloudfront.net`) — se necesita para `FRONTEND_URL` en Render y para el secret `CLOUDFRONT_DISTRIBUTION_ID` en GitHub.

#### 2. Secrets de GitHub Actions

Ir a **Settings → Secrets and variables → Actions** y agregar:

| Secret | Descripción |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | IAM user con permisos S3 + CloudFront |
| `AWS_SECRET_ACCESS_KEY` | Clave del IAM user |
| `CLOUDFRONT_DISTRIBUTION_ID` | ID de la distribución CloudFront |
| `VITE_API_URL` | URL del backend en Render (ej. `https://motel-backend.onrender.com`) |
| `VITE_API_PREFIX` | Prefijo de la API (ej. `/api`) |

#### 3. CI/CD

El workflow `.github/workflows/frontend-deploy.yml` se dispara en cada push a `main` que modifique archivos en `frontend/`:

1. Instala dependencias y compila (`npm run build`).
2. Sincroniza `dist/` con el bucket S3 (`aws s3 sync --delete`).
3. Invalida el caché de CloudFront (`/*`).

---

### Migraciones en producción

Las migraciones se aplican automáticamente en el build de Render via `render-build.sh`:

```bash
npx prisma generate
npx prisma migrate deploy   # nunca migrate dev en producción
npm run build
```

Para aplicar manualmente:
```bash
DATABASE_URL=<prod_url> npx prisma migrate deploy
```

---

## Scripts útiles

```bash
# Backend
npm run build              # compilar TypeScript
npm run start:prod         # lanzar build compilado
npm run start:dev          # modo desarrollo con hot-reload
npx prisma studio          # explorador visual de la DB
npx prisma migrate deploy  # aplicar migraciones en producción

# Frontend
npm run build              # build de producción (genera dist/)
npm run preview            # previsualizar build localmente
npm run test               # tests unitarios (Vitest)
npm run test:e2e           # tests E2E (Playwright)
```

---

## Arquitectura backend

Todos los recursos siguen el patrón `BaseController` / `BaseService`:

- **`BaseController`**: Paginación, filtros e inyección de contexto multi-tenant.
- **`BaseService`**: Aislamiento por `motelId`, soft-delete automático (modelos con `deletedAt`).
- **Auth**: Cookie HttpOnly con JWT. La estrategia Passport extrae el token desde `req.cookies.token` con fallback al header `Authorization`.

## Arquitectura frontend

- **`nestDataProvider`**: Adaptador para `react-admin` que se comunica con el backend NestJS.
- **`HttpClient`**: Centraliza peticiones con `credentials: 'include'` para enviar la cookie automáticamente.
- **`MotelContext`**: Gestiona el motel activo; persiste en `sessionStorage` (se limpia al cerrar el tab).
- **`authProvider`**: `checkAuth` valida contra el backend (llama a `/autenticacion/refresh`), no depende de datos locales.
