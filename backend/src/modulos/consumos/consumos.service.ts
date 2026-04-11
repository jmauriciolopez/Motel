import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseService } from '../../compartido/bases/base.service';
import { Consumo } from '@prisma/client';

@Injectable()
export class ConsumosService extends BaseService<Consumo> {
  constructor(prisma: PrismaService) {
    super(prisma, 'consumo', { hasMotelId: true });
  }

  async obtenerTodos(options: any, extraWhere: any = {}) {
    const { include, ...rest } = options;
    return super.obtenerTodos({
      ...rest,
      include: {
        producto: true,
        turno: {
          include: { habitacion: true },
        },
        ...(include || {}),
      },
    }, extraWhere);
  }

  async obtenerUno(id: string, include?: any, extraWhere: any = {}) {
    return super.obtenerUno(id, {
      producto: true,
      turno: true,
      ...(include || {}),
    }, extraWhere);
  }
}
