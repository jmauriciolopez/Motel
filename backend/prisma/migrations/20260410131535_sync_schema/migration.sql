/*
  Warnings:

  - A unique constraint covering the columns `[usuarioId,motelId]` on the table `MotelUsuario` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Rubro" DROP CONSTRAINT "Rubro_motelId_fkey";

-- AlterTable
ALTER TABLE "Rubro" ALTER COLUMN "motelId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "MotelUsuario_usuarioId_motelId_key" ON "MotelUsuario"("usuarioId", "motelId");

-- AddForeignKey
ALTER TABLE "Rubro" ADD CONSTRAINT "Rubro_motelId_fkey" FOREIGN KEY ("motelId") REFERENCES "Motel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
