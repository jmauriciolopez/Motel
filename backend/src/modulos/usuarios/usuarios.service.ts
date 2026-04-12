import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseService } from '../../compartido/bases/base.service';
import { Usuario, RolUsuario } from '@prisma/client';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsuariosService extends BaseService<Usuario> {
  constructor(prisma: PrismaService) {
    super(prisma, 'usuario');
  }

  async crear(crearUsuarioDto: CrearUsuarioDto) {
    const { Password, Rol, motelId, ...datosRestantes } = crearUsuarioDto;
    
    // Hashear password automáticamente
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(Password, salt);

    // Normalizar rol (debe ser uno de los valores del enum)
    const rolNormalizado = (Rol?.toUpperCase() as RolUsuario) || RolUsuario.RECEPCIONISTA;

    return this.prisma.usuario.create({
      data: {
        ...datosRestantes,
        PasswordHash: passwordHash,
        Rol: rolNormalizado,
        // Vincular al motel si se proporciona
        ...(motelId && {
          moteles: {
            create: {
              motelId: motelId,
            },
          },
        }),
      },
      include: {
        moteles: {
          include: {
            motel: true
          }
        }
      }
    });
  }

  async obtenerTodos(options: any, extraWhere: any = {}) {
    const { include, ...rest } = options;
    return super.obtenerTodos({
      ...rest,
      include: {
        propietario: true,
        moteles: {
          include: {
            motel: true,
          },
        },
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
        propietario: true,
        moteles: {
          include: {
            motel: true,
          },
        },
        ...(include || {}),
      },
      extraWhere,
      scopedMotelId,
    );
  }

  async actualizar(
    id: string,
    actualizarUsuarioDto: ActualizarUsuarioDto,
    _scopedMotelId?: string | null,
  ) {
    const { Password, Rol, ...datosRestantes } = actualizarUsuarioDto;
    
    const data: any = { ...datosRestantes };

    if (Password) {
      const salt = await bcrypt.genSalt(10);
      data.PasswordHash = await bcrypt.hash(Password, salt);
    }

    if (Rol) {
      data.Rol = Rol as RolUsuario;
    }

    return this.prisma.usuario.update({
      where: { id },
      data,
    });
  }

  async obtenerPorEmail(email: string) {
    return this.prisma.usuario.findUnique({
      where: { Email: email },
      include: {
        moteles: {
          include: {
            motel: true,
          },
        },
      },
    });
  }

  async obtenerPorIdentificador(identificador: string) {
    return this.prisma.usuario.findFirst({
      where: {
        OR: [
          { Email: identificador },
          { Username: identificador },
        ],
      },
      include: {
        moteles: {
          include: {
            motel: true,
          },
        },
      },
    });
  }

  async obtenerMe(id: string) {
    return this.prisma.usuario.findUnique({
      where: { id },
      include: {
        propietario: true,
        moteles: {
          include: {
            motel: true,
          },
        },
      },
    });
  }

  async obtenerPorMotel(motelId: string, excluirUsuarioId?: string) {
    return this.prisma.usuario.findMany({
      where: {
        ...(excluirUsuarioId ? { id: { not: excluirUsuarioId } } : {}),
        moteles: {
          some: { motelId },
        },
      },
      include: {
        moteles: {
          include: {
            motel: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async desvincularDeMoteles(id: string) {
    await this.prisma.motelUsuario.deleteMany({
      where: { usuarioId: id },
    });

    return this.obtenerMe(id);
  }
}
