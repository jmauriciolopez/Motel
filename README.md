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
npx prisma migrate dev
npx prisma db seed     # datos iniciales
npm run start:dev
```

Variables de entorno requeridas:

```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/motel?schema=public"
JWT_SECRET="tu_secreto_seguro"
PORT=3000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Variable de entorno:

```env
VITE_API_URL=http://localhost:3000
```

El frontend corre en `http://localhost:5173` por defecto (o el puerto que asigne Vite).

## Scripts útiles

```bash
# Backend
npm run start:dev          # desarrollo con hot-reload
npm run build              # compilar
npx prisma studio          # explorador visual de la DB
npx prisma migrate dev     # aplicar migraciones

# Frontend
npm run dev                # desarrollo
npm run build              # build de producción
npm run test               # tests unitarios (Vitest)
```

## Arquitectura backend

Todos los recursos siguen el patrón `BaseController` / `BaseService`:

- **`BaseController`** maneja paginación, filtros, inyección de `motelId` desde el token y bloqueo de `SUPERADMIN` en creates.
- **`BaseService`** aplica soft-delete (`deletedAt`), filtro por `motelId` y paginación genérica.
- Los módulos específicos sobreescriben solo lo que necesitan (ej: `CajasService` calcula el saldo acumulado en `crear`).

## Arquitectura frontend

- **`nestDataProvider`** adapta react-admin al backend NestJS. Traduce filtros de RA a query params y JSON `filtro` para Prisma.
- **`HttpClient`** inyecta el `Authorization: Bearer` header en todos los requests.
- Los filtros de `motelId` fueron eliminados de todos los componentes — el backend los resuelve desde el token.
