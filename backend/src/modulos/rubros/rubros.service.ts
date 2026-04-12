import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseService } from '../../compartido/bases/base.service';
import { Rubro } from '@prisma/client';

@Injectable()
export class RubrosService extends BaseService<Rubro> {
  constructor(prisma: PrismaService) {
    super(prisma, 'rubro', { hasMotelId: false });
  }

  async obtenerTodos(options: any) {
    const { motelId, ...rest } = options;

    // Siempre incluir maestros globales + los del motel si se provee
    const extraWhere = motelId
      ? { OR: [{ motelId }, { EsMaestro: true, motelId: null }] }
      : { OR: [{ EsMaestro: true }, { motelId: { not: null } }] };

    return super.obtenerTodos({ ...rest }, extraWhere);
  }

  async obtenerUno(
    id: string,
    _include?: unknown,
    extraWhere: any = {},
    scopedMotelId?: string | null,
  ) {
    return super.obtenerUno(id, { motel: true }, extraWhere, scopedMotelId);
  }

  async actualizar(
    id: string,
    data: any,
    scopedMotelId?: string | null,
  ): Promise<Rubro> {
    const rubro = await this.prisma.rubro.findUnique({ where: { id } });
    if (rubro?.EsMaestro) {
      throw new ForbiddenException('Los rubros maestros no pueden ser modificados');
    }
    return super.actualizar(id, data, scopedMotelId);
  }

  async eliminar(id: string, scopedMotelId?: string | null): Promise<Rubro> {
    const rubro = await this.prisma.rubro.findUnique({ where: { id } });
    if (rubro?.EsMaestro) {
      throw new ForbiddenException('Los rubros maestros no pueden ser eliminados');
    }
    return super.eliminar(id, scopedMotelId);
  }
}
