import { Injectable } from '@nestjs/common';
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
    // Si no viene habitacionId, lo resolvemos desde el turno
    let habitacionId = crearLimpiezaDto.habitacionId;
    if (!habitacionId && crearLimpiezaDto.turnoId) {
      const turno = await this.prisma.turno.findUnique({
        where: { id: crearLimpiezaDto.turnoId },
        select: { habitacionId: true },
      });
      habitacionId = turno?.habitacionId ?? '';
    }

    const limpieza = await this.prisma.limpieza.upsert({
      where: { turnoId: crearLimpiezaDto.turnoId },
      create: {
        ...crearLimpiezaDto,
        habitacionId,
        Cuando: new Date(crearLimpiezaDto.Cuando),
        Finalizado: crearLimpiezaDto.Finalizado === true,
      },
      update: {
        Cuando: new Date(crearLimpiezaDto.Cuando),
        Observacion: crearLimpiezaDto.Observacion,
        usuarioId: crearLimpiezaDto.usuarioId,
      },
    });

    // Liberar habitación al crear la limpieza
    if (habitacionId) {
      await this.prisma.habitacion.update({
        where: { id: habitacionId },
        data: { Estado: EstadoHabitacion.DISPONIBLE },
      });
    }

    return limpieza;
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
