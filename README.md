# Sistema de Gestión de Moteles

Sistema SaaS multi-tenant para la gestión operativa de moteles. Permite administrar turnos, habitaciones, inventario, caja, compras, reservas y reportes desde una interfaz web.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + React-Admin 5 + MUI 6 + Vite |
| Backend | NestJS 10 + Prisma 5 |
| Base de datos | PostgreSQL |
| Auth | JWT (Passport) + bcrypt |
| Gráficos | Recharts |

## Estructura del proyecto

```
/
├── backend/          # API NestJS
│   ├── prisma/       # Schema, migraciones y seed
│   └── src/
│       ├── compartido/bases/   # BaseController y BaseService genéricos
│       ├── modulos/            # Un módulo por recurso (cajas, turnos, compras, etc.)
│       └── main.ts
└── frontend/         # SPA React-Admin
    └── src/
        ├── Operaciones/        # CRUD de recursos operativos
        ├── Reportes/           # Reportes y dashboards
        ├── shared/api/         # HttpClient + nestDataProvider (react-admin)
        └── context/            # MotelContext (selector de motel activo)
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

- `BaseService` detecta si el modelo tiene `motelId` (declarado con `{ hasMotelId: true }` en el constructor) y aplica el filtro automáticamente en `getList`.
- `BaseController` inyecta `motelId` del token en `create` y `update`.

## Setup local

### Requisitos

- Node.js >= 24
- PostgreSQL

### Backend

```bash
cd backend
cp .env.example .env   # configurar DATABASE_URL y JWT_SECRET
npm install
npx prisma generate    # generar el cliente Prisma
npx prisma migrate dev # aplicar migraciones en desarrollo
npx prisma db seed     # datos iniciales
npm run start:dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Variable de entorno (`.env`):
```env
VITE_API_URL=http://localhost:3000
```

---

## Despliegue a Producción

### 1. Preparación de la Base de Datos
En el entorno de producción, las migraciones deben aplicarse usando el comando `deploy` para evitar el borrado accidental de datos:
```bash
npx prisma migrate deploy
```

### 2. Backend (NestJS)
El backend está diseñado para correr como un proceso Node.js. Se recomienda usar un gestor de procesos como **PM2**.

**Pasos de despliegue:**
1.  Configurar variables de entorno (ver tabla abajo).
2.  `npm install --production`
3.  `npm run build`
4.  `pm2 start dist/main.js --name motel-backend`

**Variables de Entorno (Backend):**
| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | String de conexión a Postgres | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Clave para firmar tokens (CRÍTICO) | *Usar una clave larga y aleatoria* |
| `JWT_EXPIRES_IN` | Tiempo de expiración del token | `1h` (default) o `24h` |
| `API_PREFIX` | Prefijo global de rutas | `/api/v1` (default) |
| `PORT` | Puerto de escucha | `3000` |

### 3. Frontend (React)
El frontend se despliega como contenido estático en **AWS S3** y se sirve a través de **CloudFront**.

**Infraestructura (Terraform):**
Ubicada en `frontend/terraform/`. Define el bucket S3, la distribución CloudFront y el certificado SSL (ACM).
```bash
cd frontend/terraform
terraform init
terraform apply
```

**CI/CD (GitHub Actions):**
Configurado en `.github/workflows/deploy.yml`. Al hacer push a `main`:
1.  Instala dependencias y compila (`npm run build`).
2.  Sincroniza la carpeta `dist/` con el bucket S3.
3.  Invalida el caché de CloudFront para reflejar cambios inmediatos.

**Variables de Entorno (Frontend):**
| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `VITE_API_URL` | URL base del backend | `https://api.tu-app.com` |
| `VITE_API_PREFIX` | Prefijo de la API backend | `/api/v1` |

### 4. Despliegue en Render (Backend)
Render es la opción recomendada para el despliegue rápido del backend.

**Opción A: Uso de Blueprint (Recomendado)**
El proyecto incluye un archivo `render.yaml` en la raíz. Solo tienes que:
1.  Ir a **Blueprints** en Render.
2.  Conectar este repositorio.
3.  Render detectará automáticamente la configuración del Web Service, incluyendo las variables `JWT_EXPIRES_IN` y `API_PREFIX`.

**Opción B: Configuración Manual**
1.  **Web Service**: Conectar el repo.
2.  **Root Directory**: `backend`
3.  **Build Command**: `./render-build.sh`
4.  **Start Command**: `npm run start:prod`
5.  **Health Check Path**: `/api/v1/health`

**Variables de Entorno en Render:**
- `DATABASE_URL`: URL de tu Postgres externo.
- `JWT_SECRET`: Clave secreta para tokens.
- `JWT_EXPIRES_IN`: Tiempo de expiración (ej. `1h`).
- `API_PREFIX`: Prefijo de la API (ej. `/api/v1`).
- `FRONTEND_URL`: URL del frontend (para CORS). Ejemplo: `https://d123.cloudfront.net`.

---

## Scripts útiles

```bash
# Backend
npm run build              # compilar para producción
npm run start:prod         # lanzar ejecutable compilado
npx prisma studio          # explorador visual de la DB (dev)
npx prisma migrate deploy  # aplicar migraciones en producción
./render-build.sh          # script de build para Render (local test)

# Frontend
npm run build              # build de producción (genera carpeta dist/)
npm run preview            # previsualizar build localmente
npm run test:e2e           # correr tests de extremo a extremo (Playwright)
```

## Arquitectura backend

Todos los recursos siguen el patrón `BaseController` / `BaseService`:

- **`BaseController`**: Maneja paginación, filtros e inyección de contexto multi-tenant.
- **`BaseService`**: Aplica aislamiento por `motelId` y soporte para "soft-delete".
- **Seguridad**: Implementa `Helmet` para cabeceras HTTP seguras y `ValidationPipe` para mitigar ataques de inyección.

## Arquitectura frontend

- **`nestDataProvider`**: Adaptador personalizado para `react-admin` que se comunica con el backend NestJS.
- **`HttpClient`**: Centraliza las peticiones y maneja el `Authorization Header` y la gestión de errores 401.
- **`MotelContext`**: Gestiona el cambio de motel activo para usuarios con múltiples sedes asignadas.
