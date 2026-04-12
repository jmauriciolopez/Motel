import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseService } from '../../compartido/bases/base.service';
import { Deposito } from '@prisma/client';

@Injectable()
export class DepositosService extends BaseService<Deposito> {
  constructor(prisma: PrismaService) {
    super(prisma, 'deposito', { hasMotelId: true });
  }
  async obtenerTodos(options: any, extraWhere: any = {}) {
    const { include, ...rest } = options;
    return super.obtenerTodos({
      ...rest,
      include: {
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
        motel: true,
        ...(include || {}),
      },
      extraWhere,
      scopedMotelId,
    );
  }
}
