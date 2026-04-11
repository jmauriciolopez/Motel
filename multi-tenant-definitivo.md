# multi-tenant-definitivo.md

## Objetivo

Implementar un sistema **multi-tenant por motel** con:

- **roles centralizados**
- **tenant resuelto por request**
- **guards reutilizables**
- **decorators limpios**
- **services seguros**
- **aislamiento real entre moteles**
- **compatibilidad con tus 4 roles**

Este documento está pensado para seguirlo **directamente desde el IDE** y usarlo también con un agente tipo Antigravity.

---

# 1) Modelo operativo final

## Roles del sistema

### `superadmin`
Dueño del SaaS.

Puede:
- gestionar todos los moteles
- gestionar todos los usuarios
- gestionar todos los propietarios
- ver operaciones globales
- operar en modo global o en modo motel

### `administrador`
Es un propietario.

Puede:
- tener más de un motel
- gestionar todo lo operativo de sus moteles
- cambiar de motel activo
- no puede gestionar la entidad `propietario` como recurso global del SaaS

### `supervisor`
Trabaja en un solo motel.

Puede:
- operar solo en su motel asignado
- no puede cambiar de motel

### `recepcionista`
Trabaja en un solo motel.

Puede:
- operar solo en su motel asignado
- no puede cambiar de motel

---

# 2) Regla central del multi-tenant

## Fuente única de tenant

El tenant activo **no debe quedar congelado en el login**.

La política correcta es:

- el usuario se autentica
- el backend conoce sus moteles permitidos
- en cada request se resuelve el **motel activo**
- ese motel se valida contra su rol y permisos
- luego se inyecta en `request.tenant`

## Conclusión práctica

### Sí usar
- `x-motel-id` para indicar motel activo
- `request.tenant.motelId` dentro del backend

### No usar más
- `req.body.motelId` como fuente de verdad
- `req.query.motelId` sin validación central
- `req.user.motelId` como tenant fijo universal
- `where: { id }` sin scope de tenant

---

# 3) Arquitectura final

```txt
JWT
  ↓
JwtAuthGuard
  ↓
TenantGuard
  ↓
RolesGuard
  ↓
Controller
  ↓
Service
  ↓
Prisma
```

---

# 4) Estructura sugerida

```txt
src/
  compartido/
    decorators/
      current-user.decorator.ts
      roles.decorator.ts
      tenant.decorator.ts
      allow-global.decorator.ts
    guards/
      tenant.guard.ts
      roles.guard.ts
    interfaces/
      tenant-context.interface.ts
    bases/
      base-tenant.service.ts
```

---

# 5) Tipos compartidos

## Archivo
`src/compartido/interfaces/tenant-context.interface.ts`

```ts
export type RolSistema =
  | 'superadmin'
  | 'administrador'
  | 'supervisor'
  | 'recepcionista';

export interface JwtUser {
  sub: string;
  email: string;
  rol: RolSistema;
  propietarioId?: string | null;
  motelId?: string | null;
  moteles?: string[];
}

export interface TenantContext {
  motelId: string | null;
  scope: 'global' | 'motel';
  rol: RolSistema;
  userId: string;
  propietarioId?: string | null;
}
```

---

# 6) JWT recomendado

## Payload recomendado

```ts
{
  sub: usuario.id,
  email: usuario.email,
  rol: usuario.rol,
  propietarioId: usuario.propietarioId ?? null,
  motelId: usuario.motelId ?? null,
  moteles: motelIdsPermitidos
}
```

## Regla por rol

### superadmin
- puede venir sin `motelId`
- puede operar global
- puede enviar `x-motel-id` para operar en un motel puntual

### administrador
- debe tener `moteles: [...]`
- puede tener `motelId` default si querés
- cambia de motel usando `x-motel-id`

### supervisor / recepcionista
- deben tener `motelId`
- opcionalmente `moteles: [motelId]`
- no pueden cambiar de motel

---

# 7) Decorators

## 7.1 Roles decorator

### Archivo
`src/compartido/decorators/roles.decorator.ts`

```ts
import { SetMetadata } from '@nestjs/common';
import { RolSistema } from '../interfaces/tenant-context.interface';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: RolSistema[]) => SetMetadata(ROLES_KEY, roles);
```

---

## 7.2 Tenant decorator

### Archivo
`src/compartido/decorators/tenant.decorator.ts`

```ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantContext } from '../interfaces/tenant-context.interface';

export const Tenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenant;
  },
);
```

---

