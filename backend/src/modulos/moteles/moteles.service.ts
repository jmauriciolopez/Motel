import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseService } from '../../compartido/bases/base.service';
import { Motel } from '@prisma/client';
import { CrearMotelDto } from './dto/crear-motel.dto';
import { ActualizarMotelDto } from './dto/actualizar-motel.dto';

@Injectable()
export class MotelesService extends BaseService<Motel> {
  constructor(prisma: PrismaService) {
    super(prisma, 'motel');
  }

  async crear(crearMotelDto: CrearMotelDto) {
    const { userIds, ...rest } = crearMotelDto;

    return this.prisma.motel.create({
      data: {
        Nombre: rest.Nombre,
        Direccion: rest.Direccion,
        Telefono: rest.Telefono,
        HorarioUnico: rest.HorarioUnico ?? true,
        InicioDia: rest.InicioDia,
        InicioNoche: rest.InicioNoche,
        CheckOutDia: rest.CheckOutDia,
        Tolerancia: rest.Tolerancia ?? 15,
        MaxHrAdicional: rest.MaxHrAdicional ?? 2,
        DuracionDiaria: rest.DuracionDiaria ?? 2,
        DuracionNocturna: rest.DuracionNocturna ?? 2,
        HoraCierreCaja: rest.HoraCierreCaja,
        propietarioId: rest.propietarioId,
        ...(userIds && userIds.length > 0 && {
          usuarios: {
            create: userIds.map((id) => ({ usuarioId: id })),
          },
        }),
      },
      include: {
        propietario: true,
        usuarios: true
      }
    });
  }

  // Los métodos obtenerTodos, obtenerUno, actualizar y eliminar 
  // ahora son heredados de BaseService con soporte para paginación.
}
