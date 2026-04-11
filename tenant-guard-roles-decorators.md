# tenant-guard-roles-decorators.md

## 🎯 Objetivo
Implementar un sistema robusto de:
- Multi-tenant por motel
- Control de acceso por roles
- Decorators reutilizables
- Guards centralizados

---

## 🧠 Modelo de Roles

- superadmin → acceso global + por motel
- administrador → múltiples moteles (puede cambiar)
- supervisor → un solo motel
- recepcionista → un solo motel

---

## 🧩 Arquitectura

JWT → TenantGuard → RolesGuard → Controller → Service

---

## 📁 Estructura sugerida

src/
  compartido/
    guards/
      tenant.guard.ts
      roles.guard.ts
    decorators/
      tenant.decorator.ts
      roles.decorator.ts
      current-user.decorator.ts
    interfaces/
      tenant-context.interface.ts

---

## 🔐 Paso 1 — Interfaces

Crear tenant-context.interface.ts

- JwtUser
- TenantContext
- RolSistema

---

## 🧱 Paso 2 — Decorators

### @Roles()
Define qué roles pueden acceder

### @Tenant()
Inyecta tenant resuelto

### @CurrentUser()
Inyecta usuario autenticado

---

## 🛡 Paso 3 — TenantGuard

Responsabilidades:
- leer usuario
- resolver motelId
- validar acceso por rol
- setear request.tenant

Reglas clave:
- superadmin → global o motel
- administrador → solo moteles permitidos
- supervisor/recepcionista → motel fijo

---

## 🛡 Paso 4 — RolesGuard

Valida acceso según decorator @Roles()

---

## 🧩 Paso 5 — Uso en Controllers

Ejemplo:

@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)

@Roles('administrador')
@Get()
findAll(@Tenant() tenant) {
  return service.listar(tenant.motelId)
}

---

## 🧠 Paso 6 — BaseService

Regla crítica:

❌ where: { id }
✅ where: { id, motelId }

Implementar helper:

buildTenantWhere(tenant, extraWhere)

---

## 🔗 Paso 7 — Validación de relaciones

Siempre validar:

- habitacion.motelId === tenant.motelId
- cliente.motelId === tenant.motelId

---

## 🚫 Anti-patterns

- usar motelId desde body
- usar motelId desde query sin validar
- confiar en frontend
- update/delete por id sin tenant

---

## 🧪 Paso 8 — Tests

Casos:

- cambio de motel administrador
- bloqueo cross-tenant
- supervisor no cambia motel
- superadmin global vs motel

---

## 🚀 Orden de implementación

1. Interfaces
2. Decorators
3. TenantGuard
4. RolesGuard
5. Controllers críticos
6. BaseService
7. Validaciones
8. Tests

---

## 💡 Resultado esperado

- aislamiento total entre moteles
- roles consistentes
- backend independiente del frontend
- base sólida para SaaS