## 7.3 CurrentUser decorator

### Archivo
`src/compartido/decorators/current-user.decorator.ts`

```ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtUser } from '../interfaces/tenant-context.interface';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

---

## 7.4 AllowGlobal decorator

Sirve para endpoints donde `superadmin` puede entrar sin elegir motel.

### Archivo
`src/compartido/decorators/allow-global.decorator.ts`

```ts
import { SetMetadata } from '@nestjs/common';

export const ALLOW_GLOBAL_KEY = 'allow_global';
export const AllowGlobal = () => SetMetadata(ALLOW_GLOBAL_KEY, true);
```

---

# 8) RolesGuard

## Objetivo
Validar qué roles pueden entrar a cada endpoint.

### Archivo
`src/compartido/guards/roles.guard.ts`

```ts
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtUser, RolSistema } from '../interfaces/tenant-context.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RolSistema[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtUser | undefined;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    if (!requiredRoles.includes(user.rol)) {
      throw new ForbiddenException('No tienes permisos para esta acción');
    }

    return true;
  }
}
```

---

# 9) TenantGuard

## Objetivo
Resolver y validar el tenant activo según:

- rol del usuario
- `x-motel-id`
- motel asignado
- moteles permitidos
- modo global para superadmin

### Archivo
`src/compartido/guards/tenant.guard.ts`

```ts
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ALLOW_GLOBAL_KEY } from '../decorators/allow-global.decorator';
import {
  JwtUser,
  TenantContext,
} from '../interfaces/tenant-context.interface';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtUser | undefined;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    const allowGlobal = this.reflector.getAllAndOverride<boolean>(
      ALLOW_GLOBAL_KEY,
      [context.getHandler(), context.getClass()],
    );

    const headerTenant = this.normalizeTenantId(request.headers['x-motel-id']);
    const queryTenant = this.normalizeTenantId(request.query?.motelId);
    const requestedMotelId = headerTenant || queryTenant || null;

    const tenant = this.resolveTenant(user, requestedMotelId, !!allowGlobal);

    request.tenant = tenant;
    return true;
  }

  private resolveTenant(
    user: JwtUser,
    requestedMotelId: string | null,
    allowGlobal: boolean,
  ): TenantContext {
    if (user.rol === 'superadmin') {
      if (!requestedMotelId && allowGlobal) {
        return {
          motelId: null,
          scope: 'global',
          rol: user.rol,
          userId: user.sub,
          propietarioId: user.propietarioId ?? null,
        };
      }

      if (!requestedMotelId && !allowGlobal) {
        throw new ForbiddenException(
          'Debe indicar x-motel-id para operar en este endpoint',
        );
      }

      return {
        motelId: requestedMotelId,
        scope: 'motel',
        rol: user.rol,
        userId: user.sub,
        propietarioId: user.propietarioId ?? null,
      };
    }

    if (user.rol === 'administrador') {
      const allowedMotels = user.moteles ?? [];
      const motelId = requestedMotelId || user.motelId || allowedMotels[0] || null;

      if (!motelId) {
        throw new ForbiddenException('No hay motel activo para este administrador');
      }

      if (!allowedMotels.includes(motelId)) {
        throw new ForbiddenException('No tienes acceso a este motel');
      }

      return {
        motelId,
        scope: 'motel',
        rol: user.rol,
        userId: user.sub,
        propietarioId: user.propietarioId ?? null,
      };
    }

    if (user.rol === 'supervisor' || user.rol === 'recepcionista') {
      const assignedMotelId = user.motelId || user.moteles?.[0] || null;

      if (!assignedMotelId) {
        throw new ForbiddenException('Usuario sin motel asignado');
      }

      if (requestedMotelId && requestedMotelId !== assignedMotelId) {
        throw new ForbiddenException('No puedes cambiar de motel');
      }

      return {
        motelId: assignedMotelId,
        scope: 'motel',
        rol: user.rol,
        userId: user.sub,
        propietarioId: user.propietarioId ?? null,
      };
    }

    throw new ForbiddenException('Rol no válido');
  }

  private normalizeTenantId(value: unknown): string | null {
    if (Array.isArray(value)) {
      return value[0] ? String(value[0]) : null;
    }

    if (value === undefined || value === null || value === '') {
      return null;
    }

    return String(value);
  }
}
```

---

# 10) Uso en controllers

## Patrón recomendado

```ts
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('habitaciones')
export class HabitacionesController {}
```

## Ejemplo simple

```ts
import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../autenticacion/jwt-auth.guard';
import { TenantGuard } from '../compartido/guards/tenant.guard';
import { RolesGuard } from '../compartido/guards/roles.guard';
import { Roles } from '../compartido/decorators/roles.decorator';
import { Tenant } from '../compartido/decorators/tenant.decorator';
import { TenantContext } from '../compartido/interfaces/tenant-context.interface';
import { HabitacionesService } from './habitaciones.service';

