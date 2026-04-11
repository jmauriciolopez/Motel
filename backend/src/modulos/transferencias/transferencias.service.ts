import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseService } from '../../compartido/bases/base.service';
import { Transferencia } from '@prisma/client';
import { CrearTransferenciaDto } from './dto/crear-transferencia.dto';
import { StockService } from '../stock/stock.service';

@Injectable()
export class TransferenciasService extends BaseService<Transferencia> {
  constructor(
    prisma: PrismaService,
    private stockService: StockService,
  ) {
    super(prisma, 'transferencia', { hasMotelId: true });
  }

  async crear(crearTransferenciaDto: CrearTransferenciaDto) {
    const { detalles, ...datosTransferencia } = crearTransferenciaDto;

    return this.prisma.$transaction(async (tx) => {
      // 1. Crear la cabecera de la transferencia
      const transferencia = await tx.transferencia.create({
        data: {
          Fecha: new Date(datosTransferencia.fecha),
          Observacion: datosTransferencia.observacion,
          Finalizada: datosTransferencia.finalizada,
          motelId: datosTransferencia.motelId,
          depositoOrigenId: datosTransferencia.depositoOrigenId,
          depositoDestinoId: datosTransferencia.depositoDestinoId,
          usuarioId: (crearTransferenciaDto as any).usuarioId, // Fallback
          detalles: {
            create: detalles.map((d) => ({
              Cantidad: d.cantidad,
              productoId: d.productoId,
              motelId: datosTransferencia.motelId,
            })),
          },
        },
        include: {
          detalles: true,
        },
      });

      // 2. Si la transferencia está finalizada, mover stock
      if (transferencia.Finalizada) {
        for (const detalle of detalles) {
          // Descontar del origen
          await this.stockService.ajustarStock(
            tx,
            datosTransferencia.motelId,
            detalle.productoId,
            datosTransferencia.depositoOrigenId,
            -detalle.cantidad,
          );

          // Incrementar en el destino
          await this.stockService.ajustarStock(
            tx,
            datosTransferencia.motelId,
            detalle.productoId,
            datosTransferencia.depositoDestinoId,
            detalle.cantidad,
          );
        }
      }

      return transferencia;
    });
  }

  async obtenerTodos(options: any, extraWhere: any = {}) {
    const { include, ...rest } = options;
    return super.obtenerTodos({
      ...rest,
      include: {
        depositoOrigen: true,
        depositoDestino: true,
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

  async obtenerUno(id: string, include?: any, extraWhere: any = {}) {
    return super.obtenerUno(id, {
      depositoOrigen: true,
      depositoDestino: true,
      detalles: {
        include: { producto: true },
      },
      usuario: {
        select: { Username: true },
      },
      ...(include || {}),
    }, extraWhere);
  }
}
