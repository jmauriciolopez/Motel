import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseService } from '../../compartido/bases/base.service';
import { Habitacion } from '@prisma/client';
import { CrearHabitacionDto } from './dto/crear-habitacion.dto';

@Injectable()
export class HabitacionesService extends BaseService<Habitacion> {
  constructor(prisma: PrismaService) {
    super(prisma, 'habitacion', { hasMotelId: true });
  }

  async crear(crearHabitacionDto: CrearHabitacionDto) {
    const data = { ...crearHabitacionDto };

    // Mapear estados del frontend a los del enum de NestJS
    if (data.Estado === 'Libre') {
      data.Estado = 'DISPONIBLE' as any;
    } else if (typeof data.Estado === 'string') {
      data.Estado = data.Estado.toUpperCase() as any;
    }

    return this.prisma.habitacion.create({
      data,
    });
  }

  async obtenerTodos(options: any, extraWhere: any = {}) {
    const { include, ...rest } = options;
    return super.obtenerTodos({
      ...rest,
      include: {
        tarifa: true,
        motel: true,
        ...(include || {}),
      },
    }, extraWhere);
  }

  async obtenerUno(id: string, include?: any, extraWhere: any = {}) {
    return super.obtenerUno(id, {
      tarifa: true,
      motel: true,
      ...(include || {}),
    }, extraWhere);
  }
}
