-- Proveedor
CREATE TABLE IF NOT EXISTS "Proveedor" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombreContacto" TEXT,
    "telefono" TEXT,
    "rubroId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Proveedor_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Proveedor" ADD CONSTRAINT "Proveedor_rubroId_fkey"
    FOREIGN KEY ("rubroId") REFERENCES "Rubro"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Reserva
CREATE TABLE IF NOT EXISTS "Reserva" (
    "id" TEXT NOT NULL,
    "fechaIngreso" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'Pendiente',
    "notas" TEXT,
    "deletedAt" TIMESTAMP(3),
    "habitacionId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "motelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Reserva_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_habitacionId_fkey"
    FOREIGN KEY ("habitacionId") REFERENCES "Habitacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_clienteId_fkey"
    FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_motelId_fkey"
    FOREIGN KEY ("motelId") REFERENCES "Motel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Agregar proveedorId a Compra y Mantenimiento
ALTER TABLE "Compra" ADD COLUMN IF NOT EXISTS "proveedorId" TEXT;
ALTER TABLE "Compra" ADD CONSTRAINT "Compra_proveedorId_fkey"
    FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Mantenimiento" ADD CONSTRAINT "Mantenimiento_proveedorId_fkey"
    FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
