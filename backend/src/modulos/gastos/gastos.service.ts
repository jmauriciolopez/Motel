import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseService } from '../../compartido/bases/base.service';
import { Gasto } from '@prisma/client';

@Injectable()
export class GastosService extends BaseService<Gasto> {
  constructor(prisma: PrismaService) {
    super(prisma, 'gasto', { hasMotelId: true });
  }

  async crear(data: any): Promise<Gasto> {
    return this.prisma.$transaction(async (tx) => {
      const gasto = await tx.gasto.create({ data });

      // Registrar movimiento negativo en caja
      const ultimoMovimiento = await tx.caja.findFirst({
        where: { motelId: data.motelId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });

      const saldoAnterior = ultimoMovimiento ? Number(ultimoMovimiento.Saldo) : 0;
      const importeOriginal = Number(data.Importe ?? data.importe ?? 0);
      const importeNegativo = -Math.abs(importeOriginal);
      const nuevoSaldo = saldoAnterior + importeNegativo;
      const concepto = data.Concepto ?? data.concepto ?? 'Gasto';

      await tx.caja.create({
        data: {
          Concepto: `Gasto[${gasto.id}]: ${concepto}`,
          Importe: importeNegativo,
          Saldo: nuevoSaldo,
          motelId: data.motelId,
        },
      });

      return gasto;
    });
  }

  async actualizar(id: string, data: any, scopedMotelId?: string | null): Promise<Gasto> {
    return this.prisma.$transaction(async (tx) => {
      // Obtener el gasto actual para calcular la diferencia
      const gastoActual = await tx.gasto.findFirst({
        where: { id, deletedAt: null },
      });

      if (!gastoActual) {
        const { NotFoundException } = await import('@nestjs/common');
        throw new NotFoundException('Gasto no encontrado');
      }

      const gastoActualizado = await tx.gasto.update({ where: { id }, data });

      const nuevoImporte = Number(data.Importe ?? data.importe);
      if (isNaN(nuevoImporte) || nuevoImporte === Number(gastoActual.Importe)) {
        return gastoActualizado;
      }

      // Calcular diferencia: si el gasto sube, la caja baja más; si baja, la caja sube
      const importeAnterior = Number(gastoActual.Importe);
      const diferencia = -(nuevoImporte - importeAnterior); // negativo si sube el gasto

      const motelId = gastoActual.motelId;
      const ultimoMovimiento = await tx.caja.findFirst({
        where: { motelId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });

      const saldoAnterior = ultimoMovimiento ? Number(ultimoMovimiento.Saldo) : 0;
      const concepto = data.Concepto ?? data.concepto ?? gastoActual.Concepto;

      await tx.caja.create({
        data: {
          Concepto: `Ajuste Gasto: ${concepto}`,
          Importe: diferencia,
          Saldo: saldoAnterior + diferencia,
          motelId,
        },
      });

      return gastoActualizado;
    });
  }
}
