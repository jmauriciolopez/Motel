# transferencias-depositos-backend-front-definitivo.md

## Objetivo

Dejar **transferencias de productos entre depósitos** completamente alineado entre backend y frontend, asumiendo que:

- el **multi-tenant backend ya está cerrado**
- el tenant activo se resuelve por `x-motel-id`
- todas las operaciones se validan contra el motel activo
- las transferencias ocurren entre el **depósito principal** y uno o más **depósitos secundarios**
- toda transferencia debe **descontar stock del origen** y **sumar stock al destino**
- no debe haber stock negativo
- no debe permitirse transferencia entre depósitos de distintos moteles

Este documento unifica:

- cambios de backend
- cambios de frontend
- reglas de negocio
- snippets concretos
- secuencia de implementación
- checklist
- test manual

---

# 1) Regla de negocio final

## Transferencias

### Flujo esperado
1. el usuario crea una transferencia
2. elige depósito origen
3. elige depósito destino
4. agrega uno o más ítems
5. al confirmar la transferencia:
   - se valida tenant
   - se validan ambos depósitos
   - se valida stock disponible en origen
   - se descuenta stock del origen
   - se suma stock al destino
   - se registra movimiento de salida
   - se registra movimiento de entrada
   - la transferencia queda confirmada

## Regla principal ↔ secundario

### Caso habitual
- origen = depósito principal
- destino = depósito secundario

### Caso inverso
- origen = depósito secundario
- destino = depósito principal

### Reglas
- ambos depósitos deben pertenecer al motel activo
- no se permite transferir al mismo depósito
- no se permite cantidad <= 0
- no se permite confirmar una transferencia sin ítems
- no se permite confirmar si el origen no tiene stock suficiente

---

# 2) Diseño recomendado

## Entidades mínimas

- `TransferenciaDeposito` o equivalente
- `TransferenciaDetalle` o equivalente
- `Deposito`
- `Stock` / `StockProducto`
- `MovimientoStock`

## Estados sugeridos
- `BORRADOR`
- `CONFIRMADA`
- `ANULADA`

## Recomendación
La transferencia debería impactar stock **solo** al confirmar.

No conviene:
- mover stock al crear la cabecera
- mover stock al agregar cada ítem
- volver a mover stock al editar una transferencia ya confirmada

---

# 3) Secuencia recomendada de implementación

## Orden exacto

1. backend: service de transferencias
2. backend: stock service / movimientos
3. frontend: data provider y filtros
4. frontend: create/edit de transferencia
5. frontend: detalle de transferencia
6. frontend: acción confirmar
7. test manual integrado

---

# 4) Backend — cambios concretos

## Archivo principal
`backend/src/modulos/transferencias/transferencias.service.ts`

Si el nombre real en tu repo es otro, reemplazar por:
- `movimientos.service.ts`
- `stock-transferencias.service.ts`
- `traslados.service.ts`

Usar el nombre real.

---

# 4.1 Validar depósitos contra tenant

## Objetivo
Confirmar que origen y destino pertenezcan al motel activo.

### Agregar dentro de la transacción

```ts
const depositoOrigen = await tx.deposito.findFirst({
  where: {
    id: datosTransferencia.depositoOrigenId,
    motelId: tenant.motelId,
    deletedAt: null,
  },
});

if (!depositoOrigen) {
  throw new NotFoundException('Depósito origen no encontrado para este motel');
}

const depositoDestino = await tx.deposito.findFirst({
  where: {
    id: datosTransferencia.depositoDestinoId,
    motelId: tenant.motelId,
    deletedAt: null,
  },
});

if (!depositoDestino) {
  throw new NotFoundException('Depósito destino no encontrado para este motel');
}
```

---

# 4.2 Impedir transferencia al mismo depósito

```ts
if (depositoOrigen.id === depositoDestino.id) {
  throw new BadRequestException('El depósito origen y destino no pueden ser el mismo');
}
```

---

