import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseService } from '../../compartido/bases/base.service';
import { Rubro } from '@prisma/client';

@Injectable()
export class RubrosService extends BaseService<Rubro> {
  constructor(prisma: PrismaService) {
    super(prisma, 'rubro');
  }

  async obtenerTodos(options: any) {
    const { motelId, ...rest } = options;

    // Siempre incluir maestros globales + los del motel si se provee
    const extraWhere = motelId
      ? { OR: [{ motelId }, { EsMaestro: true, motelId: null }] }
      : { OR: [{ EsMaestro: true }, { motelId: { not: null } }] };

    return super.obtenerTodos({ ...rest }, extraWhere);
  }

  async obtenerUno(id: string) {
    return super.obtenerUno(id, { motel: true });
  }

  async actualizar(id: string, data: any): Promise<Rubro> {
    const rubro = await this.prisma.rubro.findUnique({ where: { id } });
    if (rubro?.EsMaestro) {
      throw new ForbiddenException('Los rubros maestros no pueden ser modificados');
    }
    return super.actualizar(id, data);
  }

  async eliminar(id: string): Promise<Rubro> {
    const rubro = await this.prisma.rubro.findUnique({ where: { id } });
    if (rubro?.EsMaestro) {
      throw new ForbiddenException('Los rubros maestros no pueden ser eliminados');
    }
    return super.eliminar(id);
  }
}
