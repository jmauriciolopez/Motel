-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('SUPERADMIN', 'ADMINISTRADOR', 'SUPERVISOR', 'RECEPCIONISTA');

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "rol" "RolUsuario" NOT NULL DEFAULT 'RECEPCIONISTA';

-- CreateTable
CREATE TABLE "cajas" (
    "id" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "importe" DECIMAL(65,30) NOT NULL,
    "saldo" DECIMAL(65,30) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "motelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cajas_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "cajas" ADD CONSTRAINT "cajas_motelId_fkey" FOREIGN KEY ("motelId") REFERENCES "Motel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
