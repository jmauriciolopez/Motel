-- Add descuentoEfectivo column to Motel table
ALTER TABLE "Motel"
ADD COLUMN IF NOT EXISTS "descuentoEfectivo" DOUBLE PRECISION NOT NULL DEFAULT 0;
