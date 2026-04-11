-- CreateEnum
CREATE TYPE "EstadoHabitacion" AS ENUM ('DISPONIBLE', 'OCUPADA', 'LIMPIEZA', 'MANTENIMIENTO', 'BLOQUEADA');

-- CreateTable
CREATE TABLE "Propietario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT,
    "cuit" TEXT,
    "ciudad" TEXT,
    "formaPago" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fechaVencimientoPrueba" TIMESTAMP(3),
    "pagoActivo" BOOLEAN NOT NULL DEFAULT false,
    "onboardingCompleto" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Propietario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "provider" TEXT,
    "resetPasswordToken" TEXT,
    "confirmationToken" TEXT,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "propietarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MotelUsuario" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "motelId" TEXT NOT NULL,

    CONSTRAINT "MotelUsuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Motel" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "telefono" TEXT,
    "horarioUnico" BOOLEAN NOT NULL,
    "inicioDia" TIMESTAMP(3),
    "inicioNoche" TIMESTAMP(3),
    "checkOutDia" TIMESTAMP(3),
    "tolerancia" INTEGER NOT NULL,
    "duracionDiaria" INTEGER NOT NULL,
    "duracionNocturna" INTEGER NOT NULL,
    "maxHrAdicional" INTEGER NOT NULL,
    "horaCierreCaja" TEXT,
    "deletedAt" TIMESTAMP(3),
    "propietarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Motel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tarifa" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "precioTurno" DECIMAL(65,30) NOT NULL,
    "precioDiario" DECIMAL(65,30) NOT NULL,
    "precioTurnoPromocional" DECIMAL(65,30),
    "precioHrDiaExcede" DECIMAL(65,30) NOT NULL,
    "precioHrNocheExcede" DECIMAL(65,30) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "motelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tarifa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Habitacion" (
    "id" TEXT NOT NULL,
    "identificador" TEXT NOT NULL,
    "nombre" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "estado" "EstadoHabitacion" NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "motelId" TEXT NOT NULL,
    "tarifaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Habitacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movilidad" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Movilidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "patente" TEXT NOT NULL,
    "marca" TEXT,
    "color" TEXT,
    "deletedAt" TIMESTAMP(3),
    "movilidadId" TEXT,
    "motelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Turno" (
    "id" TEXT NOT NULL,
    "fechaIngreso" TIMESTAMP(3) NOT NULL,
    "fechaEgreso" TIMESTAMP(3),
    "total" DECIMAL(65,30) NOT NULL,
    "estado" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "habitacionId" TEXT NOT NULL,
    "tarifaId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "usuarioAperturaId" TEXT NOT NULL,
    "usuarioCierreId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Turno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consumo" (
    "id" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "importe" DECIMAL(65,30) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "productoId" TEXT NOT NULL,
    "turnoId" TEXT NOT NULL,
    "motelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormaPago" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormaPago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pago" (
    "id" TEXT NOT NULL,
    "importe" DECIMAL(65,30) NOT NULL,
    "referencia" TEXT,
    "deletedAt" TIMESTAMP(3),
    "turnoId" TEXT NOT NULL,
    "formaPagoId" TEXT NOT NULL,
    "motelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rubro" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "facturable" BOOLEAN NOT NULL,
    "esMaestro" BOOLEAN NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "motelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rubro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogoProducto" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "precio" DECIMAL(65,30) NOT NULL,
    "costo" DECIMAL(65,30) NOT NULL,
    "facturable" BOOLEAN NOT NULL,
    "stockMinimo" INTEGER NOT NULL,
    "descripcion" TEXT,
    "criterioBusqueda" TEXT,
    "rubroId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogoProducto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "precio" DECIMAL(65,30) NOT NULL,
    "costo" DECIMAL(65,30) NOT NULL,
    "facturable" BOOLEAN NOT NULL,
    "stockMinimo" INTEGER NOT NULL,
    "esComun" BOOLEAN NOT NULL,
    "criterioBusqueda" TEXT,
    "deletedAt" TIMESTAMP(3),
    "rubroId" TEXT NOT NULL,
    "motelId" TEXT NOT NULL,
    "catalogoProductoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deposito" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "esPrincipal" BOOLEAN NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "motelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deposito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stock" (
    "id" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "depositoId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "motelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Compra" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "total" DECIMAL(65,30) NOT NULL,
    "finalizada" BOOLEAN NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "depositoId" TEXT NOT NULL,
    "motelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompraDetalle" (
    "id" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio" DECIMAL(65,30) NOT NULL,
    "importe" DECIMAL(65,30) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "compraId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "motelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompraDetalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Insumo" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "observacion" TEXT,
    "finalizada" BOOLEAN NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "depositoId" TEXT NOT NULL,
    "motelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Insumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsumoDetalle" (
    "id" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "insumoId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "motelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsumoDetalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transferencia" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "observacion" TEXT,
    "finalizada" BOOLEAN NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "motelId" TEXT NOT NULL,
    "depositoOrigenId" TEXT NOT NULL,
    "depositoDestinoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transferencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferenciaDetalle" (
    "id" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "transferenciaId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "motelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransferenciaDetalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Limpieza" (
    "id" TEXT NOT NULL,
    "finalizado" BOOLEAN NOT NULL,
    "cuando" TIMESTAMP(3) NOT NULL,
    "observacion" TEXT,
    "deletedAt" TIMESTAMP(3),
    "turnoId" TEXT NOT NULL,
    "habitacionId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "motelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Limpieza_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mantenimiento" (
    "id" TEXT NOT NULL,
    "observacion" TEXT,
    "cuando" TIMESTAMP(3) NOT NULL,
    "finalizado" BOOLEAN NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "habitacionId" TEXT NOT NULL,
    "proveedorId" TEXT,
    "usuarioId" TEXT NOT NULL,
    "motelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mantenimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gasto" (
    "id" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "importe" DECIMAL(65,30) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "motelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gasto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Propietario_email_key" ON "Propietario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Pago_turnoId_key" ON "Pago"("turnoId");

-- CreateIndex
CREATE UNIQUE INDEX "Limpieza_turnoId_key" ON "Limpieza"("turnoId");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_propietarioId_fkey" FOREIGN KEY ("propietarioId") REFERENCES "Propietario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MotelUsuario" ADD CONSTRAINT "MotelUsuario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MotelUsuario" ADD CONSTRAINT "MotelUsuario_motelId_fkey" FOREIGN KEY ("motelId") REFERENCES "Motel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Motel" ADD CONSTRAINT "Motel_propietarioId_fkey" FOREIGN KEY ("propietarioId") REFERENCES "Propietario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarifa" ADD CONSTRAINT "Tarifa_motelId_fkey" FOREIGN KEY ("motelId") REFERENCES "Motel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Habitacion" ADD CONSTRAINT "Habitacion_motelId_fkey" FOREIGN KEY ("motelId") REFERENCES "Motel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Habitacion" ADD CONSTRAINT "Habitacion_tarifaId_fkey" FOREIGN KEY ("tarifaId") REFERENCES "Tarifa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_movilidadId_fkey" FOREIGN KEY ("movilidadId") REFERENCES "Movilidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_motelId_fkey" FOREIGN KEY ("motelId") REFERENCES "Motel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turno" ADD CONSTRAINT "Turno_habitacionId_fkey" FOREIGN KEY ("habitacionId") REFERENCES "Habitacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turno" ADD CONSTRAINT "Turno_tarifaId_fkey" FOREIGN KEY ("tarifaId") REFERENCES "Tarifa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turno" ADD CONSTRAINT "Turno_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consumo" ADD CONSTRAINT "Consumo_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consumo" ADD CONSTRAINT "Consumo_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "Turno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consumo" ADD CONSTRAINT "Consumo_motelId_fkey" FOREIGN KEY ("motelId") REFERENCES "Motel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "Turno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_formaPagoId_fkey" FOREIGN KEY ("formaPagoId") REFERENCES "FormaPago"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_motelId_fkey" FOREIGN KEY ("motelId") REFERENCES "Motel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rubro" ADD CONSTRAINT "Rubro_motelId_fkey" FOREIGN KEY ("motelId") REFERENCES "Motel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogoProducto" ADD CONSTRAINT "CatalogoProducto_rubroId_fkey" FOREIGN KEY ("rubroId") REFERENCES "Rubro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_rubroId_fkey" FOREIGN KEY ("rubroId") REFERENCES "Rubro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_motelId_fkey" FOREIGN KEY ("motelId") REFERENCES "Motel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_catalogoProductoId_fkey" FOREIGN KEY ("catalogoProductoId") REFERENCES "CatalogoProducto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deposito" ADD CONSTRAINT "Deposito_motelId_fkey" FOREIGN KEY ("motelId") REFERENCES "Motel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_depositoId_fkey" FOREIGN KEY ("depositoId") REFERENCES "Deposito"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_motelId_fkey" FOREIGN KEY ("motelId") REFERENCES "Motel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compra" ADD CONSTRAINT "Compra_depositoId_fkey" FOREIGN KEY ("depositoId") REFERENCES "Deposito"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compra" ADD CONSTRAINT "Compra_motelId_fkey" FOREIGN KEY ("motelId") REFERENCES "Motel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompraDetalle" ADD CONSTRAINT "CompraDetalle_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "Compra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompraDetalle" ADD CONSTRAINT "CompraDetalle_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompraDetalle" ADD CONSTRAINT "CompraDetalle_motelId_fkey" FOREIGN KEY ("motelId") REFERENCES "Motel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Insumo" ADD CONSTRAINT "Insumo_depositoId_fkey" FOREIGN KEY ("depositoId") REFERENCES "Deposito"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Insumo" ADD CONSTRAINT "Insumo_motelId_fkey" FOREIGN KEY ("motelId") REFERENCES "Motel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsumoDetalle" ADD CONSTRAINT "InsumoDetalle_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsumoDetalle" ADD CONSTRAINT "InsumoDetalle_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsumoDetalle" ADD CONSTRAINT "InsumoDetalle_motelId_fkey" FOREIGN KEY ("motelId") REFERENCES "Motel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transferencia" ADD CONSTRAINT "Transferencia_motelId_fkey" FOREIGN KEY ("motelId") REFERENCES "Motel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transferencia" ADD CONSTRAINT "Transferencia_depositoOrigenId_fkey" FOREIGN KEY ("depositoOrigenId") REFERENCES "Deposito"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transferencia" ADD CONSTRAINT "Transferencia_depositoDestinoId_fkey" FOREIGN KEY ("depositoDestinoId") REFERENCES "Deposito"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferenciaDetalle" ADD CONSTRAINT "TransferenciaDetalle_transferenciaId_fkey" FOREIGN KEY ("transferenciaId") REFERENCES "Transferencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferenciaDetalle" ADD CONSTRAINT "TransferenciaDetalle_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferenciaDetalle" ADD CONSTRAINT "TransferenciaDetalle_motelId_fkey" FOREIGN KEY ("motelId") REFERENCES "Motel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Limpieza" ADD CONSTRAINT "Limpieza_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "Turno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Limpieza" ADD CONSTRAINT "Limpieza_habitacionId_fkey" FOREIGN KEY ("habitacionId") REFERENCES "Habitacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Limpieza" ADD CONSTRAINT "Limpieza_motelId_fkey" FOREIGN KEY ("motelId") REFERENCES "Motel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mantenimiento" ADD CONSTRAINT "Mantenimiento_habitacionId_fkey" FOREIGN KEY ("habitacionId") REFERENCES "Habitacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mantenimiento" ADD CONSTRAINT "Mantenimiento_motelId_fkey" FOREIGN KEY ("motelId") REFERENCES "Motel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_motelId_fkey" FOREIGN KEY ("motelId") REFERENCES "Motel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
