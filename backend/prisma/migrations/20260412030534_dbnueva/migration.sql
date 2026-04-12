/*
  Warnings:

  - You are about to drop the column `fechaEgreso` on the `Turno` table. All the data in the column will be lost.
  - You are about to drop the column `fechaIngreso` on the `Turno` table. All the data in the column will be lost.
  - You are about to drop the column `total` on the `Turno` table. All the data in the column will be lost.
  - Added the required column `usuarioId` to the `Compra` table without a default value. This is not possible if the table is not empty.
  - Added the required column `usuarioId` to the `Insumo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `usuarioId` to the `Transferencia` table without a default value. This is not possible if the table is not empty.
  - Added the required column `Ingreso` to the `Turno` table without a default value. This is not possible if the table is not empty.
  - Added the required column `Total` to the `Turno` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TipoEstadia" AS ENUM ('Standard', 'Pernocte');

-- AlterTable
ALTER TABLE "Compra" ADD COLUMN     "proveedorId" TEXT,
ADD COLUMN     "usuarioId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Insumo" ADD COLUMN     "usuarioId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Transferencia" ADD COLUMN     "usuarioId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Turno" DROP COLUMN "fechaEgreso",
DROP COLUMN "fechaIngreso",
DROP COLUMN "total",
ADD COLUMN     "Ingreso" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "Observacion" TEXT,
ADD COLUMN     "ObservacionSecundaria" TEXT,
ADD COLUMN     "PagoPendiente" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "Precio" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "Salida" TIMESTAMP(3),
ADD COLUMN     "Total" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "tipoEstadia" "TipoEstadia" NOT NULL DEFAULT 'Standard';

-- CreateTable
CREATE TABLE "Reserva" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reserva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proveedor" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombreContacto" TEXT,
    "telefono" TEXT,
    "rubroId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proveedor_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Compra" ADD CONSTRAINT "Compra_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compra" ADD CONSTRAINT "Compra_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Insumo" ADD CONSTRAINT "Insumo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transferencia" ADD CONSTRAINT "Transferencia_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Limpieza" ADD CONSTRAINT "Limpieza_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mantenimiento" ADD CONSTRAINT "Mantenimiento_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mantenimiento" ADD CONSTRAINT "Mantenimiento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_habitacionId_fkey" FOREIGN KEY ("habitacionId") REFERENCES "Habitacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_motelId_fkey" FOREIGN KEY ("motelId") REFERENCES "Motel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proveedor" ADD CONSTRAINT "Proveedor_rubroId_fkey" FOREIGN KEY ("rubroId") REFERENCES "Rubro"("id") ON DELETE SET NULL ON UPDATE CASCADE;
