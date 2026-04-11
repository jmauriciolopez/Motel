# Refactor Multi-Tenant — Playbook de implementación

## Objetivo

Dejar el sistema en un estado **multi-tenant consistente, predecible y auditable**, sin reescribir toda la app.

Este documento asume que **parte de los cambios ya fueron hechos**. Por eso está planteado como una guía de continuación y verificación, no como teoría.

---

## Resultado esperado

Al terminar este refactor:

- cada request resuelve **un único tenant activo**
- el backend usa siempre esa misma fuente de verdad
- ningún recurso puede leerse, modificarse o borrarse fuera del tenant activo
- el frontend puede cambiar de motel sin comportamientos ambiguos
- los endpoints especiales dejan de “salirse” de la política general
- el código queda preparado para escalar sin bugs cruzados entre moteles

---

## Regla de arquitectura

### Fuente única de tenant

La app debe operar con esta regla:

- el usuario autenticado tiene acceso a **uno o varios moteles**
- el request resuelve un **motel activo**
- ese motel activo debe quedar disponible en `req.tenant.motelId`
- desde ese punto, **todo el backend** debe usar `req.tenant.motelId`

### Nunca más usar como fuente de verdad

- `body.motelId`
- `query.motelId` sin validación central
- `params.motelId`
- `req.user.motelId` como tenant operativo definitivo
- `req.user.moteles[0]` como fallback silencioso

---

## Decisión de diseño recomendada

### Mantener en el JWT

- `sub`
- `rol`
- `propietarioId`
- `moteles: string[]`

### No depender de esto como tenant activo

- `motelId` fijo dentro del token

Se puede seguir incluyendo temporalmente por compatibilidad, pero no debe ser la fuente principal una vez que el guard de tenant ya esté operativo.

---

## Orden sugerido de implementación

1. Confirmar o terminar `TenantGuard` / `TenantContext`
2. Forzar `req.tenant.motelId` en controllers base
3. Corregir `BaseService` para scopear `getOne`, `update`, `delete`
4. Auditar endpoints especiales
5. Validar relaciones cruzadas por tenant
6. Limpiar frontend para que solo mande `x-motel-id`
7. Eliminar caminos legacy
8. Agregar tests de aislamiento

---

# Etapa 1 — Resolver tenant una sola vez

## Objetivo

Centralizar la resolución del tenant activo.

## Estado correcto

Cada request autenticado debe terminar con algo equivalente a:

```ts
request.tenant = {
  motelId: '...'
}
```

## Reglas que debe cumplir

- leer `x-motel-id` si viene informado
- si no viene, usar un fallback controlado solo si tu compatibilidad temporal lo requiere
- validar que el motel activo pertenezca a `user.moteles`
- si no pertenece, responder `403`
- no dejar que cada controller resuelva esto por su cuenta

## Checklist

- [ ] existe `TenantGuard`, `TenantInterceptor` o `TenantContext`
- [ ] corre después de autenticación
- [ ] valida pertenencia del motel activo
- [ ] inyecta `req.tenant.motelId`
- [ ] no deja `motelId` ambiguo o `undefined`

## Criterio de aceptación

Dado un usuario con acceso a motel A y motel B:

- si manda `x-motel-id: A`, la request opera sobre A
- si manda `x-motel-id: B`, la request opera sobre B
- si manda `x-motel-id: C`, responde `403`

---

# Etapa 2 — Limpiar BaseController

## Objetivo

Hacer que el controller base use solo el tenant resuelto por request.

## Buscar y eliminar

Patrones como estos:

```ts
req.user?.motelId
req.user?.moteles?.[0]
const motelId = ...fallback...
```

## Reemplazo esperado

```ts
const motelId = req.tenant.motelId;
```

## Lugares que deben quedar alineados

- `create`
- `getList`
- `getOne`
- `update`
- `delete`

## Regla

El controller no decide tenancy.
Solo la consume.

## Checklist

