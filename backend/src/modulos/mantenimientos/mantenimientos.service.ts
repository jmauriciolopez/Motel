import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseService } from '../../compartido/bases/base.service';
import { Mantenimiento, EstadoHabitacion } from '@prisma/client';
import { CrearMantenimientoDto } from './dto/crear-mantenimiento.dto';

@Injectable()
export class MantenimientosService extends BaseService<Mantenimiento> {
  constructor(prisma: PrismaService) {
    super(prisma, 'mantenimiento', { hasMotelId: true });
  }

  async crear(crearMantenimientoDto: CrearMantenimientoDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Crear mantenimiento
      const mantenimiento = await tx.mantenimiento.create({
        data: {
          Cuando: new Date(crearMantenimientoDto.cuando),
          Observacion: crearMantenimientoDto.observacion,
          Finalizado: crearMantenimientoDto.finalizado || false,
          habitacionId: crearMantenimientoDto.habitacionId,
          proveedorId: crearMantenimientoDto.proveedorId,
          usuarioId: crearMantenimientoDto.usuarioId,
          motelId: crearMantenimientoDto.motelId,
        },
      });

      // 2. Cambiar habitación a MANTENIMIENTO
      await tx.habitacion.update({
        where: { id: crearMantenimientoDto.habitacionId },
        data: { Estado: EstadoHabitacion.MANTENIMIENTO },
      });

      return mantenimiento;
    });
  }

  async finalizar(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const mantenimiento = await tx.mantenimiento.findUnique({
        where: { id },
      });

      if (!mantenimiento) throw new NotFoundException('Mantenimiento no encontrado');

      // 1. Marcar como finalizado
      const actualizado = await tx.mantenimiento.update({
        where: { id },
        data: { Finalizado: true },
      });

      // 2. Liberar habitación
      await tx.habitacion.update({
        where: { id: mantenimiento.habitacionId },
        data: { Estado: EstadoHabitacion.DISPONIBLE },
      });

      return actualizado;
    });
  }

  async obtenerTodos(options: any, extraWhere: any = {}) {
    const { include, ...rest } = options;
    return super.obtenerTodos({
      ...rest,
      include: {
        habitacion: true,
        usuario: {
          select: { Username: true },
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
        usuario: {
          select: { Username: true },
        },
        ...(include || {}),
      },
      extraWhere,
      scopedMotelId,
    );
  }
}
