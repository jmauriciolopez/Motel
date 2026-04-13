import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseService } from '../../compartido/bases/base.service';
import { Proveedor } from '@prisma/client';

@Injectable()
export class ProveedoresService extends BaseService<Proveedor> {
  constructor(prisma: PrismaService) {
    super(prisma, 'proveedor', { hasMotelId: true });
  }

  async obtenerTodos(options: any, extraWhere: any = {}) {
    const { include, ...rest } = options;
    return super.obtenerTodos({
      ...rest,
      include: {
        rubro: true,
        motel: true,
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
        rubro: true,
        motel: true,
        ...(include || {}),
      },
      extraWhere,
      scopedMotelId,
    );
  }
}
