import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { BaseController } from '../../compartido/bases/base.controller';
import { Usuario } from '@prisma/client';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { JwtAuthGuard } from '../autenticacion/guards/jwt-auth.guard';
import { UsuarioActual } from '../autenticacion/decoradores/usuario-actual.decorador';

@Controller('usuarios')
export class UsuariosController extends BaseController<Usuario, CrearUsuarioDto, ActualizarUsuarioDto> {
  constructor(private readonly usuariosService: UsuariosService) {
    super(usuariosService);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  obtenerMe(@UsuarioActual() usuario: any) {
    return this.usuariosService.obtenerMe(usuario.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('por-motel')
  obtenerPorMotel(
    @Query('motelId') motelId: string,
    @Query('excluirUsuarioId') excluirUsuarioId?: string,
  ) {
    return this.usuariosService.obtenerPorMotel(motelId, excluirUsuarioId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/desvincular-moteles')
  desvincularDeMoteles(@Param('id') id: string) {
    return this.usuariosService.desvincularDeMoteles(id);
  }
}
