# turnos-flujo-backend-front-definitivo.md

## 🎯 Objetivo

Unificar y ordenar el flujo completo de **turnos** entre backend y frontend:

👉 crear → consumo → cerrar → pagar → limpiar → finalizar limpieza

Eliminando duplicidades, especialmente en **cobro**, y alineando UX con lógica real.

---

# 🧠 Decisión clave (OBLIGATORIA)

## ❗ Elegimos ESTE modelo:

### ✅ Cerrar ≠ Cobrar

Separar responsabilidades:

| Paso | Acción |
|------|------|
| cerrar turno | calcula total + pasa a LIMPIEZA |
| pagar | genera pago + caja |

---

# 🧩 Flujo final correcto

## 1. Crear turno
- Estado: `ABIERTO`
- Habitación: `OCUPADA`

## 2. Consumo
- Solo si turno `ABIERTO`
- Descuenta stock
- Se acumula al total

## 3. Cerrar turno
- Calcula tarifa
- Suma consumos
- `Estado = CERRADO`
- `PagoPendiente = true`
- Habitación → `LIMPIEZA`

## 4. Pagar
- Crea `Pago`
- Crea `CajaMovimiento`
- `PagoPendiente = false`

## 5. Limpieza
- Se crea registro

## 6. Finalizar limpieza
- Habitación → `DISPONIBLE`

---

# 🔧 BACKEND

## 1. 🔴 FIX CRÍTICO — `cerrarTurno()`

### ❌ HOY (incorrecto)
- crea pago
- crea caja

### ✅ DEBE QUEDAR

Eliminar TODO esto:

```ts
// ❌ BORRAR
await tx.pago.create(...)
await tx.cajaMovimiento.create(...)
```

### ✅ dejar solo:

```ts
await tx.turno.update({
  where: { id },
  data: {
    Estado: 'CERRADO',
    Total: totalCalculado,
    PagoPendiente: true,
    usuarioCierreId: userId,
    Salida: new Date()
  }
});

await tx.habitacion.update({
  where: { id: habitacion.id },
  data: { Estado: 'LIMPIEZA' }
});
```

---

## 2. 🔵 PagosService queda como único responsable

```ts
async crearPago(turnoId, tenant, userId) {
  const turno = await tx.turno.findFirst({
    where: {
      id: turnoId,
      motelId: tenant.motelId,
      Estado: 'CERRADO',
      PagoPendiente: true
    }
  });

  if (!turno) throw new Error('Turno inválido');

  const pago = await tx.pago.create({...});

  await tx.cajaMovimiento.create({...});

  await tx.turno.update({
    where: { id: turno.id },
    data: { PagoPendiente: false }
  });

  return pago;
}
```

---

## 3. 🟡 ConsumosService (faltante importante)

Agregar:

```ts
if (turno.Estado !== 'ABIERTO') {
  throw new Error('No se pueden agregar consumos a turnos cerrados');
}
```

### Descontar stock:

```ts
await stockService.ajustarStock(
  tx,
  tenant.motelId,
  productoId,
  depositoPrincipal.id,
  -cantidad
);
```

---

# 🎨 FRONTEND

## 1. 🔴 FIX CRÍTICO — botón cerrar turno

### ❌ HOY

```ts
update('turnos', {...})
```

### ✅ DEBE SER

```ts
await http.post(`/turnos/${record.id}/cerrar`);
refresh();
```

---

## 2. 🔵 PagoButton queda válido

Flujo correcto:

```ts
if (turno.Estado === 'CERRADO' && turno.PagoPendiente) {
  mostrar botón pagar
}
```

---

## 3. 🟡 Consumos

Bloquear UI:

```ts
if (turno.Estado !== 'ABIERTO') disable();
```

---

## 4. 🟢 Limpieza

Agregar botón FINALIZAR:

```ts
await http.post(`/limpiezas/${id}/finalizar`);
```

---

# 🧪 TEST MANUAL

## Caso ideal

1. crear turno
2. agregar consumo
3. cerrar turno
4. verificar:
   - Estado = CERRADO
   - PagoPendiente = true
5. pagar
6. verificar:
   - PagoPendiente = false
7. crear limpieza
8. finalizar limpieza
9. verificar:
   - habitación = DISPONIBLE

---

# ✅ CHECKLIST FINAL

## Backend
- [ ] cerrar NO crea pago
- [ ] pago actualiza turno
- [ ] consumo valida turno abierto
- [ ] consumo descuenta stock

## Frontend
- [ ] cerrar usa endpoint correcto
- [ ] pagar separado
- [ ] consumo bloqueado en cerrado
- [ ] limpieza tiene finalizar

---

# 🚀 RESULTADO

Flujo limpio, consistente y escalable:

👉 Turno = operación  
👉 Pago = finanzas  
👉 Limpieza = housekeeping

Sin mezclas ni duplicidades.
