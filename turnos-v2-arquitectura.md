# turnos-v2-arquitectura.md

## Objetivo

Diseñar la **V2 del sistema de turnos** para un motel, asumiendo estas decisiones de producto:

- **cobro automático**
- **tarifas complejas**
- **multi-tenant ya resuelto**
- **flujo operativo unificado entre frontend y backend**
- **auditoría completa**
- **dashboard operativo en tiempo real**

---

# 1) Decisiones de negocio ya definidas

## 1.1 Cobro automático

### Regla
Cuando el turno se **cierra**:

1. se calcula la tarifa final
2. se suman consumos
3. se calcula el total final
4. se genera el pago automáticamente
5. se genera el movimiento de caja automáticamente
6. el turno queda cobrado
7. la habitación pasa a limpieza

## Consecuencia
En esta V2:

- **cerrar = cobrar**
- ya no hay paso manual de pago para el flujo estándar
- el módulo `pagos` deja de ser el flujo normal de un turno
- `pagos` puede quedar solo para:
  - ajustes excepcionales
  - recobros
  - pagos manuales externos
  - auditoría histórica

---

## 1.2 Tarifas complejas

### El motor debe soportar
- tarifa base por franja horaria
- duración incluida
- excedente por bloque
- promociones por día/hora
- precios especiales fin de semana
- precios por habitación / categoría / tipo de habitación
- reglas por canal o tipo de ingreso
- tolerancia antes del recargo
- recargo por sobreestadía
- tarifa fija o escalonada

---

# 2) Flujo operativo final

## Flujo principal

1. **crear turno**
2. **consumir durante el turno**
3. **monitorear tiempo / sobreestadía**
4. **cerrar turno**
5. **cobro automático**
6. **limpieza**
7. **finalizar limpieza**
8. **habitación disponible**

---

# 3) Estados nuevos recomendados

## 3.1 Estado de turno

### Recomendado
```txt
RESERVADO
ABIERTO
EN_CURSO
POR_VENCER
EN_GRACIA
SOBREESTADIA
CERRADO
COBRADO
CANCELADO
```

## Simplificación posible
Si no querés tantos estados visibles, al menos manejar internamente:

```txt
ABIERTO
POR_VENCER
SOBREESTADIA
CERRADO
COBRADO
CANCELADO
```

## Recomendación práctica
### Visible al operador
- ABIERTO
- POR_VENCER
- SOBREESTADIA
- CERRADO
- COBRADO

### Interno / técnico
- EN_GRACIA
- CALCULADO
- FACTURADO

---

## 3.2 Estado de habitación

### Recomendado
```txt
DISPONIBLE
RESERVADA
OCUPADA
POR_VENCER
SOBREESTADIA
LIMPIEZA
FUERA_DE_SERVICIO
```

---

## 3.3 Estado de limpieza

### Recomendado
```txt
PENDIENTE
EN_PROCESO
FINALIZADA
CANCELADA
```

---

# 4) Modelo de datos V2

## 4.1 Turno

Agregar o consolidar campos como:

```ts
id
motelId
habitacionId
clienteId
tarifaId
estado
fechaApertura
fechaInicioReal
fechaCierre
fechaCobro
duracionBaseMinutos
duracionConsumidaMinutos
duracionGraciaMinutos
duracionExcedenteMinutos
subtotalTarifa
subtotalConsumos
descuentos
recargos
total
formaPagoId
pagoId
cajaMovimientoId
usuarioAperturaId
usuarioCierreId
usuarioCobroId
origen
observaciones
deletedAt
```

## Notas
- `subtotalTarifa` = cálculo de tarifa pura
- `subtotalConsumos` = suma de productos/servicios consumidos
- `recargos` = sobreestadía, extras, penalidades
- `total` = resultado final
- `pagoId` y `cajaMovimientoId` permiten trazabilidad

---

## 4.2 Tarifa

Separar tarifa cabecera de reglas.

### `Tarifa`
```ts
id
motelId
nombre
activa
categoriaHabitacionId
tipoHabitacionId
prioridad
vigenciaDesde
vigenciaHasta
duracionBaseMinutos
precioBase
toleranciaMinutos
bloqueExcedenteMinutos
precioBloqueExcedente
aplicaFinde
aplicaDiasSemana
aplicaHorarioDesde
aplicaHorarioHasta
modoCalculo
createdAt
updatedAt
deletedAt
```

