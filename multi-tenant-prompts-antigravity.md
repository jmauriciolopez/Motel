# Multi-Tenant Prompts (Antigravity)

## Contexto de Roles

- superadmin: acceso total (sin restricción de tenant)
- administrador: múltiples moteles, puede cambiar tenant
- supervisor: un solo motel
- recepcionista: un solo motel

---

## Prompt 1 — Crear TenantGuard robusto

Implementar TenantGuard en NestJS que:
- lea x-motel-id
- si no existe, use default del usuario
- valide acceso según rol:
  - superadmin: acceso total
  - administrador: solo moteles en user.moteles
  - supervisor/recepcionista: solo su motel asignado

---

## Prompt 2 — Inyectar tenant en request

Agregar request.tenant = { motelId }

---

## Prompt 3 — Refactor BaseController

Reemplazar toda referencia a:
req.user.motelId

Por:
req.tenant.motelId

---

## Prompt 4 — Refactor BaseService

Forzar scope en:
- getOne
- update
- delete

Siempre incluir motelId

---

## Prompt 5 — Bloquear motelId en DTOs

Eliminar motelId de:
- body
- query

---

## Prompt 6 — Validación por rol

Implementar lógica:

if (user.rol === 'superadmin') => bypass tenant
if (user.rol === 'administrador') => validar inclusión
if (user.rol === 'supervisor' || 'recepcionista') => igualdad exacta

---

## Prompt 7 — Validación de relaciones

Antes de crear:
- validar habitacion.motelId === tenant
- validar cliente.motelId === tenant

---

## Prompt 8 — Frontend sync

Asegurar que:
- siempre envía x-motel-id
- cambia tenant desde UI

---

## Prompt 9 — Auditoría final

Buscar:
- where: { id }
- endpoints sin guard

---

## Prompt 10 — Test

Crear casos:
- cambio de motel
- acceso cruzado bloqueado
