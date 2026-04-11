import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseService } from '../../compartido/bases/base.service';
import { Reserva } from '@prisma/client';

@Injectable()
export class ReservasService extends BaseService<Reserva> {
  constructor(prisma: PrismaService) {
    super(prisma, 'reserva', { hasMotelId: true });
  }

  async obtenerTodos(options: any) {
    return super.obtenerTodos({
      ...options,
      include: {
        habitacion: true,
        cliente: true,
      },
    });
  }

  async obtenerUno(id: string) {
    return super.obtenerUno(id, {
      habitacion: true,
      cliente: true,
    });
  }
}
