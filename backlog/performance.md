# Plan de Performance y Escalabilidad

Este documento detalla la estrategia de optimización de base de datos para el sistema de Moteles, preparando la infraestructura para un volumen superior a los 100k registros en la tabla de `Turnos`.

## 1. Estrategia de Indexación (Prisma)

Se recomienda agregar los siguientes índices en `schema.prisma`. Prisma NO indexa las llaves foráneas por defecto, lo que penaliza los `JOIN`.

### Modelo `Turno`
*   `habitacionId`, `clienteId`, `tarifaId`, `usuarioAperturaId`, `usuarioCierreId` (Foreign Keys).
*   `Ingreso`, `Salida` (Filtros de rango y ordenamiento).
*   `PagoPendiente`, `deletedAt`.
*   **Índice Compuesto**: `(Salida, PagoPendiente)` para optimizar la vista operativa (turnos abiertos).

### Modelo `Cliente`
*   `motelId`, `deletedAt`, `Patente`.
*   **Índice Compuesto**: `(motelId, deletedAt)` para aislamiento multi-tenant eficiente.

### Modelo `Habitacion`
*   `motelId`, `deletedAt`, `tarifaId`, `Estado`.

### Modelos Multi-Tenant Generales (Caja, Producto, Consumo, etc.)
*   `motelId`, `deletedAt`.

---

## 2. Monitoreo e Identificación de Cuellos de Botella

Para identificar cuándo la base de datos necesita mantenimiento u optimización adicional:

### Métricas Críticas
1.  **Sequential Scans**: Si una tabla de más de 10k filas reporta escaneos secuenciales frecuentes, falta un índice.
    *   *Herramienta*: `EXPLAIN ANALYZE <query>;`
2.  **pg_stat_statements**: Módulo de Postgres para rastrear las queries más costosas por tiempo total o promedio.
    *   *Acción*: Monitorear el `mean_exec_time`.
3.  **IO Wait**: Si el uso de disco es alto pero el CPU bajo, la DB está paginando a disco porque los índices/datos no caben en RAM.
4.  **Index Bloat**: En tablas con muchos `UPDATE` o `DELETE` (como `Turno` o `Habitacion`), los índices pueden crecer innecesariamente.
    *   *Acción*: Ejecutar `REINDEX` o `VACUUM FULL` periódicamente (en ventanas de mantenimiento).

---

## 3. Hoja de Ruta para 100k+ Registros

A medida que el sistema crezca hacia el objetivo de 100k turnos anuales:

1.  **Archivado (Cold Storage)**: Considerar mover turnos de más de 2 años a una tabla histórica o eliminar lógicamente (`deletedAt`) y filtrar por defecto.
2.  **Denormalización**: Si el join con `Habitacion` para filtrar por `motelId` se vuelve lento, duplicar `motelId` directamente en la tabla `Turno`.
3.  **Particionamiento**: Si una tabla supera los millones de registros, particionar por `motelId` o por `Fecha (mes/año)`.
4.  **Caché de Lectura**: Implementar Redis para el estado de las habitaciones (`EstadoHabitacion`) para evitar consultas constantes a la DB en el dashboard principal.
