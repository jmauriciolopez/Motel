import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
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

  override async crear(crearCompraDto: CrearCompraDto) {
    const { detalles = [], ...datosCompra } = crearCompraDto;
    const usuarioId = datosCompra.usuarioId;
    if (!usuarioId) {
      throw new BadRequestException('Usuario requerido para crear la compra');
    }
    const motelId = datosCompra.motelId;
    if (!motelId) {
      throw new BadRequestException('Indicá un motel activo');
    }

    return this.prisma.$transaction(async (tx) => {
      const depositoCompra = await tx.deposito.findFirst({
        where: {
          id: datosCompra.depositoId,
          motelId,
          deletedAt: null,
        },
      });

      if (!depositoCompra) {
        throw new NotFoundException(
          'Depósito de compra no encontrado para este motel',
        );
      }

      const depositoPrincipal = await tx.deposito.findFirst({
        where: {
          motelId,
          EsPrincipal: true,
          deletedAt: null,
        },
      });

      if (!depositoPrincipal) {
        throw new NotFoundException(
          'No existe depósito principal para este motel',
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

      const compra = await tx.compra.create({
        data: {
          Fecha: new Date(datosCompra.fecha),
          Total: datosCompra.total ?? 0,
          Finalizada: datosCompra.finalizada ?? false,
          depositoId: datosCompra.depositoId,
          motelId,
          usuarioId,
          ...(datosCompra.proveedorId
            ? { proveedorId: datosCompra.proveedorId }
            : {}),
          detalles: {
            create: detalles.map((d) => ({
              Cantidad: d.cantidad,
              Precio: d.precio,
              Importe: d.importe,
              productoId: d.productoId,
              motelId,
            })),
          },
        },
        include: { detalles: true },
      });

      if (compra.Finalizada && detalles.length > 0) {
        for (const detalle of detalles) {
          await this.stockService.ajustarStock(
            tx,
            motelId,
            detalle.productoId,
            depositoPrincipal.id,
            detalle.cantidad,
          );
        }
      }

      return compra;
    });
  }

  override async actualizar(
    id: string,
    data: any,
    scopedMotelId?: string | null,
  ) {
    const existing = await this.obtenerUno(id, undefined, {}, scopedMotelId);
    if (!existing) {
      throw new NotFoundException('Compra no encontrada');
    }

    const becomingFinal =
      data.Finalizada === true || data.finalizada === true;
    if (!becomingFinal || existing.Finalizada) {
      return super.actualizar(id, data, scopedMotelId);
    }

    const motelId = existing.motelId;
    const detalles = (existing as any).detalles ?? [];

    return this.prisma.$transaction(async (tx) => {
      const depositoPrincipal = await tx.deposito.findFirst({
        where: {
          motelId,
          EsPrincipal: true,
          deletedAt: null,
        },
      });

      if (!depositoPrincipal) {
        throw new NotFoundException(
          'No existe depósito principal para este motel',
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

      const updated = await tx.compra.update({
        where: { id: existing.id },
        data,
      });

      for (const detalle of detalles) {
        const qty = detalle.Cantidad ?? detalle.cantidad;
        await this.stockService.ajustarStock(
          tx,
          motelId,
          detalle.productoId,
          depositoPrincipal.id,
          qty,
        );
      }

      return updated;
    });
  }

  async agregarDetalle(compraId: string, body: any, motelId: string) {
    const compra = await this.prisma.compra.findFirst({
      where: { id: compraId, motelId, deletedAt: null },
    });
    if (!compra) throw new NotFoundException('Compra no encontrada');

    const cantidad = Number(body.Cantidad ?? body.cantidad);
    const precio = Number(body.Precio ?? body.precio);
    const importe = Number(body.Importe ?? body.importe ?? cantidad * precio);
    const productoId = body.productoId;

    const detalle = await this.prisma.compraDetalle.create({
      data: { Cantidad: cantidad, Precio: precio, Importe: importe, productoId, compraId, motelId },
      include: { producto: true },
    });

    // Recalcular total de la compra
    const agg = await this.prisma.compraDetalle.aggregate({
      where: { compraId, deletedAt: null },
      _sum: { Importe: true },
    });
    await this.prisma.compra.update({
      where: { id: compraId },
      data: { Total: agg._sum.Importe ?? 0 },
    });

    return detalle;
  }

  async actualizarDetalle(compraId: string, detalleId: string, body: any, motelId: string) {
    const detalle = await this.prisma.compraDetalle.findFirst({
      where: { id: detalleId, compraId, motelId, deletedAt: null },
    });
    if (!detalle) throw new NotFoundException('Detalle no encontrado');

    const cantidad = body.Cantidad !== undefined ? Number(body.Cantidad) : Number(detalle.Cantidad);
    const precio = body.Precio !== undefined ? Number(body.Precio) : Number(detalle.Precio);
    const importe = cantidad * precio;

    const updated = await this.prisma.compraDetalle.update({
      where: { id: detalleId },
      data: { Cantidad: cantidad, Precio: precio, Importe: importe },
      include: { producto: true },
    });

    const agg = await this.prisma.compraDetalle.aggregate({
      where: { compraId, deletedAt: null },
      _sum: { Importe: true },
    });
    await this.prisma.compra.update({
      where: { id: compraId },
      data: { Total: agg._sum.Importe ?? 0 },
    });

    return updated;
  }

  async eliminarDetalle(compraId: string, detalleId: string, motelId: string) {
    const detalle = await this.prisma.compraDetalle.findFirst({
      where: { id: detalleId, compraId, motelId, deletedAt: null },
    });
    if (!detalle) throw new NotFoundException('Detalle no encontrado');

    const deleted = await this.prisma.compraDetalle.update({
      where: { id: detalleId },
      data: { deletedAt: new Date() },
    });

    const agg = await this.prisma.compraDetalle.aggregate({
      where: { compraId, deletedAt: null },
      _sum: { Importe: true },
    });
    await this.prisma.compra.update({
      where: { id: compraId },
      data: { Total: agg._sum.Importe ?? 0 },
    });

    return deleted;
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
}
