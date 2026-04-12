import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseService } from '../../compartido/bases/base.service';
import { Cliente } from '@prisma/client';

@Injectable()
export class ClientesService extends BaseService<Cliente> {
  constructor(prisma: PrismaService) {
    super(prisma, 'cliente', { hasMotelId: true });
  }

  async buscarPorPatente(patente: string, motelId: string) {
    return this.prisma.cliente.findFirst({
      where: {
        Patente: {
          contains: patente,
          mode: 'insensitive',
        },
        motelId,
        deletedAt: null,
      },
      include: {
        movilidad: true,
      },
    });
  }

  async obtenerTodos(options: any, extraWhere: any = {}) {
    const { include, ...rest } = options;
    return super.obtenerTodos({
      ...rest,
      include: {
        movilidad: true,
        ...(include || {}),
      },
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
        movilidad: true,
        ...(include || {}),
      },
      extraWhere,
      scopedMotelId,
    );
  }
}
