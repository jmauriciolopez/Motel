import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { InicioSesionDto } from './dto/inicio-sesion.dto';
import { RegistroDto } from './dto/registro.dto';

@Injectable()
export class AutenticacionService {
  constructor(
    private usuariosService: UsuariosService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) { }

  async validarUsuario(inicioSesionDto: InicioSesionDto) {
    const { identificador, password } = inicioSesionDto;
    const usuario = await this.usuariosService.obtenerPorIdentificador(identificador);

    if (usuario && (await bcrypt.compare(password, usuario.PasswordHash))) {
      const { PasswordHash, ...resultado } = usuario;
      return resultado;
    }

    throw new UnauthorizedException('Credenciales inválidas');
  }

  async login(usuario: any) {
    const esSuperAdmin = usuario.Rol === 'SUPERADMIN';
    const esPropietario = !!usuario.propietarioId;

    let motelesParaToken: string[];
    let motelesParaRespuesta: { motelId: string; nombre: string }[];

    if (esSuperAdmin) {
      // SuperAdmin ve todos los moteles del sistema
      const todosLosMoteles = await this.prisma.motel.findMany({
        where: { deletedAt: null },
        select: { id: true, Nombre: true, OnboardingCompleto: true },
        orderBy: { Nombre: 'asc' },
      });
      motelesParaToken = todosLosMoteles.map((m: any) => m.id);
      motelesParaRespuesta = todosLosMoteles.map((m: any) => ({
        motelId: m.id,
        nombre: m.Nombre,
        OnboardingCompleto: m.OnboardingCompleto,
      }));
    } else if (esPropietario) {
      // Propietario ve todos los moteles de su propietario
      const motelesDelPropietario = await this.prisma.motel.findMany({
        where: { propietarioId: usuario.propietarioId, deletedAt: null },
        select: { id: true, Nombre: true, OnboardingCompleto: true },
        orderBy: { Nombre: 'asc' },
      });
      motelesParaToken = motelesDelPropietario.map((m: any) => m.id);
      motelesParaRespuesta = motelesDelPropietario.map((m: any) => ({
        motelId: m.id,
        nombre: m.Nombre,
        OnboardingCompleto: m.OnboardingCompleto,
      }));
    } else {
      // Usuario normal: solo los moteles asignados via MotelUsuario
      motelesParaToken = (usuario.moteles || []).map((mu: any) => mu.motelId);
      motelesParaRespuesta = (usuario.moteles || []).map((mu: any) => ({
        motelId: mu.motelId,
        nombre: mu.motel?.Nombre,
        OnboardingCompleto: mu.motel?.OnboardingCompleto,
      }));
    }

    const payload = {
      sub: usuario.id,
      email: usuario.Email,
      rol: usuario.Rol,
      propietarioId: usuario.propietarioId,
      moteles: motelesParaToken,
      motelId: motelesParaToken[0] ?? null,  // motel activo por defecto
    };

    return {
      token: this.jwtService.sign(payload),
      usuario: {
        id: usuario.id,
        Email: usuario.Email,
        Username: usuario.Username,
        Rol: usuario.Rol,
        moteles: motelesParaRespuesta,
      },
    };
  }

  async registro(registroDto: RegistroDto) {
    // Los registros públicos siempre son ADMINISTRADOR por defecto
    const usuario = await this.usuariosService.crear({
      Username: registroDto.username,
      Email: registroDto.email,
      Password: registroDto.password,
      Rol: 'ADMINISTRADOR',
    });

    return this.login(usuario);
  }

  async refrescarToken(usuarioId: string) {
    const usuario = await this.usuariosService.obtenerUno(usuarioId, {
      moteles: { include: { motel: true } },
    });

    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return this.login(usuario);
  }
}
