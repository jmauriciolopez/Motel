# compras-multi-tenant-backend-front-definitivo.md

## Objetivo

Dejar **compras** completamente alineado entre backend y frontend, asumiendo que:

- el **multi-tenant backend ya está cerrado**
- el tenant activo se resuelve por `x-motel-id`
- el backend valida el motel real
- al **finalizar una compra**, los productos deben sumarse al stock del **depósito principal** del motel activo

Este documento unifica:

- cambios de backend
- cambios de frontend
- snippets concretos
- secuencia de implementación
- checklist
- test manual

---

# 1) Regla de negocio final

## Compras

### Flujo esperado
1. se crea una compra
2. se cargan sus ítems
3. cuando la compra se **finaliza**
4. el backend busca el **depósito principal del motel activo**
5. por cada ítem, suma stock en ese depósito principal
6. la UI refleja que la compra ya no está editable como borrador

## Importante
El frontend **no decide** el tenant final ni el destino real del stock.  
El frontend solo:
- manda `x-motel-id`
- arma la experiencia de carga

El backend:
- decide el tenant real
- decide el depósito principal
- valida productos y depósitos
- impacta stock

---

# 2) Secuencia recomendada de implementación

## Orden exacto

1. corregir backend de compras
2. corregir filtros booleanos del frontend
3. corregir UX de cambio de motel
4. corregir formulario de compras
5. corregir flujo de detalles
6. test manual integrado

---

# 3) Backend — cambios concretos

## Archivo principal
`backend/src/modulos/compras/compras.service.ts`

---

## 3.1 Validar depósito de la compra

Aunque el stock termine entrando al principal, sigue conviniendo validar que el `depositoId` enviado pertenezca al motel.

### Agregar dentro de la transacción

```ts
const depositoCompra = await tx.deposito.findFirst({
  where: {
    id: datosCompra.depositoId,
    motelId: tenant.motelId,
    deletedAt: null,
  },
});

if (!depositoCompra) {
  throw new NotFoundException('Depósito de compra no encontrado para este motel');
}
```

## Nota
Si ya eliminaste `motelId` del DTO y usás tenant real, entonces:
- usar `tenant.motelId`
- no `datosCompra.motelId`

---

## 3.2 Buscar depósito principal del motel activo

### Agregar dentro de la misma transacción

```ts
const depositoPrincipal = await tx.deposito.findFirst({
  where: {
    motelId: tenant.motelId,
    EsPrincipal: true,
    deletedAt: null,
  },
});

if (!depositoPrincipal) {
  throw new NotFoundException('No existe depósito principal para este motel');
}
```

## Si el campo no se llama `EsPrincipal`
Reemplazar por el nombre real:
- `esPrincipal`
- `principal`
- `isPrincipal`

Usar el nombre exacto de Prisma.

---

## 3.3 Validar productos de los ítems

### Agregar antes de crear la compra

```ts
for (const detalle of detalles) {
  const producto = await tx.producto.findFirst({
    where: {
      id: detalle.productoId,
      motelId: tenant.motelId,
      deletedAt: null,
    },
  });

  if (!producto) {
    throw new NotFoundException(
      `Producto inválido para este motel: ${detalle.productoId}`,
    );
  }
}
```

---

## 3.4 Crear compra + detalles

### Ejemplo recomendado

```ts
const compra = await tx.compra.create({
  data: {
    Fecha: new Date(datosCompra.fecha),
    Total: datosCompra.total,
    Finalizada: datosCompra.finalizada,
    depositoId: datosCompra.depositoId,
    motelId: tenant.motelId,
    usuarioId: usuarioId,
    detalles: {
      create: detalles.map((d) => ({
        Cantidad: d.cantidad,
        Precio: d.precio,
        Importe: d.importe,
        productoId: d.productoId,
        motelId: tenant.motelId,
      })),
    },
  },
  include: {
    detalles: true,
  },
});
```

## Ajustar nombres
Usar exactamente los nombres reales de tu schema:
- `Fecha` o `fecha`
- `Total` o `total`
- `Finalizada` o `finalizada`
- `Cantidad` o `cantidad`
- `Precio` o `precio`
- `Importe` o `importe`

---

## 3.5 Impactar stock en depósito principal

### Reemplazar la lógica actual

#### Si hoy tenés:
```ts
await this.stockService.ajustarStock(
  tx,
  tenant.motelId,
  detalle.productoId,
  datosCompra.depositoId,
  detalle.cantidad,
);
```

