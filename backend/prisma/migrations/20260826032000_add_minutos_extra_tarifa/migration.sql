-- Add the field declared by the current Prisma schema.
ALTER TABLE "Tarifa"
ADD COLUMN IF NOT EXISTS "minutosExtra" INTEGER NOT NULL DEFAULT 0;