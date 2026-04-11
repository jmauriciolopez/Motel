import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseService } from '../../compartido/bases/base.service';
import { Stock } from '@prisma/client';

@Injectable()
export class StockService extends BaseService<Stock> {
  constructor(prisma: PrismaService) {
    super(prisma, 'stock', { hasMotelId: true });
  }

  async obtenerTodos(options: any, extraWhere: any = {}) {
    return super.obtenerTodos({
      ...options,
      include: {
        producto: true,
        deposito: true,
      },
    }, extraWhere);
  }

  async consultarStock(motelId: string, productoId: string, depositoId: string) {
    return this.prisma.stock.findFirst({
      where: {
        motelId,
        productoId,
        depositoId,
        deletedAt: null,
      },
    });
  }

  /**
   * Ajusta el stock de un producto en un depósito.
   * Si no existe el registro de stock, lo crea (upsert).
   */
  async ajustarStock(
    tx: any, 
    motelId: string, 
    productoId: string, 
    depositoId: string, 
    cantidad: number
  ) {
    const stockExistente = await tx.stock.findFirst({
      where: { motelId, productoId, depositoId },
    });

    if (stockExistente) {
      return tx.stock.update({
        where: { id: stockExistente.id },
        data: { cantidad: stockExistente.cantidad + cantidad },
      });
    } else {
      return tx.stock.create({
        data: {
          motelId,
          productoId,
          depositoId,
          cantidad,
        },
      });
    }
  }
}
