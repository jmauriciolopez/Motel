import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseService } from '../../compartido/bases/base.service';
import { Stock } from '@prisma/client';

@Injectable()
export class StockService extends BaseService<Stock> {
  constructor(prisma: PrismaService) {
    super(prisma, 'stock', { hasMotelId: true });
  }

  async obtenerTodos(options: any, extraWhere: any = {}) {
    // Merge includes: default + custom from options
    const defaultInclude = {
      producto: true,
      deposito: true,
    };
    
    const customInclude = options?.include || {};
    
    // Si el frontend envía un include custom para producto, usarlo
    const finalInclude = {
      ...defaultInclude,
      ...customInclude,
    };
    
    return super.obtenerTodos({
      ...options,
      include: finalInclude,
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
      where: { motelId, productoId, depositoId, deletedAt: null },
    });

    if (stockExistente) {
      return tx.stock.update({
        where: { id: stockExistente.id },
        data: {
          Cantidad: Number(stockExistente.Cantidad) + cantidad,
        },
      });
    } else {
      return tx.stock.create({
        data: {
          motelId,
          productoId,
          depositoId,
          Cantidad: cantidad,
        },
      });
    }
  }

  /**
   * Descuenta en origen y suma en destino. No permite stock negativo en origen.
   */
  async transferirStock(
    tx: any,
    motelId: string,
    productoId: string,
    depositoOrigenId: string,
    depositoDestinoId: string,
    cantidad: number,
  ) {
    const cantidadNumero = Number(cantidad);
    if (!Number.isFinite(cantidadNumero) || cantidadNumero <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor a cero');
    }

    const stockOrigen = await tx.stock.findFirst({
      where: {
        motelId,
        productoId,
        depositoId: depositoOrigenId,
        deletedAt: null,
      },
    });

    const cantidadOrigen = stockOrigen ? Number(stockOrigen.Cantidad) : 0;
    if (!stockOrigen || cantidadOrigen < cantidadNumero) {
      throw new BadRequestException(
        'Stock insuficiente en depósito origen para completar la transferencia',
      );
    }

    const stockDestino = await tx.stock.findFirst({
      where: {
        motelId,
        productoId,
        depositoId: depositoDestinoId,
        deletedAt: null,
      },
    });

    await tx.stock.update({
      where: { id: stockOrigen.id },
      data: { Cantidad: cantidadOrigen - cantidadNumero },
    });

    if (stockDestino) {
      await tx.stock.update({
        where: { id: stockDestino.id },
        data: {
          Cantidad: Number(stockDestino.Cantidad) + cantidadNumero,
        },
      });
    } else {
      await tx.stock.create({
        data: {
          motelId,
          productoId,
          depositoId: depositoDestinoId,
          Cantidad: cantidadNumero,
        },
      });
    }
  }
}