# 4.3 Validar productos de los ítems

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

  if (!detalle.cantidad || Number(detalle.cantidad) <= 0) {
    throw new BadRequestException(
      `Cantidad inválida para producto ${detalle.productoId}`,
    );
  }
}
```

---

# 4.4 Validar stock disponible en depósito origen

## Objetivo
Evitar stock negativo.

```ts
for (const detalle of detalles) {
  const stockOrigen = await tx.stock.findFirst({
    where: {
      motelId: tenant.motelId,
      depositoId: depositoOrigen.id,
      productoId: detalle.productoId,
    },
  });

  const cantidadActual = Number(stockOrigen?.cantidad || 0);
  const cantidadSolicitada = Number(detalle.cantidad || 0);

  if (cantidadActual < cantidadSolicitada) {
    throw new BadRequestException(
      `Stock insuficiente para producto ${detalle.productoId} en depósito origen`,
    );
  }
}
```

## Si tu modelo se llama distinto
Reemplazar `tx.stock` por el nombre real:
- `tx.stockProducto`
- `tx.inventario`
- etc.

---

# 4.5 Crear transferencia + detalles

## Ejemplo recomendado

```ts
const transferencia = await tx.transferenciaDeposito.create({
  data: {
    Fecha: new Date(datosTransferencia.fecha),
    Estado: datosTransferencia.estado || 'BORRADOR',
    depositoOrigenId: datosTransferencia.depositoOrigenId,
    depositoDestinoId: datosTransferencia.depositoDestinoId,
    Observacion: datosTransferencia.observacion ?? null,
    motelId: tenant.motelId,
    usuarioId,
    detalles: {
      create: detalles.map((d) => ({
        productoId: d.productoId,
        Cantidad: d.cantidad,
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
Usar los nombres reales de tu schema:
- `Fecha` o `fecha`
- `Estado` o `estado`
- `Observacion` o `observacion`
- `Cantidad` o `cantidad`

---

# 4.6 Confirmar transferencia e impactar stock

## Recomendación
Mover stock solo si la transferencia queda `CONFIRMADA`.

### Ejemplo
```ts
if (transferencia.Estado === 'CONFIRMADA') {
  for (const detalle of detalles) {
    await this.stockService.transferirStock(
      tx,
      tenant.motelId,
      detalle.productoId,
      depositoOrigen.id,
      depositoDestino.id,
      detalle.cantidad,
      usuarioId,
      transferencia.id,
    );
  }
}
```

---

# 4.7 Método recomendado en `stock.service.ts`

## Objetivo
Centralizar la transferencia de stock.

### Ejemplo
```ts
async transferirStock(
  tx: any,
  motelId: string,
  productoId: string,
  depositoOrigenId: string,
  depositoDestinoId: string,
  cantidad: number,
  usuarioId?: string,
  origenId?: string,
) {
  const cantidadNumero = Number(cantidad);

  if (cantidadNumero <= 0) {
    throw new BadRequestException('La cantidad debe ser mayor a cero');
  }

  const stockOrigen = await tx.stock.findFirst({
    where: {
      motelId,
      productoId,
      depositoId: depositoOrigenId,
    },
  });

  const cantidadOrigen = Number(stockOrigen?.cantidad || 0);

  if (cantidadOrigen < cantidadNumero) {
    throw new BadRequestException('Stock insuficiente en depósito origen');
  }

  const stockDestino = await tx.stock.findFirst({
    where: {
      motelId,
      productoId,
      depositoId: depositoDestinoId,
    },
  });

  await tx.stock.update({
    where: { id: stockOrigen.id },
    data: {
      cantidad: cantidadOrigen - cantidadNumero,
    },
  });

  if (stockDestino) {
    await tx.stock.update({
      where: { id: stockDestino.id },
      data: {
        cantidad: Number(stockDestino.cantidad) + cantidadNumero,
      },
    });
  } else {
    await tx.stock.create({
      data: {
        motelId,
        productoId,
        depositoId: depositoDestinoId,
        cantidad: cantidadNumero,
      },
    });
  }

  await tx.movimientoStock.create({
    data: {
      motelId,
      productoId,
      depositoId: depositoOrigenId,
      tipo: 'TRANSFERENCIA_SALIDA',
      origenTipo: 'TRANSFERENCIA',
      origenId,
      cantidad: cantidadNumero,
      usuarioId,
    },
  });

  await tx.movimientoStock.create({
    data: {
      motelId,
      productoId,
      depositoId: depositoDestinoId,
      tipo: 'TRANSFERENCIA_ENTRADA',
      origenTipo: 'TRANSFERENCIA',
      origenId,
      cantidad: cantidadNumero,
      usuarioId,
    },
  });
}
```

## Si usás nombres distintos
Reemplazar:
- `stock`
- `movimientoStock`
- `tipo`
- `origenTipo`
según tu schema real.

---

# 4.8 Método completo sugerido de confirmación

## Recomendación fuerte
Usar endpoint explícito:
`POST /transferencias/:id/confirmar`

### Ejemplo conceptual
```ts
async confirmar(id: string, tenant: TenantContext, usuarioId: string) {
  return this.prisma.$transaction(async (tx) => {
    const transferencia = await tx.transferenciaDeposito.findFirst({
      where: {
        id,
        motelId: tenant.motelId,
        deletedAt: null,
      },
      include: {
        detalles: true,
      },
    });

    if (!transferencia) {
      throw new NotFoundException('Transferencia no encontrada');
    }

    if (transferencia.Estado === 'CONFIRMADA') {
      throw new BadRequestException('La transferencia ya fue confirmada');
    }

    if (!transferencia.detalles.length) {
      throw new BadRequestException('La transferencia no tiene ítems');
    }

    const depositoOrigen = await tx.deposito.findFirst({
      where: {
        id: transferencia.depositoOrigenId,
        motelId: tenant.motelId,
        deletedAt: null,
      },
    });

    const depositoDestino = await tx.deposito.findFirst({
      where: {
        id: transferencia.depositoDestinoId,
        motelId: tenant.motelId,
        deletedAt: null,
      },
    });

    if (!depositoOrigen || !depositoDestino) {
      throw new NotFoundException('Depósitos inválidos para esta transferencia');
    }

    if (depositoOrigen.id === depositoDestino.id) {
      throw new BadRequestException('Origen y destino no pueden ser el mismo');
    }

    for (const detalle of transferencia.detalles) {
      await this.stockService.transferirStock(
        tx,
        tenant.motelId,
        detalle.productoId,
        depositoOrigen.id,
        depositoDestino.id,
        detalle.Cantidad,
        usuarioId,
        transferencia.id,
      );
    }

    return tx.transferenciaDeposito.update({
      where: { id: transferencia.id },
      data: {
        Estado: 'CONFIRMADA',
      },
    });
  });
}
```

---

# 4.9 Endpoint recomendado

## Controller
```ts
@Post(':id/confirmar')
@Roles('superadmin', 'administrador', 'supervisor')
confirmar(
  @Param('id') id: string,
  @Tenant() tenant: TenantContext,
  @CurrentUser() user: JwtUser,
) {
  return this.service.confirmar(id, tenant, user.sub);
}
```

## Regla
No usar `PATCH` genérico para confirmar transferencias con side effects de stock.

---

# 5) Frontend — cambios concretos

## Archivo principal sugerido
`frontend/src/Operaciones/transferencias.js`

Si el archivo real tiene otro nombre:
- `movimientos.js`
- `transferenciasDepositos.js`
- `traslados.js`

Usar el nombre real.

---

# 5.1 `nestDataProvider.ts`

## Confirmar fix de booleanos
Debe quedar así:

```ts
if (typeof value === 'boolean') {
    sanitized[key] = value;
    continue;
}
```

Esto es importante para filtros como:
- `EsPrincipal: true`
- `Activo: true`

---

# 5.2 `HttpClient.ts`

## Confirmar que mande siempre `x-motel-id`

```ts
const motelId = typeof window !== 'undefined' ? localStorage.getItem('motelId') : null;

if (motelId) {
  headers['x-motel-id'] = motelId;
}
```

---

# 5.3 `MotelContext.js`

## Mantener cambio sin reload total

```ts
const changeMotel = (id) => {
    setCurrentMotelId(id);
    localStorage.setItem('motelId', id);
    window.dispatchEvent(new CustomEvent('motel-changed', { detail: { motelId: id } }));
};
```

---

# 5.4 Formulario de transferencia

## Campos recomendados

### Cabecera
- Fecha
- depósito origen
- depósito destino
- observación

### Detalle
- producto
- cantidad

## Regla UX
No permitir elegir el mismo depósito en origen y destino.

### Ejemplo visual
Si el usuario elige origen = principal:
- destino debe listar solo secundarios

Si el usuario elige origen = secundario:
- destino puede ser principal o otro secundario, según tu regla

---

# 5.5 Filtros para depósitos

## Si querés flujo principal ↔ secundario explícito

### Para origen principal
```tsx
<ReferenceInput
    source="depositoOrigenId"
    reference="depositos"
    filter={{ EsPrincipal: true }}
>
    <AutocompleteInput label="Depósito origen" optionText="Nombre" fullWidth />
</ReferenceInput>
```

### Para destino secundario
```tsx
<ReferenceInput
    source="depositoDestinoId"
    reference="depositos"
    filter={{ EsPrincipal: false }}
>
    <AutocompleteInput label="Depósito destino" optionText="Nombre" fullWidth />
</ReferenceInput>
```

## Si querés permitir ida y vuelta
Listar todos los depósitos del motel y validar en UI que no sean iguales.

---

# 5.6 Validar origen != destino en frontend

## Ejemplo con `FormDataConsumer`

```tsx
import { FormDataConsumer } from 'react-admin';
import { Alert } from '@mui/material';

<FormDataConsumer>
    {({ formData }) =>
        formData.depositoOrigenId &&
        formData.depositoDestinoId &&
        formData.depositoOrigenId === formData.depositoDestinoId ? (
            <Alert severity="error">
                El depósito origen y destino no pueden ser el mismo.
            </Alert>
        ) : null
    }
</FormDataConsumer>
```

---

# 5.7 Flujo recomendado de pantalla

## Opción A
- crear transferencia
- redirigir a carga de detalles
- luego confirmar

## Opción B
- crear transferencia con detalles inline
- confirmar en la misma pantalla

## Recomendación
Para mantener consistencia con compras, usar opción A.

### Después de crear
```tsx
<Create
    redirect={(resource, id) => `/transferenciadetalles/create?transferenciaId=${id}`}
    sx={{ mt: 2 }}
>
```

---

# 5.8 Detalle de transferencia

## Campos
- producto
- cantidad

## Ayuda visual recomendada
Mostrar stock actual del depósito origen para el producto seleccionado.

## Ejemplo conceptual
- seleccionar producto
- consultar stock por `productoId + depositoOrigenId`
- mostrar:
  - `Stock disponible en origen: 12`

## Beneficio
Evita errores al confirmar.

---

# 5.9 Botón confirmar

## Recomendación
No usar update genérico.

### Preferido
Hacer llamada a endpoint explícito:

```ts
await http.post(`/transferencias/${record.id}/confirmar`);
```

Luego:
- refresh
- notify success

---

# 5.10 Bloquear edición después de confirmar

## Regla
Si `Estado === 'CONFIRMADA'`:
- no permitir editar detalles
- no permitir cambiar depósitos
- no permitir borrar ítems
- no volver a confirmar

## Ejemplo
Ocultar botones o deshabilitar acciones.

---

# 6) UX sugerida para principal ↔ secundario

## Caso típico
Mover producto desde principal a secundario.

### Flujo simple
- origen fijo = principal
- destino = selector de secundarios
- mostrar badge:
  - "Salida desde depósito principal"
  - "Entrada a depósito secundario"

## Caso devolución / retorno
Mover de secundario a principal.

### Flujo simple
- origen = selector de secundarios
- destino fijo = principal

## Recomendación
Podés separar en dos acciones:
- `Abastecer secundario`
- `Retornar a principal`

Eso simplifica muchísimo la UX.

---

# 7) Logs temporales recomendados

## Backend
```ts
console.log('TRANSFERENCIA motelId:', tenant.motelId);
console.log('DEPOSITO ORIGEN:', depositoOrigen?.id);
console.log('DEPOSITO DESTINO:', depositoDestino?.id);
console.log('DETALLES:', detalles);
```

Dentro del loop:
```ts
console.log('TRANSFIRIENDO STOCK', {
  motelId: tenant.motelId,
  productoId: detalle.productoId,
  depositoOrigenId: depositoOrigen.id,
  depositoDestinoId: depositoDestino.id,
  cantidad: detalle.cantidad,
});
```

## Frontend
```ts
console.log('HTTP x-motel-id:', motelId, endpoint);
console.log('TRANSFERENCIA formData:', formData);
```

Sacar estos logs al terminar.

---

# 8) Test manual integrado

## Caso 1 — Principal a secundario
- login como administrador
- elegir motel
- crear transferencia
- origen = principal
- destino = secundario
- agregar producto con stock suficiente
- confirmar

### Esperado
- stock baja en principal
- stock sube en secundario
- se crean movimientos

---

## Caso 2 — Secundario a principal
- origen = secundario
- destino = principal
- confirmar

### Esperado
- stock baja en secundario
- stock sube en principal

---

## Caso 3 — Origen y destino iguales
- intentar misma selección

### Esperado
- error en frontend y backend

---

## Caso 4 — Sin stock suficiente
- intentar transferir más de lo disponible

### Esperado
- error
- no mover stock

---

## Caso 5 — Producto de otro motel
- intentar producto cruzado

### Esperado
- error
- no crear o no confirmar

---

## Caso 6 — Depósito de otro motel
- intentar depósito cruzado

### Esperado
- error
- no crear o no confirmar

---

## Caso 7 — Transferencia sin ítems
- intentar confirmar sin detalles

### Esperado
- error claro

---

## Caso 8 — Doble confirmación
- confirmar una vez
- volver a confirmar

### Esperado
- error
- no duplicar movimientos

---

## Caso 9 — Cambio de motel
- cambiar motel desde UI
- abrir transferencias

### Esperado
- datos del motel correcto
- depósitos del motel correcto
- stock del motel correcto

---

# 9) Checklist final

## Backend
- [ ] valida depósito origen contra tenant
- [ ] valida depósito destino contra tenant
- [ ] impide origen = destino
- [ ] valida productos contra tenant
- [ ] valida stock suficiente
- [ ] descuenta del origen
- [ ] suma al destino
- [ ] registra movimientos de salida y entrada
- [ ] bloquea doble confirmación

## Frontend
- [ ] booleanos reales no se deforman
- [ ] `x-motel-id` viaja siempre
- [ ] cambio de motel no usa reload forzado
- [ ] origen y destino no pueden ser iguales
- [ ] flujo de create → detalles → confirmar está claro
- [ ] detalle muestra cantidad de forma clara
- [ ] si es posible, muestra stock disponible en origen
- [ ] no se editan transferencias confirmadas

---

# 10) Qué hacer después

Una vez estabilizado esto, el siguiente paso ideal es:

## Backend
- agregar endpoint de anulación con reverso de movimientos, si el negocio lo necesita

## Frontend
- crear dos accesos guiados:
  - `Abastecer secundario`
  - `Retornar a principal`

Eso reduce errores operativos y hace la experiencia mucho más clara.