- [ ] ningún método base usa `req.user.motelId`
- [ ] ningún método base usa `req.user.moteles[0]`
- [ ] todos los métodos leen `req.tenant.motelId`
- [ ] el scope se pasa al service

## Criterio de aceptación

Cambiar el motel activo desde frontend debe cambiar el comportamiento del backend sin relogin, siempre que el usuario tenga acceso.

---

# Etapa 3 — Corregir BaseService

## Objetivo

Cerrar la fuga más grave: operaciones por `id` sin scope de tenant.

## Error típico a eliminar

```ts
where: { id }
```

Eso está mal para:

- `obtenerUno`
- `actualizar`
- `eliminar`

## Estado correcto

Toda operación sobre un recurso tenant-aware debe incluir scope de tenant.

Ejemplo conceptual:

```ts
where: {
  id,
  motelId,
}
```

## Si el modelo no tiene `motelId` directo

Scopear por relación.

Ejemplos conceptuales:

```ts
where: {
  id,
  habitacion: {
    motelId,
  },
}
```

## Recomendación práctica

Si usás Prisma:

- `findFirst` o `findMany` con scope de tenant para lectura
- `updateMany` / `deleteMany` cuando quieras evitar que una operación “encuentre por id global”
- si necesitás `update`, primero validar pertenencia con `findFirst`

## Checklist

- [ ] `getOne` filtra por tenant
- [ ] `update` filtra por tenant o valida antes
- [ ] `delete` filtra por tenant o valida antes
- [ ] no existe ningún path de mutación por `id` desnudo

## Criterio de aceptación

Si dos moteles tienen recursos distintos, un usuario del motel A no puede leer ni afectar un recurso del motel B aunque conozca el `id`.

---

# Etapa 4 — Auditar endpoints especiales

## Objetivo

Encontrar endpoints que no pasan por el flujo base o que resuelven tenant “a mano”.

## Qué buscar

- controllers con lógica custom
- endpoints de reportes
- endpoints de auditoría
- endpoints de sincronización
- endpoints de caja, pagos, turnos, stock, insumos
- rutas con `@Get('buscar')`, `@Post('sync...')`, `@Get('discrepancias')`, etc.

## Banderas rojas

- uso de `@Query('motelId')`
- uso de `req.headers['x-motel-id']` dentro del controller
- uso de `body.motelId`
- falta de `JwtAuthGuard`
- lógica especial que saltea el service base

## Regla

El controller especial puede tener lógica especial, pero **no política de tenant especial**.

## Estado correcto

Incluso en endpoints custom:

```ts
const motelId = req.tenant.motelId;
```

Y de ahí en más, todo opera con ese tenant.

## Checklist por archivo

### productos.controller.ts
- [ ] no acepta `motelId` por body para acciones operativas
- [ ] no resuelve tenant por header manual
- [ ] usa `req.tenant.motelId`

### pagos.controller.ts
- [ ] tiene auth
- [ ] no acepta `motelId` por query libre
- [ ] lista y reporta dentro del tenant activo

### insumos.controller.ts
- [ ] tiene auth
- [ ] detalles y búsquedas usan tenant resuelto

### clientes.controller.ts
- [ ] búsquedas respetan tenant
- [ ] endpoints auxiliares no quedan públicos por error

### turnos.controller.ts
- [ ] abrir/cerrar turno tiene auth
- [ ] usa tenant activo
- [ ] no permite referencias cruzadas

## Criterio de aceptación

No debe existir ningún endpoint tenant-aware que opere con otra fuente de tenant distinta a `req.tenant.motelId`.

---

# Etapa 5 — Validar relaciones cruzadas

## Objetivo

Evitar inconsistencias de negocio entre entidades de distintos moteles.

## Problema

Aunque cada tabla tenga `motelId`, todavía podés romper la integridad si asociás entidades de tenants distintos.

## Casos típicos

- abrir turno con `habitacionId` de otro motel
- cobrar con `clienteId` de otro motel
- registrar consumo con `productoId` de otro motel
- mover stock con `depositoId` de otro motel
- cerrar turno con usuario o caja de otro motel