@Controller('habitaciones')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class HabitacionesController {
  constructor(private readonly service: HabitacionesService) {}

  @Get()
  @Roles('superadmin', 'administrador', 'supervisor', 'recepcionista')
  listar(@Tenant() tenant: TenantContext) {
    return this.service.listar(tenant);
  }

  @Get(':id')
  @Roles('superadmin', 'administrador', 'supervisor', 'recepcionista')
  obtenerUno(@Param('id') id: string, @Tenant() tenant: TenantContext) {
    return this.service.obtenerUno(id, tenant);
  }

  @Post()
  @Roles('superadmin', 'administrador', 'supervisor')
  crear(@Body() dto: any, @Tenant() tenant: TenantContext) {
    return this.service.crear(dto, tenant);
  }

  @Patch(':id')
  @Roles('superadmin', 'administrador', 'supervisor')
  actualizar(@Param('id') id: string, @Body() dto: any, @Tenant() tenant: TenantContext) {
    return this.service.actualizar(id, dto, tenant);
  }
}
```

---

# 11) BaseTenantService

## Objetivo
Centralizar la lógica de filtrado por tenant.

### Archivo
`src/compartido/bases/base-tenant.service.ts`

```ts
import { NotFoundException } from '@nestjs/common';
import { TenantContext } from '../interfaces/tenant-context.interface';

export abstract class BaseTenantService {
  protected buildTenantWhere(
    tenant: TenantContext,
    extraWhere: Record<string, unknown> = {},
  ) {
    if (tenant.rol === 'superadmin' && tenant.scope === 'global') {
      return { ...extraWhere };
    }

    return {
      ...extraWhere,
      motelId: tenant.motelId,
    };
  }

  protected ensureTenantRecord<T>(record: T | null | undefined, message = 'Registro no encontrado'): T {
    if (!record) {
      throw new NotFoundException(message);
    }

    return record;
  }
}
```

---

# 12) Service seguro por tenant

## Ejemplo real

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../compartido/interfaces/tenant-context.interface';
import { BaseTenantService } from '../compartido/bases/base-tenant.service';

@Injectable()
export class HabitacionesService extends BaseTenantService {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async listar(tenant: TenantContext) {
    return this.prisma.habitacion.findMany({
      where: this.buildTenantWhere(tenant),
      orderBy: { createdAt: 'desc' },
    });
  }

  async obtenerUno(id: string, tenant: TenantContext) {
    const record = await this.prisma.habitacion.findFirst({
      where: this.buildTenantWhere(tenant, { id }),
    });

    return this.ensureTenantRecord(record);
  }

  async crear(dto: any, tenant: TenantContext) {
    return this.prisma.habitacion.create({
      data: {
        ...dto,
        motelId: tenant.motelId!,
      },
    });
  }

  async actualizar(id: string, dto: any, tenant: TenantContext) {
    const record = await this.prisma.habitacion.findFirst({
      where: this.buildTenantWhere(tenant, { id }),
    });

    this.ensureTenantRecord(record);

    return this.prisma.habitacion.update({
      where: { id: record.id },
      data: dto,
    });
  }

  async eliminar(id: string, tenant: TenantContext) {
    const record = await this.prisma.habitacion.findFirst({
      where: this.buildTenantWhere(tenant, { id }),
    });

    this.ensureTenantRecord(record);

    return this.prisma.habitacion.delete({
      where: { id: record.id },
    });
  }
}
```

---

# 13) Regla crítica: nunca usar `where: { id }` solo

## Incorrecto
```ts
return this.prisma.turno.update({
  where: { id },
  data,
});
```

## Correcto
```ts
const record = await this.prisma.turno.findFirst({
  where: this.buildTenantWhere(tenant, { id }),
});

this.ensureTenantRecord(record);

return this.prisma.turno.update({
  where: { id: record.id },
  data,
});
```

---

# 14) Validación de relaciones cruzadas

Aunque uses `TenantGuard`, seguís necesitando validar que las referencias pertenezcan al motel activo.

## Caso: abrir turno

