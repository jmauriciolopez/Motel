import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
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

  override async crear(crearInsumoDto: CrearInsumoDto) {
    const detalles = crearInsumoDto.detalles ?? [];
    const { detalles: _, ...datosInsumo } = crearInsumoDto;

    const usuarioId = datosInsumo.usuarioId;
    if (!usuarioId) {
      throw new BadRequestException('Usuario requerido para crear el insumo');
    }

    const motelId = datosInsumo.motelId;
    if (!motelId) {
      throw new BadRequestException('Indicá un motel activo');
    }

    return this.prisma.$transaction(async (tx) => {
      const depositoCabecera = await tx.deposito.findFirst({
        where: {
          id: datosInsumo.depositoId,
          motelId,
          deletedAt: null,
        },
      });

      if (!depositoCabecera) {
        throw new NotFoundException(
          'Depósito de insumo no encontrado para este motel',
        );
      }

      const depositoSecundario = await tx.deposito.findFirst({
        where: {
          motelId,
          EsPrincipal: false,
          deletedAt: null,
        },
        orderBy: { Nombre: 'asc' },
      });

      if (!depositoSecundario) {
        throw new NotFoundException(
          'No existe depósito secundario para este motel',
        );
      }

      for (const detalle of detalles) {
        const producto = await tx.producto.findFirst({
          where: {
            id: detalle.productoId,
            motelId,
            deletedAt: null,
          },
        });

        if (!producto) {
          throw new NotFoundException(
            `Producto inválido para este motel: ${detalle.productoId}`,
          );
        }
      }

      const insumo = await tx.insumo.create({
        data: {
          Fecha: new Date(datosInsumo.fecha),
          Observacion: datosInsumo.observacion,
          Finalizada: datosInsumo.finalizada,
          depositoId: datosInsumo.depositoId,
          motelId,
          usuarioId,
          detalles: {
            create: detalles.map((d) => ({
              Cantidad: d.cantidad,
              productoId: d.productoId,
              motelId,
            })),
          },
        },
        include: {
          detalles: true,
        },
      });

      if (insumo.Finalizada && detalles.length > 0) {
        for (const detalle of detalles) {
          await this.stockService.ajustarStock(
            tx,
            motelId,
            detalle.productoId,
            depositoSecundario.id,
            -detalle.cantidad,
          );
        }
      }

      return insumo;
    });
  }

  override async actualizar(
    id: string,
    data: any,
    scopedMotelId?: string | null,
  ) {
    const existing = await this.obtenerUno(id, undefined, {}, scopedMotelId);
    if (!existing) {
      throw new NotFoundException('Insumo no encontrado');
    }

    const becomingFinal =
      data.Finalizada === true || data.finalizada === true;
    if (!becomingFinal || existing.Finalizada) {
      return super.actualizar(id, data, scopedMotelId);
    }

    const motelId = existing.motelId;
    const detalles = (existing as any).detalles ?? [];

    return this.prisma.$transaction(async (tx) => {
      const depositoSecundario = await tx.deposito.findFirst({
        where: {
          motelId,
          EsPrincipal: false,
          deletedAt: null,
        },
        orderBy: { Nombre: 'asc' },
      });

      if (!depositoSecundario) {
        throw new NotFoundException(
          'No existe depósito secundario para este motel',
        );
      }

      for (const detalle of detalles) {
        const producto = await tx.producto.findFirst({
          where: {
            id: detalle.productoId,
            motelId,
            deletedAt: null,
          },
        });

        if (!producto) {
          throw new NotFoundException(
            `Producto inválido para este motel: ${detalle.productoId}`,
          );
        }
      }

      const updated = await tx.insumo.update({
        where: { id: existing.id },
        data,
      });

      for (const detalle of detalles) {
        const qty = detalle.Cantidad ?? detalle.cantidad;
        await this.stockService.ajustarStock(
          tx,
          motelId,
          detalle.productoId,
          depositoSecundario.id,
          -qty,
        );
      }

      return updated;
    });
  }

  async obtenerTodos(options: any, extraWhere: any = {}) {
    const { include, ...rest } = options;
    return super.obtenerTodos(
      {
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
