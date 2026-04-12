import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseService } from '../../compartido/bases/base.service';
import { Limpieza, EstadoHabitacion } from '@prisma/client';
import { CrearLimpiezaDto } from './dto/crear-limpieza.dto';

@Injectable()
export class LimpiezasService extends BaseService<Limpieza> {
  constructor(prisma: PrismaService) {
    super(prisma, 'limpieza', { hasMotelId: true });
  }

  async crear(crearLimpiezaDto: CrearLimpiezaDto) {
    return this.prisma.limpieza.create({
      data: {
        ...crearLimpiezaDto,
        Cuando: new Date(crearLimpiezaDto.Cuando),
      },
    });
  }

  async finalizar(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const limpieza = await tx.limpieza.findUnique({
        where: { id },
      });

      if (!limpieza) throw new NotFoundException('Limpieza no encontrada');

      // 1. Finalizar limpieza
      const limpiezaActualizada = await tx.limpieza.update({
        where: { id },
        data: { Finalizado: true },
      });

      // 2. Liberar habitación
      await tx.habitacion.update({
        where: { id: limpieza.habitacionId },
        data: { Estado: EstadoHabitacion.DISPONIBLE },
      });

      return limpiezaActualizada;
    });
  }

  async obtenerTodos(options: any, extraWhere: any = {}) {
    const { include, ...rest } = options;
    return super.obtenerTodos({
      ...rest,
      include: {
        habitacion: true,
        turno: true,
        usuario: {
          select: {
            Username: true,
          },
        },
        ...(include || {}),
      },
      orderBy: {
        Cuando: 'desc',
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
        habitacion: true,
        turno: true,
        usuario: {
          select: {
            Username: true,
          },
        },
        ...(include || {}),
      },
      extraWhere,
      scopedMotelId,
    );
  }
}
