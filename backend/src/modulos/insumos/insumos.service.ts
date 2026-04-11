import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseService } from '../../compartido/bases/base.service';
import { Insumo } from '@prisma/client';
import { CrearInsumoDto } from './dto/crear-insumo.dto';
import { StockService } from '../stock/stock.service';

@Injectable()
export class InsumosService extends BaseService<Insumo> {
  constructor(
    prisma: PrismaService,
    private stockService: StockService,
  ) {
    super(prisma, 'insumo', { hasMotelId: true });
  }

  async crear(crearInsumoDto: CrearInsumoDto) {
    const { detalles, ...datosInsumo } = crearInsumoDto;

    return this.prisma.$transaction(async (tx) => {
      // 1. Crear la cabecera del insumo
      const insumo = await tx.insumo.create({
        data: {
          Fecha: new Date(datosInsumo.fecha),
          Observacion: datosInsumo.observacion,
          Finalizada: datosInsumo.finalizada,
          depositoId: datosInsumo.depositoId,
          motelId: datosInsumo.motelId,
          usuarioId: (crearInsumoDto as any).usuarioId, // Fallback
          detalles: {
            create: detalles.map((d) => ({
              Cantidad: d.cantidad,
              productoId: d.productoId,
              motelId: datosInsumo.motelId,
            })),
          },
        },
        include: {
          detalles: true,
        },
      });

      // 2. Si el insumo está finalizado, descontar stock (usamos cantidad negativa)
      if (insumo.Finalizada) {
        for (const detalle of detalles) {
          await this.stockService.ajustarStock(
            tx,
            datosInsumo.motelId,
            detalle.productoId,
            datosInsumo.depositoId,
            -detalle.cantidad,
          );
        }
      }

      return insumo;
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

  async obtenerUno(id: string, include?: any, extraWhere: any = {}) {
    return super.obtenerUno(id, {
      deposito: true,
      detalles: {
        include: { producto: true },
      },
      usuario: {
        select: { Username: true },
      },
      ...(include || {}),
    }, extraWhere);
  }

  async obtenerDetalles(options: any, extraWhere: any = {}) {
    const page = Number(options.page) || 1;
    const limit = Number(options.limit) || 10;
    const skip = (page - 1) * limit;
    const sort = options.sort || 'createdAt';
    const order = options.order?.toLowerCase() === 'desc' ? 'desc' : 'asc';

    const where: any = {
      deletedAt: null,
      ...extraWhere,
    };

    if (options.motelId) {
      where.motelId = options.motelId;
    }

    const [data, total] = await Promise.all([
      this.prisma.insumoDetalle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sort]: order },
        include: {
          producto: true,
          insumo: {
            include: {
              deposito: true,
            },
          },
        },
      }),
      this.prisma.insumoDetalle.count({ where }),
    ]);

    return { data, total };
  }
}