### `TarifaRegla`
```ts
id
tarifaId
tipoRegla
orden
condicionJson
resultadoJson
activa
```

## `tipoRegla` posibles
- HORARIO
- DIA_SEMANA
- CATEGORIA_HABITACION
- SOBREESTADIA
- PROMOCION
- PRECIO_FIJO
- BLOQUE_EXCEDENTE
- MINIMO_ESTADIA

---

## 4.3 Consumo

```ts
id
motelId
turnoId
productoId
cantidad
precioUnitario
importe
usuarioId
createdAt
deletedAt
```

## Regla
Guardar `precioUnitario` e `importe` congelados al momento del consumo.

---

## 4.4 Pago

```ts
id
motelId
turnoId
importe
formaPagoId
estado
fechaPago
usuarioId
origen
observaciones
```

## Regla
Para flujo estándar:
- `estado = APROBADO`
- se crea automáticamente al cerrar turno

---

## 4.5 Limpieza

```ts
id
motelId
turnoId
habitacionId
estado
fechaInicio
fechaFin
usuarioInicioId
usuarioFinId
observacion
```

---

## 4.6 EventoTurno / Auditoría

Muy recomendado:

```ts
id
motelId
turnoId
tipoEvento
payloadJson
usuarioId
createdAt
```

## `tipoEvento`
- TURNO_ABIERTO
- CONSUMO_AGREGADO
- TURNO_MARCADO_POR_VENCER
- TURNO_MARCADO_SOBREESTADIA
- TURNO_CERRADO
- PAGO_GENERADO
- CAJA_GENERADA
- LIMPIEZA_CREADA
- LIMPIEZA_FINALIZADA

---

# 5) Motor tarifario V2

## Objetivo
Sacar la lógica de cálculo de `TurnosService` y moverla a un servicio especializado.

## Archivo recomendado
`backend/src/modulos/tarifas/motor-tarifario.service.ts`

---

## 5.1 Entrada del motor

```ts
type CalcularTurnoInput = {
  motelId: string;
  habitacionId: string;
  tarifaId?: string | null;
  fechaInicio: Date;
  fechaFin: Date;
  consumos: Array<{
    productoId: string;
    cantidad: number;
    precioUnitario: number;
    importe: number;
  }>;
  contexto?: {
    diaSemana?: number;
    esFinde?: boolean;
    hora?: string;
    origen?: string;
  };
};
```

---

## 5.2 Salida del motor

```ts
type CalcularTurnoOutput = {
  tarifaAplicadaId: string;
  duracionMinutos: number;
  duracionBaseMinutos: number;
  duracionGraciaMinutos: number;
  duracionExcedenteMinutos: number;
  subtotalTarifa: number;
  subtotalConsumos: number;
  recargos: number;
  descuentos: number;
  total: number;
  detalle: {
    precioBase: number;
    bloquesExcedente: number;
    valorBloqueExcedente: number;
    recargoSobreestadia: number;
    promoAplicada?: string | null;
  };
};
```

---

## 5.3 Reglas del motor

### Regla 1 — Base
- aplicar `precioBase`
- cubrir `duracionBaseMinutos`

### Regla 2 — Tolerancia
- si excede pero entra en tolerancia, no cobrar recargo

### Regla 3 — Excedente
- cada `bloqueExcedenteMinutos` suma `precioBloqueExcedente`

### Regla 4 — Promo
- si coincide con franja, día o tipo de habitación, aplicar regla promocional

### Regla 5 — Consumos
- sumar todos los consumos congelados

### Regla 6 — Redondeos
- redondear al criterio definido:
  - exacto
  - techo por bloque
  - múltiplos

---

## 5.4 Ejemplo de cálculo

### Tarifa
- base: 2 horas
- precio base: 10.000
- tolerancia: 10 min
- excedente: cada 30 min = 2.500

### Turno
- duración real: 2h 50m

### Resultado
- base: 10.000
- excedente: 2 bloques
- recargo: 5.000
- total tarifa: 15.000

Si hubo consumos por 3.200:

- total final: 18.200

---

# 6) Backend — servicios recomendados

## 6.1 TurnosService

Responsabilidades:
- abrir turno
- consultar turno
- cerrar turno
- derivar cálculo al motor tarifario
- crear pago automático
- crear caja automática
- crear limpieza automática o dejarla pendiente
- emitir eventos