#### Cambiar por:
```ts
await this.stockService.ajustarStock(
  tx,
  tenant.motelId,
  detalle.productoId,
  depositoPrincipal.id,
  detalle.cantidad,
);
```

### Bloque completo recomendado

```ts
if (compra.Finalizada) {
  for (const detalle of detalles) {
    await this.stockService.ajustarStock(
      tx,
      tenant.motelId,
      detalle.productoId,
      depositoPrincipal.id,
      detalle.cantidad,
    );
  }
}
```

---

## 3.6 Ejemplo completo sugerido de `crear()`

```ts
async crear(crearCompraDto: CrearCompraDto, tenant: TenantContext, usuarioId: string) {
  const { detalles, ...datosCompra } = crearCompraDto;

  return this.prisma.$transaction(async (tx) => {
    const depositoCompra = await tx.deposito.findFirst({
      where: {
        id: datosCompra.depositoId,
        motelId: tenant.motelId,
        deletedAt: null,
      },
    });

    if (!depositoCompra) {
      throw new NotFoundException(
        'Depósito de compra no encontrado para este motel',
      );
    }

    const depositoPrincipal = await tx.deposito.findFirst({
      where: {
        motelId: tenant.motelId,
        EsPrincipal: true,
        deletedAt: null,
      },
    });

    if (!depositoPrincipal) {
      throw new NotFoundException(
        'No existe depósito principal para este motel',
      );
    }

    for (const detalle of detalles) {
      const producto = await tx.producto.findFirst({
        where: {
          id: detalle.productoId,
          motelId: tenant.motelId,
          deletedAt: null,
        },
      });

      if (!producto) {
        throw new NotFoundException(
          `Producto inválido para este motel: ${detalle.productoId}`,
        );
      }
    }

    const compra = await tx.compra.create({
      data: {
        Fecha: new Date(datosCompra.fecha),
        Total: datosCompra.total,
        Finalizada: datosCompra.finalizada,
        depositoId: datosCompra.depositoId,
        motelId: tenant.motelId,
        usuarioId,
        detalles: {
          create: detalles.map((d) => ({
            Cantidad: d.cantidad,
            Precio: d.precio,
            Importe: d.importe,
            productoId: d.productoId,
            motelId: tenant.motelId,
          })),
        },
      },
      include: {
        detalles: true,
      },
    });

    if (compra.Finalizada) {
      for (const detalle of detalles) {
        await this.stockService.ajustarStock(
          tx,
          tenant.motelId,
          detalle.productoId,
          depositoPrincipal.id,
          detalle.cantidad,
        );
      }
    }

    return compra;
  });
}
```

---

## 3.7 `stock.service.ts`

### Verificar que `ajustarStock()` haga esto

```ts
async ajustarStock(
  tx: any,
  motelId: string,
  productoId: string,
  depositoId: string,
  cantidad: number,
) {
  const stock = await tx.stock.findFirst({
    where: {
      motelId,
      productoId,
      depositoId,
    },
  });

  if (stock) {
    return tx.stock.update({
      where: { id: stock.id },
      data: {
        cantidad: stock.cantidad + cantidad,
      },
    });
  }

  return tx.stock.create({
    data: {
      motelId,
      productoId,
      depositoId,
      cantidad,
    },
  });
}
```

## Si el modelo real se llama distinto
Reemplazar `stock` por:
- `stockProducto`
- `inventario`
- etc.

---

## 3.8 `base.service.ts` — filtro virtual `existe`

Si todavía no quedó incorporado, dejarlo así:

```ts
private aplicarFiltrosVirtuales(where: any, filtrosNormalizados: any): void {
  if (filtrosNormalizados.existe === true) {
    if (this.hasSoftDelete) {
      where.deletedAt = null;
    }
    delete filtrosNormalizados.existe;
    return;
  }

  if (filtrosNormalizados.existe === false) {
    if (this.hasSoftDelete) {
      where.deletedAt = { not: null };
    }
    delete filtrosNormalizados.existe;
    return;
  }

  delete filtrosNormalizados.existe;
}
```

Y en `obtenerTodos`:

```ts
const filtrosNormalizados = normalizarFiltroParaPrisma(filters);
this.aplicarFiltrosVirtuales(where, filtrosNormalizados);
Object.assign(where, filtrosNormalizados);
```

---

# 4) Frontend — cambios concretos

## Archivo 1
`frontend/src/shared/api/nestDataProvider.ts`

---

## 4.1 Corregir `sanitizeFilter()` para booleanos reales

## Problema actual
Convierte booleans a:

```ts
value === true ? { "$ne": null } : null
```