## Regla

Antes de crear o actualizar relaciones, validar que **todas las referencias pertenecen al tenant activo**.

## Patrón recomendado

Antes de persistir:

1. leer cada relación crítica con scope por `motelId`
2. si alguna no existe bajo ese tenant, cortar con `400` o `403`

## Entidades a revisar sí o sí

- Habitación
- Turno
- Cliente
- Producto
- Depósito
- Insumo
- Caja
- Pago
- Tarifa
- Usuario
- Consumo
- Compra
- MovimientoStock

## Checklist

- [ ] abrir turno valida habitación
- [ ] abrir turno valida cliente si aplica
- [ ] consumo valida producto
- [ ] pago valida turno/caja/cliente
- [ ] stock valida depósito y producto
- [ ] compras validan proveedor y depósito dentro del tenant

## Criterio de aceptación

No se puede crear ninguna transacción que mezcle entidades de dos moteles distintos.

---

# Etapa 6 — Frontend alineado

## Objetivo

Que el frontend deje de tener comportamientos contradictorios con el backend.

## Estado correcto

- el motel activo se guarda en estado local o `localStorage`
- el cliente HTTP manda `x-motel-id`
- el backend valida ese tenant contra `user.moteles`
- el frontend no intenta “forzar” tenancy por query o payload

## Buscar y limpiar

- `motelId` en payloads de formularios
- filtros ocultos que agregan `motelId` por body
- helpers que mezclan JWT fijo con motel seleccionado
- comentarios desactualizados que dicen “el motel viene del token” si ya no es así

## Checklist

- [ ] `HttpClient` manda `x-motel-id`
- [ ] no se manda `motelId` en body salvo casos administrativos muy controlados
- [ ] cambio de motel refresca correctamente vistas y caches
- [ ] React Query / DataProvider no reusa datos de otro motel

## Criterio de aceptación

Cambiar de motel en frontend cambia lista, detalle, reportes y operaciones sin inconsistencias ni datos cruzados.

---

# Etapa 7 — Compatibilidad temporal y limpieza legacy

## Objetivo

Permitir una migración ordenada sin dejar deuda permanente.

## Si ya hiciste parte del cambio

Probablemente hoy convivís con:

- código nuevo que usa `req.tenant.motelId`
- código viejo que usa `req.user.motelId`
- endpoints especiales que leen header manual

Eso solo debe existir de forma transitoria.

## Estrategia

### Paso 1
Marcar los usos legacy con comentario claro.

Ejemplo:

```ts
// TODO multi-tenant: migrar a req.tenant.motelId
```

### Paso 2
Buscar globalmente:

- `user.motelId`
- `moteles[0]`
- `@Query('motelId')`
- `body.motelId`
- `x-motel-id`

### Paso 3
Reemplazar hasta que queden solo casos deliberados.

## Criterio de aceptación

La base queda con un solo mecanismo activo de resolución de tenant.

---

# Etapa 8 — Tests mínimos que sí valen la pena

## Objetivo

Evitar que el problema vuelva a aparecer en futuros cambios.

## Tests de integración recomendados

### 1. Listado aislado

- usuario con acceso a motel A y B
- crear datos en ambos
- pedir lista con header A
- verificar que solo devuelve A
- repetir con B

### 2. Detalle aislado

- pedir detalle de un recurso de B usando header A
- debe devolver 404 o 403

### 3. Update aislado

- intentar editar recurso de B con tenant A
- debe fallar

### 4. Delete aislado

- intentar borrar recurso de B con tenant A
- debe fallar

### 5. Validación de pertenencia del tenant

- usuario con acceso a A y B
- request con tenant C
- debe devolver 403

### 6. Relaciones cruzadas

- abrir turno con habitación de otro motel
- debe fallar

## Checklist