### Correcto
```ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../compartido/interfaces/tenant-context.interface';
import { BaseTenantService } from '../compartido/bases/base-tenant.service';

@Injectable()
export class TurnosService extends BaseTenantService {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async abrir(dto: any, tenant: TenantContext) {
    const habitacion = await this.prisma.habitacion.findFirst({
      where: {
        id: dto.habitacionId,
        motelId: tenant.motelId,
      },
    });

    if (!habitacion) {
      throw new BadRequestException('La habitación no pertenece al motel activo');
    }

    if (dto.clienteId) {
      const cliente = await this.prisma.cliente.findFirst({
        where: {
          id: dto.clienteId,
          motelId: tenant.motelId,
        },
      });

      if (!cliente) {
        throw new BadRequestException('El cliente no pertenece al motel activo');
      }
    }

    if (dto.tarifaId) {
      const tarifa = await this.prisma.tarifa.findFirst({
        where: {
          id: dto.tarifaId,
          motelId: tenant.motelId,
        },
      });

      if (!tarifa) {
        throw new BadRequestException('La tarifa no pertenece al motel activo');
      }
    }

    return this.prisma.turno.create({
      data: {
        ...dto,
        motelId: tenant.motelId!,
      },
    });
  }
}
```

## Validar siempre
- `habitacionId`
- `clienteId`
- `tarifaId`
- `productoId`
- `depositoId`
- `proveedorId`
- cualquier FK operativa

---

# 15) Endpoints globales de superadmin

Algunos endpoints no necesitan `motelId`, por ejemplo:

- resumen global del SaaS
- listado de propietarios
- listado global de moteles
- métricas cross-tenant

## Ejemplo
```ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../autenticacion/jwt-auth.guard';
import { TenantGuard } from '../compartido/guards/tenant.guard';
import { RolesGuard } from '../compartido/guards/roles.guard';
import { Roles } from '../compartido/decorators/roles.decorator';
import { AllowGlobal } from '../compartido/decorators/allow-global.decorator';
import { Tenant } from '../compartido/decorators/tenant.decorator';
import { TenantContext } from '../compartido/interfaces/tenant-context.interface';

@Controller('admin-saas')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class AdminSaasController {
  @Get('resumen-global')
  @Roles('superadmin')
  @AllowGlobal()
  resumenGlobal(@Tenant() tenant: TenantContext) {
    return this.service.resumenGlobal(tenant);
  }
}
```

---

# 16) Frontend

## Regla
El frontend puede elegir motel activo, pero el backend siempre valida.

## Axios / HttpClient
```ts
const motelId = localStorage.getItem('motelIdActivo');

if (motelId) {
  config.headers['x-motel-id'] = motelId;
}
```

## Política por rol

### administrador
- puede cambiar motel
- UI con selector de motel
- cada request manda `x-motel-id`

### supervisor / recepcionista
- no mostrar selector de motel
- se puede mandar el header igual, pero el backend igual valida

### superadmin
- puede tener selector
- además puede tener vistas globales donde no mande `x-motel-id`

---

# 17) Qué eliminar del código actual

## Eliminar o dejar de usar
- `req.user?.motelId || req.user?.moteles[0]` en controllers
- `motelId` desde `body`
- `motelId` desde `query` en lógica de negocio
- endpoints sin `JwtAuthGuard`
- endpoints sin `TenantGuard`
- updates/deletes/finds por `id` sin tenant scope

---

# 18) Qué hacer con tus BaseController / BaseService actuales

## Si ya tenés un BaseController
Refactorizalo para que **siempre** use `@Tenant()` o `req.tenant`.

### Ejemplo
```ts
const motelId = req.tenant.motelId;
```

## Si ya tenés un BaseService genérico
No intentes confiar en que todos los modelos funcionen igual si algunos no llevan `motelId`.

### Recomendación realista
- usar base tenant service para modelos tenant-aware
- los modelos globales del SaaS tratarlos aparte

---

# 19) Modelos tenant-aware vs globales

## Modelos globales
No filtran por `motelId`.

Ejemplos posibles:
- propietario
- planes del SaaS
- catálogos globales del sistema
- configuración global

## Modelos tenant-aware
Sí filtran por `motelId`.

Ejemplos:
- habitaciones
- turnos
- clientes
- pagos
- consumos
- productos del motel
- stock
- insumos
- depósitos
- caja

## Regla
No mezclar en el mismo service comportamiento global y tenant si no es necesario.

---