Eso rompe filtros como:
- `EsPrincipal: true`
- `Finalizada: true`

## Reemplazo correcto

### Antes
```ts
if (typeof value === 'boolean') {
    sanitized[key] = value === true ? { "$ne": null } : null;
    continue;
}
```

### Después
```ts
if (typeof value === 'boolean') {
    sanitized[key] = value;
    continue;
}
```

---

## 4.2 Actualizar comentario viejo de tenant

### Antes
```ts
// nestDataProvider.ts - motelId viene del JWT, no del cliente
```

### Después
```ts
// nestDataProvider.ts - el tenant activo viaja en x-motel-id desde HttpClient.
// No enviar motelId como query param ni como payload operativo.
```

---

# 5) Frontend — `HttpClient.ts`

## Archivo
`frontend/src/shared/api/HttpClient.ts`

## Confirmar que quede así

```ts
const motelId = typeof window !== 'undefined' ? localStorage.getItem('motelId') : null;

if (motelId) {
  headers['x-motel-id'] = motelId;
}
```

## Log temporal útil

```ts
console.log('HTTP x-motel-id:', motelId, endpoint);
```

Después sacarlo.

---

# 6) Frontend — `MotelContext.js`

## Problema actual
Al cambiar de motel hace:

```ts
window.location.reload();
```

## Cambiar `changeMotel`

### Antes
```ts
const changeMotel = (id) => {
    setCurrentMotelId(id);
    localStorage.setItem('motelId', id);
    window.location.reload();
};
```

### Después
```ts
const changeMotel = (id) => {
    setCurrentMotelId(id);
    localStorage.setItem('motelId', id);
    window.dispatchEvent(new CustomEvent('motel-changed', { detail: { motelId: id } }));
};
```

---

## 6.1 Refrescar vistas al cambiar de motel

### Ejemplo

```ts
import React from 'react';
import { useRefresh } from 'react-admin';

const refresh = useRefresh();

React.useEffect(() => {
    const handler = () => refresh();
    window.addEventListener('motel-changed', handler);
    return () => window.removeEventListener('motel-changed', handler);
}, [refresh]);
```

## Aplicar primero en
- dashboard
- compras
- turnos
- pagos
- stock
- clientes

---

# 7) Frontend — `compras.js`

## Objetivo
Alinear la UI con esta regla:

> el backend decide el depósito principal de impacto de stock

---

## 7.1 No mostrar `depositoId` como si definiera el destino final del stock

### Si hoy tenés algo así
```tsx
<ReferenceInput
    source="depositoId"
    reference="depositos"
    filter={{ EsPrincipal: true }}
>
    <AutocompleteInput label='Depósito' optionText='Nombre' validate={Requerido} fullWidth />
</ReferenceInput>
```

### Reemplazar por UX más clara
```tsx
<TextInput
    source="depositoInfo"
    label="Depósito de ingreso"
    defaultValue="Se ingresará automáticamente al depósito principal del motel"
    fullWidth
    disabled
/>
```

---

## 7.2 Mantener `depositoId` oculto si el backend todavía lo exige

### Default values
```tsx
const defaultValues = React.useMemo(() => {
    const base = {
        Fecha: new Date().toISOString().split('T')[0],
        Finalizada: false
    };

    if (depositos && depositos.length > 0) {
        base.depositoId = depositos[0].id;
    }

    return base;
}, [depositos]);
```

### Input oculto
```tsx
<TextInput
    source="depositoInfo"
    label="Depósito de ingreso"
    defaultValue="Se ingresará automáticamente al depósito principal del motel"
    fullWidth
    disabled
/>

<TextInput source="depositoId" sx={{ display: 'none' }} />
```

## Mejor opción
Si backend ya no necesita `depositoId`, eliminarlo del DTO y del formulario.

---

## 7.3 Redirigir luego de crear compra

## Objetivo
Después de crear compra, llevar directamente a la carga de ítems.

### Antes
```tsx
<Create redirect="list" sx={{ mt: 2 }}>
```

### Después
```tsx
<Create
    redirect={(resource, id) => `/compradetalles/create?compraId=${id}`}
    sx={{ mt: 2 }}
>
```

---

## 7.4 Finalizar compra

Si hoy usás update genérico:

```ts
await dataProvider.update('compras', {
    id: record.id,
    data: { Finalizada: true },
    previousData: record,
});
```

Lo podés dejar así por ahora.

## A futuro
Mejor crear:
```txt
POST /compras/:id/confirmar
```

y usar una acción explícita de negocio.

---

# 8) Frontend — `compradetalles.js`

