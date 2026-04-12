import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Consumo } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseService } from '../../compartido/bases/base.service';
import { StockService } from '../stock/stock.service';

@Injectable()
export class ConsumosService extends BaseService<Consumo> {
  constructor(
    prisma: PrismaService,
    private stockService: StockService,
  ) {
    super(prisma, 'consumo', { hasMotelId: true });
  }

  override async crear(data: any): Promise<Consumo> {
    const motelId = data.motelId;
    const turnoId = data.turnoId;
    const productoId = data.productoId;
    const cantidad = Number(data.cantidad ?? data.Cantidad);

    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor a cero');
    }

    return this.prisma.$transaction(async (tx) => {
      const turno = await tx.turno.findFirst({
        where: {
          id: turnoId,
          deletedAt: null,
          habitacion: { motelId, deletedAt: null },
        },
      });

      if (!turno) {
        throw new NotFoundException('Turno no encontrado');
      }

      if (turno.Salida) {
        throw new BadRequestException(
          'No se pueden agregar consumos a un turno cerrado',
        );
      }

      const producto = await tx.producto.findFirst({
        where: { id: productoId, motelId, deletedAt: null },
      });

      if (!producto) {
        throw new NotFoundException('Producto no encontrado');
      }

      const precioUnitario = Number(producto.Precio);
      const importe =
        data.importe != null || data.Importe != null
          ? Number(data.importe ?? data.Importe)
          : precioUnitario * cantidad;

      const depositoSecundario = await tx.deposito.findFirst({
        where: {
          motelId,
          EsPrincipal: false,
          deletedAt: null,
        },
        orderBy: { Nombre: 'asc' },
      });

      if (!depositoSecundario) {
        throw new BadRequestException(
          'No hay depósito secundario configurado para descontar stock de consumos',
        );
      }

      const stockRow = await tx.stock.findFirst({
        where: {
          motelId,
          productoId,
          depositoId: depositoSecundario.id,
          deletedAt: null,
        },
      });

      const disponible = stockRow ? Number(stockRow.Cantidad) : 0;
      if (disponible < cantidad) {
        throw new BadRequestException(
          'Stock insuficiente en depósito secundario para este producto',
        );
      }

      await this.stockService.ajustarStock(
        tx,
        motelId,
        productoId,
        depositoSecundario.id,
        -cantidad,
      );

      return tx.consumo.create({
        data: {
          Cantidad: cantidad,
          Importe: importe,
          productoId,
          turnoId,
          motelId,
        },
      });
    });
  }

  async obtenerTodos(options: any, extraWhere: any = {}) {
    const { include, ...rest } = options;
    return super.obtenerTodos(
      {
        ...rest,
        include: {
          producto: true,
          turno: {
            include: { habitacion: true },
          },
          ...(include || {}),
        },
      },
      extraWhere,
    );
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
        producto: true,
        turno: true,
        ...(include || {}),
      },
      extraWhere,
      scopedMotelId,
    );
  }
}