# 20) Matriz de permisos sugerida

## superadmin
Puede:
- todo
- global y por motel

## administrador
Puede:
- CRUD operativo en sus moteles
- ver dashboards de sus moteles
- cambiar motel activo
- gestionar usuarios de sus moteles, según tu diseño
- no gestionar `propietario` global

## supervisor
Puede:
- operación diaria del motel asignado
- habitaciones
- turnos
- pagos
- clientes
- stock si corresponde

## recepcionista
Puede:
- operación de recepción del motel asignado
- apertura/cierre de turnos si tu negocio lo permite
- clientes
- cobros
- no administrar configuraciones sensibles

---

# 21) Ejemplo de controller crítico: turnos

```ts
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../autenticacion/jwt-auth.guard';
import { TenantGuard } from '../compartido/guards/tenant.guard';
import { RolesGuard } from '../compartido/guards/roles.guard';
import { Roles } from '../compartido/decorators/roles.decorator';
import { Tenant } from '../compartido/decorators/tenant.decorator';
import { TenantContext } from '../compartido/interfaces/tenant-context.interface';
import { TurnosService } from './turnos.service';

@Controller('turnos')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class TurnosController {
  constructor(private readonly service: TurnosService) {}

  @Get()
  @Roles('superadmin', 'administrador', 'supervisor', 'recepcionista')
  listar(@Tenant() tenant: TenantContext) {
    return this.service.listar(tenant);
  }

  @Post('abrir')
  @Roles('superadmin', 'administrador', 'supervisor', 'recepcionista')
  abrir(@Body() dto: any, @Tenant() tenant: TenantContext) {
    return this.service.abrir(dto, tenant);
  }

  @Patch(':id/cerrar')
  @Roles('superadmin', 'administrador', 'supervisor', 'recepcionista')
  cerrar(@Param('id') id: string, @Tenant() tenant: TenantContext) {
    return this.service.cerrar(id, tenant);
  }
}
```

---

# 22) Orden exacto de implementación en tu repo

## Etapa 1 — Infraestructura base
Crear estos archivos:
- `tenant-context.interface.ts`
- `roles.decorator.ts`
- `tenant.decorator.ts`
- `current-user.decorator.ts`
- `allow-global.decorator.ts`
- `roles.guard.ts`
- `tenant.guard.ts`

## Etapa 2 — Primer módulo piloto
Aplicar primero en:
- `turnos`
- o `pagos`

## Etapa 3 — Arreglar services
- crear `BaseTenantService`
- refactor `getOne`
- refactor `update`
- refactor `delete`

## Etapa 4 — Relaciones cruzadas
Validar `habitacionId`, `clienteId`, `tarifaId`, etc.

## Etapa 5 — Expandir
Llevarlo a:
- habitaciones
- clientes
- pagos
- productos
- insumos
- caja
- depósitos

## Etapa 6 — Limpieza
- eliminar `motelId` de DTOs operativos
- eliminar lógica vieja
- revisar headers/query/body
- revisar endpoints especiales

---

# 23) Checklist de auditoría

## Seguridad
- [ ] ningún endpoint operativo quedó sin `JwtAuthGuard`
- [ ] ningún endpoint operativo quedó sin `TenantGuard`
- [ ] los roles están definidos con `@Roles()`

## Tenant
- [ ] ningún controller usa `req.user.motelId` como tenant principal
- [ ] ningún endpoint usa `body.motelId`
- [ ] ningún endpoint usa `query.motelId` salteando el guard
- [ ] todo se resuelve desde `request.tenant`

## Prisma
- [ ] no existe `where: { id }` solo en modelos tenant-aware
- [ ] toda lectura por id valida tenant
- [ ] toda actualización por id valida tenant
- [ ] todo delete por id valida tenant

## Integridad
- [ ] se validan relaciones cruzadas
- [ ] no se pueden vincular registros de otro motel

## Frontend
- [ ] administrador manda `x-motel-id`
- [ ] supervisor no puede cambiar motel
- [ ] recepcionista no puede cambiar motel
- [ ] superadmin puede operar global o por motel

---

# 24) Casos de prueba mínimos

## superadmin
- [ ] entra a endpoint global sin `x-motel-id`
- [ ] entra a endpoint por motel con `x-motel-id`

## administrador
- [ ] puede operar en motel permitido A
- [ ] puede cambiar a motel permitido B
- [ ] falla si manda un motel no permitido

## supervisor
- [ ] opera en su motel asignado
- [ ] falla si intenta otro motel

