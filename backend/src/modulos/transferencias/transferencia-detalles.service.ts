import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TransferenciaDetalle } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseService } from '../../compartido/bases/base.service';

@Injectable()
export class TransferenciaDetallesService extends BaseService<TransferenciaDetalle> {
  constructor(prisma: PrismaService) {
    super(prisma, 'transferenciaDetalle', { hasMotelId: true });
  }

  private async assertTransferenciaEditable(
    transferenciaId: string,
    motelId: string,
  ) {
    const t = await this.prisma.transferencia.findFirst({
      where: { id: transferenciaId, motelId, deletedAt: null },
    });
    if (!t) {
      throw new NotFoundException('Transferencia no encontrada');
    }
    if (t.Finalizada) {
      throw new BadRequestException(
        'No se pueden modificar ítems de una transferencia confirmada',
      );
    }
  }

  override async crear(data: any): Promise<TransferenciaDetalle> {
    const motelId = data.motelId;
    const transferenciaId = data.transferenciaId;
    const cantidad = data.cantidad ?? data.Cantidad;

    await this.assertTransferenciaEditable(transferenciaId, motelId);

    if (!cantidad || Number(cantidad) <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor a cero');
    }

    const producto = await this.prisma.producto.findFirst({
      where: { id: data.productoId, motelId, deletedAt: null },
    });
    if (!producto) {
      throw new NotFoundException('Producto no encontrado para este motel');
    }

    return this.model.create({
      data: {
        transferenciaId,
        productoId: data.productoId,
        motelId,
        Cantidad: Number(cantidad),
      },
    });
  }

  override async actualizar(
    id: string,
    data: any,
    scopedMotelId?: string | null,
  ): Promise<TransferenciaDetalle> {
    const existing = await this.obtenerUno(
      id,
      { transferencia: true },
      {},
      scopedMotelId,
    );
    if (!existing) {
      throw new NotFoundException('Detalle no encontrado');
    }
    const tr = (existing as any).transferencia;
    if (tr?.Finalizada) {
      throw new BadRequestException(
        'No se puede editar un ítem de transferencia confirmada',
      );
    }

    if (data.cantidad != null && Number(data.cantidad) <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor a cero');
    }
    if (data.Cantidad != null && Number(data.Cantidad) <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor a cero');
    }

    return super.actualizar(id, data, scopedMotelId);
  }

  override async eliminar(
    id: string,
    scopedMotelId?: string | null,
  ): Promise<TransferenciaDetalle> {
    const existing = await this.obtenerUno(
      id,
      { transferencia: true },
      {},
      scopedMotelId,
    );
    if (!existing) {
      throw new NotFoundException('Detalle no encontrado');
    }
    if ((existing as any).transferencia?.Finalizada) {
      throw new BadRequestException(
        'No se puede eliminar un ítem de transferencia confirmada',
      );
    }
    return super.eliminar(id, scopedMotelId);
  }

  async obtenerTodos(options: any, extraWhere: any = {}) {
    const { include, ...rest } = options;
    return super.obtenerTodos(
      {
        ...rest,
        include: {
          producto: true,
          transferencia: {
            select: {
              id: true,
              Finalizada: true,
              depositoOrigenId: true,
              depositoDestinoId: true,
            },
          },
          ...(include || {}),
        },
        orderBy: { createdAt: 'desc' },
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
        transferencia: {
          select: {
            id: true,
            Finalizada: true,
            depositoOrigenId: true,
            depositoDestinoId: true,
          },
        },
        ...(include || {}),
      },
      extraWhere,
      scopedMotelId,
    );
  }
}
