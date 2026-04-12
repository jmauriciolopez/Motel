import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
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

  override async crear(crearTransferenciaDto: CrearTransferenciaDto) {
    const detalles = crearTransferenciaDto.detalles ?? [];
    const { detalles: _, ...datos } = crearTransferenciaDto;

    const usuarioId = (crearTransferenciaDto as any).usuarioId;
    if (!usuarioId) {
      throw new BadRequestException('Usuario requerido para crear la transferencia');
    }

    const motelId = datos.motelId;
    if (!motelId) {
      throw new BadRequestException('Indicá un motel activo');
    }

    return this.prisma.$transaction(async (tx) => {
      const depositoOrigen = await tx.deposito.findFirst({
        where: {
          id: datos.depositoOrigenId,
          motelId,
          deletedAt: null,
        },
      });

      if (!depositoOrigen) {
        throw new NotFoundException(
          'Depósito origen no encontrado para este motel',
        );
      }

      const depositoDestino = await tx.deposito.findFirst({
        where: {
          id: datos.depositoDestinoId,
          motelId,
          deletedAt: null,
        },
      });

      if (!depositoDestino) {
        throw new NotFoundException(
          'Depósito destino no encontrado para este motel',
        );
      }

      if (depositoOrigen.id === depositoDestino.id) {
        throw new BadRequestException(
          'El depósito origen y destino no pueden ser el mismo',
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

        if (!detalle.cantidad || Number(detalle.cantidad) <= 0) {
          throw new BadRequestException(
            `Cantidad inválida para producto ${detalle.productoId}`,
          );
        }
      }

      const transferencia = await tx.transferencia.create({
        data: {
          Fecha: new Date(datos.fecha),
          Observacion: datos.observacion,
          Finalizada: false,
          motelId,
          depositoOrigenId: datos.depositoOrigenId,
          depositoDestinoId: datos.depositoDestinoId,
          usuarioId,
          ...(detalles.length > 0
            ? {
                detalles: {
                  create: detalles.map((d) => ({
                    Cantidad: d.cantidad,
                    productoId: d.productoId,
                    motelId,
                  })),
                },
              }
            : {}),
        },
        include: {
          detalles: true,
        },
      });

      return transferencia;
    });
  }

  async confirmar(id: string, scopedMotelId: string | null | undefined) {
    if (!scopedMotelId) {
      throw new BadRequestException(
        'Indicá un motel activo para confirmar la transferencia',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const transferencia = await tx.transferencia.findFirst({
        where: {
          id,
          motelId: scopedMotelId,
          deletedAt: null,
        },
        include: {
          detalles: true,
        },
      });

      if (!transferencia) {
        throw new NotFoundException('Transferencia no encontrada');
      }

      if (transferencia.Finalizada) {
        throw new BadRequestException('La transferencia ya fue confirmada');
      }

      if (!transferencia.detalles?.length) {
        throw new BadRequestException('La transferencia no tiene ítems');
      }

      const depositoOrigen = await tx.deposito.findFirst({
        where: {
          id: transferencia.depositoOrigenId,
          motelId: scopedMotelId,
          deletedAt: null,
        },
      });

      const depositoDestino = await tx.deposito.findFirst({
        where: {
          id: transferencia.depositoDestinoId,
          motelId: scopedMotelId,
          deletedAt: null,
        },
      });

      if (!depositoOrigen || !depositoDestino) {
        throw new NotFoundException('Depósitos inválidos para esta transferencia');
      }

      if (depositoOrigen.id === depositoDestino.id) {
        throw new BadRequestException(
          'El depósito origen y destino no pueden ser el mismo',
        );
      }

      for (const detalle of transferencia.detalles) {
        const producto = await tx.producto.findFirst({
          where: {
            id: detalle.productoId,
            motelId: scopedMotelId,
            deletedAt: null,
          },
        });

        if (!producto) {
          throw new NotFoundException(
            `Producto inválido para este motel: ${detalle.productoId}`,
          );
        }

        const qty = detalle.Cantidad ?? (detalle as any).cantidad;
        if (!qty || Number(qty) <= 0) {
          throw new BadRequestException(
            `Cantidad inválida para producto ${detalle.productoId}`,
          );
        }

        const stockOrigen = await tx.stock.findFirst({
          where: {
            motelId: scopedMotelId,
            depositoId: depositoOrigen.id,
            productoId: detalle.productoId,
            deletedAt: null,
          },
        });

        const cantidadActual = stockOrigen
          ? Number(stockOrigen.Cantidad)
          : 0;
        const cantidadSolicitada = Number(qty);

        if (cantidadActual < cantidadSolicitada) {
          throw new BadRequestException(
            `Stock insuficiente para producto ${detalle.productoId} en depósito origen`,
          );
        }
      }

      for (const detalle of transferencia.detalles) {
        const qty = detalle.Cantidad ?? (detalle as any).cantidad;
        await this.stockService.transferirStock(
          tx,
          scopedMotelId,
          detalle.productoId,
          depositoOrigen.id,
          depositoDestino.id,
          qty,
        );
      }

      return tx.transferencia.update({
        where: { id: transferencia.id },
        data: { Finalizada: true },
      });
    });
  }

  override async actualizar(
    id: string,
    data: any,
    scopedMotelId?: string | null,
  ) {
    const existing = await this.obtenerUno(id, undefined, {}, scopedMotelId);
    if (!existing) {
      throw new NotFoundException('Transferencia no encontrada');
    }

    const wantsFinalize =
      data.Finalizada === true || data.finalizada === true;

    if (existing.Finalizada) {
      const keys = Object.keys(data || {});
      const blocked = keys.some((k) =>
        [
          'depositoOrigenId',
          'depositoDestinoId',
          'Finalizada',
          'finalizada',
        ].includes(k),
      );
      if (blocked) {
        throw new BadRequestException(
          'No se puede modificar una transferencia confirmada',
        );
      }
      return super.actualizar(id, data, scopedMotelId);
    }

    if (wantsFinalize) {
      const { Finalizada, finalizada, ...rest } = data;
      if (Object.keys(rest).length > 0) {
        await super.actualizar(id, rest, scopedMotelId);
      }
      return this.confirmar(id, scopedMotelId ?? undefined);
    }

    return super.actualizar(id, data, scopedMotelId);
  }

  async obtenerTodos(options: any, extraWhere: any = {}) {
    const { include, ...rest } = options;
    return super.obtenerTodos(
      {
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
      extraWhere,
      scopedMotelId,
    );
  }
}