## recepcionista
- [ ] opera en su motel asignado
- [ ] falla si intenta otro motel

## aislamiento
- [ ] no puede leer recurso de otro motel por id
- [ ] no puede actualizar recurso de otro motel por id
- [ ] no puede borrar recurso de otro motel por id
- [ ] no puede abrir turno con habitación de otro motel

---

# 25) Anti-patterns que explican bugs multi-tenant

## Nunca hacer esto
```ts
const motelId = req.body.motelId;
```

## Nunca hacer esto
```ts
const motelId = req.query.motelId;
```

## Nunca hacer esto
```ts
const motelId = req.user.motelId || req.user.moteles[0];
```

## Nunca hacer esto
```ts
return this.prisma.algo.update({
  where: { id },
  data,
});
```

## Nunca confiar en
- frontend
- DTOs
- query params sueltos
- ids sin tenant scope

---

# 26) Recomendación práctica para tu repo hoy

## Empezá así
1. crear guards y decorators
2. aplicar en `turnos`
3. aplicar en `pagos`
4. arreglar `BaseService`
5. expandir al resto

## No hagas esto
No intentes refactorizar todo el repo de una vez.

---

# 27) Prompt para Antigravity — Etapa 1

```txt
Implementa en NestJS la infraestructura multi-tenant base para un sistema SaaS de moteles.

Contexto:
- Hay 4 roles: superadmin, administrador, supervisor, recepcionista.
- superadmin puede operar globalmente o por motel.
- administrador puede operar sobre varios moteles permitidos y cambiar de motel activo.
- supervisor y recepcionista trabajan en un único motel y no pueden cambiar.

Objetivo:
Crear estos archivos:
- src/compartido/interfaces/tenant-context.interface.ts
- src/compartido/decorators/roles.decorator.ts
- src/compartido/decorators/tenant.decorator.ts
- src/compartido/decorators/current-user.decorator.ts
- src/compartido/decorators/allow-global.decorator.ts
- src/compartido/guards/roles.guard.ts
- src/compartido/guards/tenant.guard.ts

Requisitos:
- TenantGuard debe leer x-motel-id.
- Debe validar acceso según rol.
- Debe inyectar request.tenant = { motelId, scope, rol, userId, propietarioId }.
- RolesGuard debe validar el decorator @Roles().
- El código debe ser TypeScript listo para producción, claro y consistente.
```

---

# 28) Prompt para Antigravity — Etapa 2

```txt
Refactoriza el módulo de turnos para usar el nuevo sistema multi-tenant.

Objetivo:
- aplicar @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
- usar @Roles() por endpoint
- usar @Tenant() en lugar de req.user.motelId
- pasar TenantContext al service
- validar que habitacionId, clienteId y tarifaId pertenezcan al motel activo
- prohibir que el body defina motelId como fuente de verdad

Además:
- buscar lecturas, updates o deletes por id sin tenant scope
- corregirlos
- dejar el módulo consistente con el esquema nuevo
```

---

# 29) Prompt para Antigravity — Etapa 3

```txt
Refactoriza la base compartida del backend para que los modelos tenant-aware usen aislamiento real por motel.

Objetivo:
- crear BaseTenantService
- implementar buildTenantWhere(tenant, extraWhere)
- refactorizar obtenerUno, actualizar y eliminar para que nunca usen where: { id } solo
- toda operación tenant-aware debe validar primero el registro dentro del scope del tenant
- mantener compatibilidad con superadmin global cuando corresponda

Asegúrate de:
- no romper recursos globales del SaaS
- no confiar en body.motelId ni query.motelId
- dejar el código claro y mantenible
```

---

# 30) Qué archivo usar primero

## Este archivo es el principal
Empezá por este mismo documento.

### Orden interno:
1. sección 5 a 10
2. sección 11 a 14
3. sección 21
4. sección 22 y checklist

---

# 31) Resultado esperado

Al terminar este refactor:

- el tenant activo se resuelve una sola vez
- los roles quedan claros y centralizados
- desaparecen gran parte de los bugs cruzados
- el backend deja de depender de convenciones frágiles del frontend
- tu SaaS queda mucho más vendible y mantenible

---

# 32) Siguiente documento recomendado

Después de implementar esto, el siguiente paso ideal es uno de estos dos:

- `rbac-avanzado.md` para permisos por acción
- `prisma-middleware-multi-tenant.md` si querés reducir repetición en Prisma

Pero primero cerrá bien este documento.
