/*
  Warnings:

  - Added the required column `motelId` to the `Proveedor` table without a default value. This is not possible if the table is not empty.

*/

-- Primero, agregar la columna como nullable
ALTER TABLE "Proveedor" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Proveedor" ADD COLUMN "motelId" TEXT;

-- Asignar todos los proveedores existentes al primer motel disponible
UPDATE "Proveedor" 
SET "motelId" = (SELECT "id" FROM "Motel" LIMIT 1)
WHERE "motelId" IS NULL;

-- Ahora hacer la columna NOT NULL
ALTER TABLE "Proveedor" ALTER COLUMN "motelId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Proveedor" ADD CONSTRAINT "Proveedor_motelId_fkey" FOREIGN KEY ("motelId") REFERENCES "Motel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