## No debe hacer
- lógica tarifaria compleja inline
- lógica de stock inline
- reglas UI

---

## 6.2 ConsumosService

Responsabilidades:
- validar turno abierto
- validar producto del tenant
- obtener precio vigente del producto
- congelar precio en consumo
- crear consumo
- descontar stock
- emitir evento

### Regla clave
No permitir consumo si:
- turno está cerrado
- turno está cobrado
- turno está cancelado

---

## 6.3 PagosService

En V2, queda para:

- soporte del pago automático
- reintentos / contingencia
- auditoría
- casos manuales especiales

### Flujo estándar
No se invoca desde el frontend de operación diaria.

Se invoca desde `cerrarTurno()` o desde un método interno de aplicación.

---

## 6.4 LimpiezasService

Responsabilidades:
- crear limpieza
- iniciar limpieza
- finalizar limpieza
- al finalizar:
  - habitación → DISPONIBLE
  - emitir evento

---

## 6.5 CajaService

Responsabilidades:
- registrar movimiento de caja al cobro
- desacoplar la caja de `TurnosService`
- centralizar reglas de caja

---

# 7) Backend — flujo de cierre correcto

## Método recomendado
`cerrarTurno(id, tenant, userId, formaPagoId?)`

### Secuencia
1. buscar turno
2. validar tenant
3. validar que no esté ya cerrado/cobrado
4. traer consumos
5. llamar al motor tarifario
6. actualizar turno con subtotales y total
7. crear pago automático
8. crear movimiento de caja
9. marcar turno como `COBRADO`
10. cambiar habitación a `LIMPIEZA`
11. crear evento de auditoría
12. opcional: crear limpieza pendiente

---

## Ejemplo conceptual

```ts
async cerrarTurno(id: string, tenant: TenantContext, userId: string, formaPagoId?: string) {
  return this.prisma.$transaction(async (tx) => {
    const turno = await tx.turno.findFirst({
      where: {
        id,
        motelId: tenant.motelId,
        deletedAt: null,
      },
      include: {
        habitacion: true,
        tarifa: true,
        consumos: true,
      },
    });

    if (!turno) {
      throw new NotFoundException('Turno no encontrado');
    }

    if (turno.estado === 'COBRADO' || turno.estado === 'CERRADO') {
      throw new BadRequestException('El turno ya fue cerrado');
    }

    const calculo = await this.motorTarifario.calcular({
      motelId: tenant.motelId!,
      habitacionId: turno.habitacionId,
      tarifaId: turno.tarifaId,
      fechaInicio: turno.fechaApertura,
      fechaFin: new Date(),
      consumos: turno.consumos.map((c) => ({
        productoId: c.productoId,
        cantidad: c.cantidad,
        precioUnitario: c.precioUnitario,
        importe: c.importe,
      })),
    });

    const turnoActualizado = await tx.turno.update({
      where: { id: turno.id },
      data: {
        estado: 'COBRADO',
        fechaCierre: new Date(),
        fechaCobro: new Date(),
        subtotalTarifa: calculo.subtotalTarifa,
        subtotalConsumos: calculo.subtotalConsumos,
        recargos: calculo.recargos,
        descuentos: calculo.descuentos,
        total: calculo.total,
        usuarioCierreId: userId,
        usuarioCobroId: userId,
        formaPagoId: formaPagoId ?? turno.formaPagoId ?? null,
        pagoPendiente: false,
      },
    });

    const pago = await tx.pago.create({
      data: {
        motelId: tenant.motelId!,
        turnoId: turno.id,
        importe: calculo.total,
        formaPagoId: formaPagoId ?? turno.formaPagoId ?? null,
        estado: 'APROBADO',
        fechaPago: new Date(),
        usuarioId: userId,
        origen: 'CIERRE_TURNO_AUTOMATICO',
      },
    });

    const cajaMovimiento = await tx.cajaMovimiento.create({
      data: {
        motelId: tenant.motelId!,
        turnoId: turno.id,
        pagoId: pago.id,
        monto: calculo.total,
        tipo: 'INGRESO',
        concepto: 'COBRO_TURNO',
        fecha: new Date(),
        usuarioId: userId,
      },
    });

    await tx.turno.update({
      where: { id: turno.id },
      data: {
        pagoId: pago.id,
        cajaMovimientoId: cajaMovimiento.id,
      },
    });

    await tx.habitacion.update({
      where: { id: turno.habitacionId },
      data: {
        estado: 'LIMPIEZA',
      },
    });

    await tx.eventoTurno.create({
      data: {
        motelId: tenant.motelId!,
        turnoId: turno.id,
        tipoEvento: 'TURNO_CERRADO',
        payloadJson: {
          total: calculo.total,
          subtotalTarifa: calculo.subtotalTarifa,
          subtotalConsumos: calculo.subtotalConsumos,
        },
        usuarioId: userId,
      },
    });

    return turnoActualizado;
  });
}
```