- [ ] hay tests para list
- [ ] hay tests para detail
- [ ] hay tests para update/delete
- [ ] hay tests para relaciones cruzadas
- [ ] hay tests para endpoints especiales

---

# Estrategia de búsqueda dentro del repo

Usá búsquedas globales en el IDE con estos términos:

## Prioridad alta

```txt
user.motelId
moteles[0]
@Query('motelId')
body.motelId
headers['x-motel-id']
headers["x-motel-id"]
where: { id }
update({ where: { id }
delete({ where: { id }
findUnique({ where: { id }
```

## Prioridad media

```txt
sync-catalogo
auditoria-stock
discrepancias
abrir
cerrar
buscar
detalles
```

## Prioridad baja pero útil

```txt
TODO multi-tenant
tenant
motelId:
propietarioId:
```

---

# Criterios de diseño por tipo de entidad

## Entidades operativas del motel

Estas casi siempre deberían quedar scopeadas por `motelId`:

- habitación
- turno
- cliente
- producto editable
- depósito
- insumo
- caja
- consumo
- pago
- tarifa
- compra
- movimiento de stock
- mantenimiento

## Entidades de cuenta / plataforma

Estas pueden vivir a otro nivel:

- propietario
- suscripción
- plan
- permisos globales
- auditoría de plataforma

## Regla práctica

Si la entidad representa operación diaria del motel, debe quedar encerrada por `motelId`.

---

# Errores frecuentes que no conviene repetir

## 1. Confiar en el frontend

El frontend puede mandar `x-motel-id`, pero el backend debe validar siempre que el usuario tenga acceso.

## 2. Usar `req.user.motelId` como verdad eterna

Eso mata el cambio dinámico de motel y genera comportamiento congelado.

## 3. Scopear solo los listados

No alcanza con filtrar `getList`. El agujero más grave suele estar en `getOne`, `update` y `delete`.

## 4. Validar el tenant pero no las relaciones

Esto deja inconsistencias silenciosas en turnos, pagos y stock.

## 5. Dejar endpoints “especiales” fuera de la política general

Son los que más bugs raros generan.

---

# Plan corto de ejecución en IDE

## Bloque 1 — Seguridad estructural

- [ ] terminar `TenantGuard`
- [ ] garantizar `req.tenant.motelId`
- [ ] poner auth donde falte
- [ ] eliminar resolución local de tenant en controllers

## Bloque 2 — Aislamiento real

- [ ] corregir `BaseController`
- [ ] corregir `BaseService`
- [ ] revisar `getOne`, `update`, `delete`

## Bloque 3 — Endpoints custom

- [ ] revisar productos
- [ ] revisar pagos
- [ ] revisar insumos
- [ ] revisar clientes
- [ ] revisar turnos

## Bloque 4 — Integridad de negocio

- [ ] validar relaciones cruzadas
- [ ] revisar caja, pagos, stock y turnos

## Bloque 5 — Limpieza final

- [ ] eliminar `body.motelId` innecesarios
- [ ] eliminar `query.motelId` innecesarios
- [ ] limpiar comentarios legacy
- [ ] agregar tests mínimos

---

# Definición de terminado

Podés considerar el feature multi-tenant “estable” cuando se cumpla esto:

- no existe ninguna mutación por `id` sin tenant scope
- todos los requests autenticados resuelven `req.tenant.motelId`
- ningún controller decide tenancy por su cuenta
- ningún endpoint operativo acepta `motelId` libre por body/query
- todas las relaciones críticas se validan contra el tenant activo
- el frontend cambia de motel sin relogin y sin datos cruzados
- hay tests que demuestran aislamiento entre moteles

---

# Nota final de implementación

Si querés avanzar sin romper demasiado:

1. primero hacé convivir compatibilidad temporal
2. después migrá archivo por archivo
3. recién al final eliminá `req.user.motelId` como fallback

La clave es esta:

> el tenant debe resolverse una vez por request y respetarse en todo el flujo.

Si esa regla queda sólida, el resto de los bugs multi-tenant baja muchísimo.
