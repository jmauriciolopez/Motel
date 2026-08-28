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




# Sistema de Gestión para Moteles

Software integral para la administración diaria de moteles. Cubre desde la atención al huésped hasta el control de inventario, finanzas y reportes, todo desde una sola plataforma.

---

## ¿Qué permite gestionar?

### Operación diaria

**Turnos y estadías**
- Apertura y cierre de turnos con cálculo automático del total según tarifa y tiempo transcurrido
- Soporte para estadías estándar (por horas) y pernocte
- Reasignación de huéspedes a otra habitación sin perder el historial
- Seguimiento del estado de cada turno: abierto, cerrado o cobrado
- Registro de quién abrió y quién cerró cada turno

**Habitaciones**
- Vista en tiempo real del estado de cada habitación: disponible, ocupada, en limpieza, en mantenimiento o bloqueada
- Asignación de tarifa predeterminada por habitación

**Clientes y vehículos**
- Registro de clientes por patente, marca y color del vehículo
- Alta rápida de cliente desde la pantalla de apertura de turno

**Ventas al huésped (consumos)**
- Registro de productos vendidos durante el turno (bar, mini-bar, amenities)
- El importe se suma automáticamente al total del turno
- El stock se descuenta al momento de la venta

**Cobros y pagos**
- Cobro total o parcial (anticipos) con cualquier forma de pago
- Descuento por pago en efectivo: configurable globalmente o aplicable al momento del cobro
- Cada cobro en efectivo impacta automáticamente en la caja

**Limpiezas**
- Registro del estado de limpieza habitación por habitación
- Al registrar la limpieza, la habitación vuelve al estado disponible automáticamente

**Mantenimientos**
- Registro de trabajos de mantenimiento con asignación a proveedor y estado de finalización

**Reservas**
- Registro anticipado de reservas asociadas a cliente y habitación

---

### Inventario y stock

**Productos y catálogo**
- Administración del catálogo de productos del motel con precio de venta, costo y stock mínimo
- Categorización por rubros (bebidas, amenities, limpieza, etc.)
- Importación del catálogo general de la plataforma para dar de alta productos rápidamente
- Ajuste de precios masivo por categoría

**Depósitos**
- Gestión de múltiples depósitos por motel (depósito principal y depósito de recepción como mínimo)

**Compras a proveedores**
- Registro de compras con detalle de ítems, cantidades y precios
- El stock del depósito principal se actualiza automáticamente al confirmar la compra

**Transferencias entre depósitos**
- Movimiento de productos entre depósitos con validación de stock disponible

**Insumos internos**
- Registro del consumo interno de productos (entrega de amenities a habitaciones, por ejemplo)

**Proveedores**
- Alta y mantenimiento de proveedores con categorización por rubro

---

### Finanzas

**Caja**
- Libro de movimientos con saldo corriente
- Los cobros en efectivo y los gastos se registran automáticamente sin intervención manual

**Gastos**
- Registro de egresos operativos con impacto automático en caja

**Formas de pago**
- Configuración libre de los medios de cobro disponibles (efectivo, tarjeta, transferencia, billeteras virtuales, etc.)

---

### Configuración del motel

- Datos generales: nombre, dirección, teléfono
- Horarios operativos: inicio de turno diurno y nocturno, hora de checkout, tolerancia sin cargo adicional
- Duración estándar del turno (horas de día y de noche) y máximo de horas adicionales permitidas
- Hora de cierre contable (define el "día" para los reportes)
- Días especiales (fines de semana u otros) con tiempo extendido automático
- Porcentaje de descuento por pago en efectivo
- Activar cobro anticipado al abrir el turno

**Tarifas**
- Múltiples tarifas por motel: precio de turno, precio diario, precio promocional, precio por hora excedente (día y noche) y minutos extra incluidos

---

### Reportes

**Ingresos del día**
Total facturado, cantidad de turnos, ticket promedio, distribución de cobros por forma de pago, ventas de bar por producto y ocupación por habitación.

**Rendimiento (por período)**
Ingresos por hora del día, por día de la semana, ranking de habitaciones y distribución entre tarifas regulares, promocionales y pernoctes.

**Analítico interactivo**
Gráfico con múltiples métricas combinables (turnos, limpiezas, facturado, consumos) con zoom, rangos predefinidos y granularidad configurable (hora, día, semana, mes).

**Turnos completados**
Listado detallado de todos los turnos cerrados en un período, con pagos y consumos de cada uno.

**Stock actual**
Vista del inventario en tiempo real por producto y depósito.

**Auditoría de stock**
Movimientos de stock en un período: compras, transferencias, consumos, faltantes y diferencias en pesos.

**Discrepancias**
Detecta turnos donde la suma de pagos no coincide con el total, para control y auditoría de caja.

**Cuadro tarifario**
Comparativa de todas las tarifas activas del motel.

**Historial de clientes**
Visitas y consumos por cliente.

**Lista de compras y estimación de costos**
Compras realizadas en un período y proyección de costos operativos.

---

### Gestión de usuarios

- Alta, edición y desactivación de usuarios
- Cuatro niveles de acceso: Recepcionista, Supervisor, Administrador y Super Administrador
- Un usuario puede tener acceso a varios moteles del mismo propietario

---

### Soporte multi-sucursal

Un propietario puede administrar varios moteles desde una sola cuenta. Cada motel opera de forma completamente independiente en cuanto a datos, stock, caja y configuración. El usuario puede cambiar de sucursal activa desde la interfaz en cualquier momento.

---

### Configuración inicial asistida

Al dar de alta un motel nuevo, un asistente paso a paso guía la configuración completa: datos del propietario, configuración horaria, creación de personal, primera tarifa, habitaciones y carga del catálogo de productos.
