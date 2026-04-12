import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseService } from '../../compartido/bases/base.service';
import { Propietario } from '@prisma/client';
import { CrearPropietarioDto } from './dto/crear-propietario.dto';
import { ActualizarPropietarioDto } from './dto/actualizar-propietario.dto';

@Injectable()
export class PropietariosService extends BaseService<Propietario> {
  constructor(prisma: PrismaService) {
    super(prisma, 'propietario');
  }

  async crear(crearPropietarioDto: CrearPropietarioDto): Promise<Propietario> {
    const { userId, motelIds, FormaPago, ...datosRestantes } = crearPropietarioDto;

    // Verificar si ya existe por email (idempotencia para onboarding)
    if (datosRestantes.Email) {
      const existente = await this.prisma.propietario.findUnique({
        where: { Email: datosRestantes.Email },
        include: { moteles: true },
      });
      if (existente) return existente;
    }

    return this.prisma.propietario.create({
      data: {
        ...datosRestantes,
        FormaPago: FormaPago || 'EFECTIVO',
        ...(userId && {
          usuarios: {
            connect: { id: userId },
          },
        }),
        ...(motelIds && motelIds.length > 0 && {
          moteles: {
            connect: motelIds.map((id) => ({ id })),
          },
        }),
      },
    });
  }

  async actualizar(
    id: string,
    actualizarPropietarioDto: ActualizarPropietarioDto,
    _scopedMotelId?: string | null,
  ): Promise<Propietario> {
    const { userId, motelIds, ...datosRestantes } = actualizarPropietarioDto;

    return this.prisma.propietario.update({
      where: { id },
      data: {
        ...datosRestantes,
        ...(userId && {
          usuarios: { set: [{ id: userId }] },
        }),
        ...(motelIds && {
          moteles: { set: motelIds.map((id) => ({ id })) },
        }),
      },
    });
  }
}
