ALTER TABLE "cajas"
ADD COLUMN "usuarioId" TEXT;

CREATE INDEX "cajas_usuarioId_idx" ON "cajas"("usuarioId");

ALTER TABLE "cajas"
ADD CONSTRAINT "cajas_usuarioId_fkey"
FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id")
ON DELETE SET NULL ON UPDATE CASCADE;