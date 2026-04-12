import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseService } from '../../compartido/bases/base.service';
import { Compra } from '@prisma/client';
import { CrearCompraDto } from './dto/crear-compra.dto';
import { StockService } from '../stock/stock.service';

@Injectable()
export class ComprasService extends BaseService<Compra> {
  constructor(
    prisma: PrismaService,
    private stockService: StockService,
  ) {
    super(prisma, 'compra', { hasMotelId: true });
  }

  async crear(crearCompraDto: CrearCompraDto) {
    const { detalles, ...datosCompra } = crearCompraDto;

    return this.prisma.$transaction(async (tx) => {
      // 1. Crear la cabecera de la compra
      const compra = await tx.compra.create({
        data: {
          Fecha: new Date(datosCompra.fecha),
          Total: datosCompra.total,
          Finalizada: datosCompra.finalizada,
          depositoId: datosCompra.depositoId,
          motelId: datosCompra.motelId,
          usuarioId: (crearCompraDto as any).usuarioId, // Fail-safe fallback if not provided
          detalles: {
            create: detalles.map((d) => ({
              Cantidad: d.cantidad,
              Precio: d.precio,
              Importe: d.importe,
              productoId: d.productoId,
              motelId: datosCompra.motelId,
            })),
          },
        },
        include: {
          detalles: true,
        },
      });

      // 2. Si la compra está finalizada, actualizar stock (sumar)
      if (compra.Finalizada) {
        for (const detalle of detalles) {
          await this.stockService.ajustarStock(
            tx,
            datosCompra.motelId,
            detalle.productoId,
            datosCompra.depositoId,
            detalle.cantidad,
          );
        }
      }

      return compra;
    });
  }

  async obtenerTodos(options: any, extraWhere: any = {}) {
    const { include, ...rest } = options;
    return super.obtenerTodos({
      ...rest,
      include: {
        deposito: true,
        detalles: {
          include: { producto: true },
        },
        usuario: {
          select: { Username: true },
        },
        ...(include || {}),
      },
      orderBy: { Fecha: 'desc' },
    }, extraWhere);
  }

  async obtenerUno(
    id: string,
    include?: any,
    extraWhere: any = {},
    scopedMotelId?: string | null,
  ) {
    return super.obtenerUno(
      id,
      {
        deposito: true,
        detalles: {
          include: { producto: true },
        },
        usuario: {
          select: { Username: true },
        },
        ...(include || {}),
      },
      extraWhere,
      scopedMotelId,
    );
  }
}