---

# 8) Backend — consumos

## Método recomendado
`agregarConsumo(turnoId, dto, tenant, userId)`

### Secuencia
1. buscar turno abierto
2. validar producto tenant
3. validar stock
4. descontar stock
5. congelar precio
6. crear consumo
7. emitir evento
8. opcional: recalcular total estimado en vivo

---

## Ejemplo conceptual

```ts
async agregarConsumo(turnoId: string, dto: any, tenant: TenantContext, userId: string) {
  return this.prisma.$transaction(async (tx) => {
    const turno = await tx.turno.findFirst({
      where: {
        id: turnoId,
        motelId: tenant.motelId,
        estado: {
          in: ['ABIERTO', 'EN_CURSO', 'POR_VENCER', 'SOBREESTADIA'],
        },
        deletedAt: null,
      },
    });

    if (!turno) {
      throw new BadRequestException('No se pueden agregar consumos a este turno');
    }

    const producto = await tx.producto.findFirst({
      where: {
        id: dto.productoId,
        motelId: tenant.motelId,
        deletedAt: null,
      },
    });

    if (!producto) {
      throw new NotFoundException('Producto no encontrado');
    }

    const precioUnitario = Number(producto.PrecioVenta ?? producto.precioVenta ?? 0);
    const cantidad = Number(dto.cantidad);
    const importe = precioUnitario * cantidad;

    await this.stockService.ajustarStock(
      tx,
      tenant.motelId!,
      producto.id,
      dto.depositoId,
      -cantidad,
    );

    const consumo = await tx.consumo.create({
      data: {
        motelId: tenant.motelId!,
        turnoId: turno.id,
        productoId: producto.id,
        cantidad,
        precioUnitario,
        importe,
        usuarioId: userId,
      },
    });

    await tx.eventoTurno.create({
      data: {
        motelId: tenant.motelId!,
        turnoId: turno.id,
        tipoEvento: 'CONSUMO_AGREGADO',
        payloadJson: {
          productoId: producto.id,
          cantidad,
          importe,
        },
        usuarioId: userId,
      },
    });

    return consumo;
  });
}
```

---

# 9) Frontend — arquitectura V2

## Objetivo
La UI ya no debe pensar el turno como:
- abrir
- cerrar
- pagar por separado

Sino como una experiencia operativa completa.

---

## 9.1 Pantalla principal de operación

## Vista recomendada
Un tablero por habitaciones con estados visuales:

- DISPONIBLE
- OCUPADA
- POR_VENCER
- SOBREESTADIA
- LIMPIEZA

Cada tarjeta de habitación debe mostrar:

- número / nombre
- estado
- cliente o móvil
- hora de apertura
- tiempo transcurrido
- tiempo restante
- total estimado
- consumos acumulados
- acciones rápidas

---

## 9.2 Acciones rápidas por habitación

### Si está DISPONIBLE
- Abrir turno
- Reservar

### Si está OCUPADA
- Agregar consumo
- Ver detalle
- Extender / recalcular
- Cerrar y cobrar

### Si está POR_VENCER / SOBREESTADIA
- alerta visual
- agregar consumo
- cerrar y cobrar

### Si está LIMPIEZA
- iniciar limpieza
- finalizar limpieza

---

## 9.3 Botón de cierre

En V2 debe ser explícito:

```txt
Cerrar y cobrar
```

No:
```txt
Cerrar
```

Porque el cobro es automático.

---

## 9.4 Pantalla de detalle de turno

Debe mostrar en tiempo real:

- hora inicio
- tiempo transcurrido
- tiempo restante o sobretiempo
- tarifa aplicada
- subtotal tarifa
- subtotal consumos
- recargos
- descuentos
- total estimado
- forma de pago a usar al cerrar
- lista de consumos

