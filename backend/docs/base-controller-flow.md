# Flujo Base Controller / Service

Arquitectura multi-tenant SaaS. Cada request pasa por una cadena de guards, llega al controller base, y delega al service base que ejecuta contra Prisma.

---

## Pipeline de un Request

```
HTTP Request
    │
    ├─ JwtAuthGuard        → valida Bearer token, puebla req.user (JwtUser)
    ├─ RolesGuard          → verifica que req.user.rol esté en @Roles(...)
    ├─ TenantGuard         → resuelve req.tenant (TenantContext) según rol + x-motel-id
    │
    └─ Controller (BaseController)
           │
           └─ Service (BaseService)
                  │
                  └─ Prisma
```

---

## 1. Guards

### JwtAuthGuard
Extiende `AuthGuard('jwt')` de Passport. Lee el `Bearer token` del header `Authorization`, lo valida con `JwtEstrategia`, y puebla `req.user`.

```ts
// req.user después del guard:
{
  sub: "userId",
  id: "userId",
  email: "user@mail.com",
  rol: "ADMINISTRADOR",
  propietarioId: "prop-id",
  moteles: ["motel-id-1"],
  motelId: "motel-id-1"
}
```

Respeta `@Public()` — si el endpoint tiene ese decorador, el guard deja pasar sin validar.

### RolesGuard
Lee los roles requeridos del decorador `@Roles(...)` en el controller/handler. Si `req.user.rol` no está en la lista, lanza `403 Forbidden`.

```ts
@Roles(RolUsuario.ADMINISTRADOR, RolUsuario.SUPERVISOR)
@Controller('compras')
```

### TenantGuard
El más complejo. Resuelve el **contexto de tenant** (`req.tenant`) según el rol del usuario y el header `x-motel-id`.

**Fuentes del motelId** (en orden de prioridad):
1. Header `x-motel-id`
2. Query param `motelId`

**Lógica por rol:**

| Rol | Sin x-motel-id | Con x-motel-id |
|-----|---------------|----------------|
| `SUPERADMIN` | `scope: global` (si `@AllowGlobal`) o error | `scope: motel` con ese motelId |
| `ADMINISTRADOR` | usa primer motel del JWT | valida que tenga acceso |
| `SUPERVISOR` / `RECEPCIONISTA` | usa motelId del JWT | error si difiere del asignado |

**Resultado en `req.tenant`:**
```ts
interface TenantContext {
  motelId: string | null;  // null = superadmin global
  scope: 'global' | 'motel';
  rol: RolUsuario;
  userId: string;
  propietarioId?: string | null;
}
```

### Decoradores relacionados

| Decorador | Efecto |
|-----------|--------|
| `@Public()` | Saltea JwtAuthGuard y RolesGuard |
| `@Roles(...roles)` | Define roles permitidos para RolesGuard |
| `@AllowGlobal()` | Permite que SUPERADMIN opere sin x-motel-id (scope global) |

---

## 2. BaseController

Clase abstracta genérica `BaseController<T, CreateDto, UpdateDto>`. Todos los controllers del sistema la extienden.

```ts
@Controller('productos')
@Roles(RolUsuario.ADMINISTRADOR, RolUsuario.SUPERVISOR)
export class ProductosController extends BaseController<Producto, CrearProductoDto, ActualizarProductoDto> {
  constructor(service: ProductosService) {
    super(service);
  }
}
```

### Endpoints

#### `POST /` — crear
1. Lee `req.tenant`
2. Si el modelo tiene `motelId` y el scope es global → `403` (SuperAdmin debe indicar motel)
3. Si el modelo tiene `motelId` y no hay motelId → `400`
4. Inyecta `motelId` al DTO y llama `service.crear(data)`

```
Body: { Nombre: "Producto X", Precio: 100 }
      ↓
data: { Nombre: "Producto X", Precio: 100, motelId: "motel-id" }
      ↓
service.crear(data)
```

#### `GET /` — obtenerTodos
Parámetros de query soportados:

| Param | Descripción |
|-------|-------------|
| `_page` | Número de página (default: 1) |
| `_limit` | Registros por página (default: 10) |
| `_sort` | Campo de ordenamiento (PascalCase, ej: `Nombre`) |
| `_order` | `asc` o `desc` |
| `filtro` | JSON stringificado con filtros anidados |
| `include` | JSON stringificado con relaciones a incluir |
| `*` | Cualquier otro query param se trata como filtro directo |

El `motelId` del tenant se inyecta automáticamente en el where si el modelo lo tiene.

Los filtros extra pasan por `normalizarFiltroParaPrisma` antes de llegar a Prisma.

#### `GET /:id` — obtenerUno
Busca por `id`. Aplica `scopedMotelId`:
- SuperAdmin global → `null` (sin filtro de motel)
- Resto → `tenant.motelId`

#### `PATCH /:id` — actualizar
Inyecta `motelId` al data igual que en crear. Usa `scopedMotelId` para verificar que el registro pertenezca al motel del usuario.

#### `DELETE /:id` — eliminar
Soft delete si el modelo tiene `deletedAt`, hard delete si no. Respeta `scopedMotelId`.

### Helpers privados

**`parseObjectQuery(value)`**: parsea un JSON string de query param y lo normaliza con `normalizarFiltroParaPrisma`.

**`scopedMotelId(tenant)`**: retorna `null` para SuperAdmin global (sin restricción de motel), o `tenant.motelId` para el resto.

---

## 3. BaseService

Clase abstracta genérica. Detecta automáticamente en el constructor si el modelo tiene `deletedAt` (soft delete) y `motelId` (multi-tenant) usando el DMMF de Prisma.