## Objetivo
Mejorar la carga de ítems.

### Recomendación
Mostrar importe calculado automáticamente.

## Ejemplo

```tsx
import { FormDataConsumer } from 'react-admin';
import { Typography } from '@mui/material';

<FormDataConsumer>
    {({ formData }) => {
        const cantidad = Number(formData.Cantidad || 0);
        const precio = Number(formData.Precio || 0);
        const importe = cantidad * precio;

        return (
            <Typography variant="body2">
                Importe estimado: ${importe.toFixed(2)}
            </Typography>
        );
    }}
</FormDataConsumer>
```

---

# 9) Frontend — permisos

## Problema
El frontend puede estar usando roles viejos como:
- `Supervisor`
- `Administrador`
- `SuperAdmin`

Pero backend ya usa:
- `superadmin`
- `administrador`
- `supervisor`
- `recepcionista`

## Crear helper

```ts
export const hasRole = (permissions, roles = []) => {
    const normalized = String(permissions || '').toLowerCase();
    return roles.includes(normalized);
};
```

## Ejemplo
```ts
const canManageCompras = hasRole(permissions, ['superadmin', 'administrador', 'supervisor']);
```

---

# 10) Orden exacto de implementación por archivo

## Backend
1. `compras.service.ts`
2. `stock.service.ts`
3. `base.service.ts` si todavía falta `existe`

## Frontend
4. `nestDataProvider.ts`
5. `HttpClient.ts`
6. `MotelContext.js`
7. `compras.js`
8. `compradetalles.js`
9. helper de roles

---

# 11) Logs temporales recomendados

## Backend
```ts
console.log('COMPRA motelId:', tenant.motelId);
console.log('DEPOSITO COMPRA:', depositoCompra?.id);
console.log('DEPOSITO PRINCIPAL:', depositoPrincipal?.id);
console.log('DETALLES:', detalles);
```

Dentro del loop:

```ts
console.log('IMPACTANDO STOCK', {
  motelId: tenant.motelId,
  productoId: detalle.productoId,
  depositoId: depositoPrincipal.id,
  cantidad: detalle.cantidad,
});
```

## Frontend
```ts
console.log('HTTP x-motel-id:', motelId, endpoint);
console.log('COMPRA defaultValues:', defaultValues);
```

Sacar estos logs al terminar.

---

# 12) Test manual integrado

## Caso 1 — Cambio de motel
- login como administrador con 2 moteles
- cambiar motel desde UI
- abrir compras
- verificar que la data cambia correctamente

## Caso 2 — Filtro booleano real
- abrir create compra
- verificar que el filtro `EsPrincipal: true` funcione si seguís usando selector
- o que el depósito oculto se resuelva bien por default

## Caso 3 — Crear compra
- crear compra borrador
- verificar redirección a carga de detalle

## Caso 4 — Cargar ítems
- agregar 1 o 2 detalles
- verificar importes

## Caso 5 — Finalizar compra
- finalizar compra
- verificar que el stock aumente en el depósito principal

## Caso 6 — Compra no finalizada
- crear compra no finalizada
- verificar que el stock no cambie

## Caso 7 — Producto cruzado
- intentar producto de otro motel
- debe fallar

## Caso 8 — Depósito cruzado
- intentar depósito de otro motel
- debe fallar

## Caso 9 — Sin depósito principal
- debe fallar con mensaje claro

## Caso 10 — Permisos
- recepcionista no debe ver acciones no permitidas
- supervisor solo las suyas
- administrador y superadmin según corresponda

---

# 13) Checklist final

## Backend
- [ ] compra valida `depositoId` contra tenant
- [ ] compra valida productos contra tenant
- [ ] compra busca depósito principal del tenant
- [ ] compra impacta stock en depósito principal
- [ ] stock suma o crea correctamente
- [ ] `existe` no llega como columna real a Prisma

## Frontend
- [ ] booleanos reales no se deforman en `sanitizeFilter()`
- [ ] `x-motel-id` viaja siempre en `HttpClient`
- [ ] cambio de motel no usa reload forzado
- [ ] compras no muestra un depósito engañoso como destino real
- [ ] create compra redirige a carga de ítems
- [ ] detalle muestra importe estimado
- [ ] roles del frontend usan naming actual

---

# 14) Qué hacer después

Una vez estabilizado esto, el siguiente paso ideal es:

## Backend
- crear endpoint explícito `POST /compras/:id/confirmar`

## Frontend
- reemplazar `PATCH Finalizada=true` por acción explícita de confirmación

Eso te deja una arquitectura más limpia y robusta.