---

## 9.5 UX de consumos

En vez de simple popover, idealmente:

- botón rápido en tarjeta
- modal de consumos
- mostrar stock
- mostrar precio
- mostrar subtotal de consumo acumulado

---

# 10) Frontend — flujo recomendado

## 10.1 Crear turno
Formulario con:
- habitación
- cliente o móvil
- tarifa sugerida
- observaciones

### Backend decide
- tenant
- usuario apertura

---

## 10.2 Agregar consumo
Formulario rápido con:
- producto
- cantidad
- stock visible
- subtotal del ítem

---

## 10.3 Cerrar y cobrar
Botón:
```txt
Cerrar y cobrar
```

### Debe pedir
- confirmación
- forma de pago si aplica
- mostrar total final antes de confirmar

### Llamada recomendada
```ts
await http.post(`/turnos/${record.id}/cerrar`, {
  formaPagoId,
});
```

---

## 10.4 Limpieza
Después del cierre:

### Crear limpieza
Puede ser automática en backend o vía UI.

### UI recomendada
- botón `Iniciar limpieza`
- botón `Finalizar limpieza`

---

# 11) Dashboard operativo V2

## Widgets recomendados

- habitaciones disponibles
- habitaciones ocupadas
- turnos por vencer
- turnos en sobreestadía
- habitaciones en limpieza
- ingresos del día
- ticket promedio
- consumo promedio por turno
- tiempo promedio por habitación

---

## Alertas recomendadas

- turno por vencer en menos de 10 min
- turno en sobreestadía
- habitación mucho tiempo en limpieza
- forma de pago faltante para cierre
- producto sin stock en consumos

---

# 12) API recomendada

## Turnos
- `POST /turnos/abrir`
- `GET /turnos`
- `GET /turnos/:id`
- `POST /turnos/:id/cerrar`
- `POST /turnos/:id/extender`
- `POST /turnos/:id/cancelar`

## Consumos
- `POST /turnos/:id/consumos`
- `GET /turnos/:id/consumos`
- `DELETE /consumos/:id`

## Limpiezas
- `POST /turnos/:id/limpiezas`
- `POST /limpiezas/:id/iniciar`
- `POST /limpiezas/:id/finalizar`

## Dashboard
- `GET /operacion/dashboard`
- `GET /operacion/habitaciones`
- `GET /operacion/alertas`

---

# 13) Orden de implementación recomendado

## Etapa 1
- crear `motor-tarifario.service.ts`
- definir tipos de entrada/salida
- mover cálculo fuera de `TurnosService`

## Etapa 2
- refactor `cerrarTurno()` para:
  - calcular
  - cobrar
  - caja
  - limpieza

## Etapa 3
- refactor `ConsumosService`
- congelar precio
- descontar stock
- auditar evento

## Etapa 4
- crear `EventoTurno`
- empezar a registrar eventos

## Etapa 5
- ajustar frontend:
  - `Cerrar y cobrar`
  - dashboard operativo
  - vista de tiempos y alertas

## Etapa 6
- limpieza V2:
  - iniciar
  - finalizar
  - métricas

---

# 14) Checklist final

## Backend
- [ ] cierre cobra automáticamente
- [ ] cierre crea caja automáticamente
- [ ] cierre mueve habitación a limpieza
- [ ] consumos solo en turno abierto
- [ ] consumos descuentan stock
- [ ] consumos congelan precio
- [ ] motor tarifario separado
- [ ] eventos de auditoría registrados

## Frontend
- [ ] UI muestra estados reales
- [ ] botón dice `Cerrar y cobrar`
- [ ] detalle muestra total estimado en vivo
- [ ] consumos rápidos muestran stock y subtotal
- [ ] limpieza se puede iniciar/finalizar
- [ ] dashboard operativo muestra alertas

---

# 15) Riesgos a evitar

## No hacer
- meter lógica tarifaria compleja dentro del controller
- calcular totales solo en frontend
- permitir consumo después del cierre
- cobrar dos veces el mismo turno
- liberar habitación sin finalizar limpieza
- depender de `localStorage.user` para usuarios operativos

---

# 16) Resultado esperado

Con esta V2 vas a tener:

- operación más rápida
- menos errores de caja
- cierre consistente
- auditoría completa
- pricing flexible
- base lista para escalar a un producto serio de hospitality vertical