```ts
constructor(prisma, 'producto', { hasMotelId: true })
//                               ↑ override manual si la detección automática falla
```

### obtenerTodos

```
options (PaginationOptions) + extraWhere
    │
    ├─ normalizarFiltroParaPrisma(extraWhere)  → limpia campos virtuales
    ├─ where = { ...extraWhereNormalizado }
    ├─ if hasSoftDelete → where.deletedAt = null
    ├─ if hasMotelId && options.motelId → where.motelId = options.motelId
    │
    ├─ Extrae: page, limit, sort, order, motelId, include, orderBy de options
    ├─ El resto → filters → normalizarFiltroParaPrisma(filters)
    │
    ├─ aplicarFiltrosVirtuales(where, filtrosNormalizados)
    │     └─ si existe=true/false → ajusta where.deletedAt
    │     └─ elimina 'existe' de filtrosNormalizados
    │
    ├─ Object.assign(where, filtrosNormalizados)
    ├─ sanitizarWhereParaPrisma(where)  → elimina claves virtuales residuales
    │
    └─ prisma[model].findMany({ where, skip, take, orderBy, include })
       prisma[model].count({ where })
```

### obtenerUno
Busca por `id` + `extraWhere`. Aplica soft delete y `scopedMotelId` si corresponde.

### actualizar
Si el modelo tiene `motelId`, primero hace `findFirst` con el `scopedMotelId` para verificar ownership, luego `update`.

### eliminar
Intenta soft delete (`deletedAt = new Date()`). Si el modelo no tiene ese campo, hace hard delete.

---

## 4. normalizarFiltroParaPrisma

Transforma filtros del frontend (react-admin / query params) al formato que Prisma espera.

**Casos que maneja:**

| Input | Output Prisma |
|-------|--------------|
| `{ "Cantidad[$lt]": 5 }` | `{ Cantidad: { lt: 5 } }` |
| `{ Precio: { $gte: 100 } }` | `{ Precio: { gte: 100 } }` |
| `{ "deposito.Nombre": "X" }` | `{ deposito: { Nombre: "X" } }` |
| `{ existe: true }` | eliminado (campo virtual) |
| `{ populate: "..." }` | eliminado (campo legacy) |

**Operadores soportados:** `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`, `$contains`, `$startsWith`, `$endsWith`

---

## 5. Sobreescribir comportamiento

Para customizar un endpoint, el controller hijo sobreescribe el método:

```ts
@Controller('moteles')
@AllowGlobal()
export class MotelesController extends BaseController<...> {

  // Sobreescribe GET / para inyectar filtros de seguridad por propietario
  @UseGuards(JwtAuthGuard)
  @Get()
  override obtenerTodos(@Query(...) ..., @UsuarioActual() usuario) {
    const extraWhere = isSuperAdmin ? {} : { propietarioId: usuario.propietarioId };
    return this.service.obtenerTodos({ ... }, extraWhere);
  }

  // Sobreescribe GET /:id para incluir relación propietario
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  override obtenerUno(@Param('id') id: string) {
    return this.service.obtenerUno(id, { propietario: true });
  }
}
```

Para customizar el service:

```ts
export class ComprasService extends BaseService<Compra> {
  async crear(dto: CrearCompraDto) {
    // lógica custom: transacción, stock, etc.
    return this.prisma.$transaction(async (tx) => { ... });
  }

  async obtenerTodos(options, extraWhere) {
    // inyecta includes fijos
    return super.obtenerTodos({ ...options, include: { deposito: true } }, extraWhere);
  }
}
```

---

## 6. Flujo completo — ejemplo `GET /productos?_page=1&_limit=10&Facturable=true`

```
1. JwtAuthGuard
   → valida token → req.user = { rol: ADMINISTRADOR, motelId: "m1" }

2. RolesGuard
   → ADMINISTRADOR está en @Roles → OK

3. TenantGuard
   → scope: motel, motelId: "m1" → req.tenant

4. BaseController.obtenerTodos
   → motelId = "m1"
   → filters = { Facturable: "true" }
   → service.obtenerTodos({ page:1, limit:10, motelId:"m1", Facturable:"true" }, undefined)

5. BaseService.obtenerTodos
   → extraWhere = {} → where = {}
   → hasSoftDelete → where.deletedAt = null
   → hasMotelId   → where.motelId = "m1"
   → filters = { Facturable: "true" }
   → normalizarFiltroParaPrisma → { Facturable: "true" }
   → aplicarFiltrosVirtuales → no hay 'existe', no-op
   → Object.assign → where = { deletedAt: null, motelId: "m1", Facturable: "true" }
   → sanitizar → OK

6. Prisma
   → producto.findMany({ where: { deletedAt: null, motelId: "m1", Facturable: "true" }, skip: 0, take: 10 })
   → producto.count({ where: ... })

7. Response
   → { data: [...], total: N }
```

---

## 7. Notas importantes para extender

- **Siempre** llamar `super.obtenerTodos(...)` desde el service hijo para mantener paginación, soft delete y tenant filter.
- Si el controller hijo sobreescribe `crear`, debe inyectar `motelId` manualmente (el BaseController no lo hace si se sobreescribe).
- El `transform` de react-admin en el frontend debe limpiar objetos relacionados (`deposito`, `proveedor`, etc.) antes de enviar el POST — de lo contrario Prisma los interpreta como operaciones de relación.
- `usuarioId` en modelos que lo requieren debe inyectarse desde `req.user.sub` en el controller, no desde el frontend.
