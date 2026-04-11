import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AutenticacionService } from './autenticacion.service';
import { InicioSesionDto } from './dto/inicio-sesion.dto';
import { RegistroDto } from './dto/registro.dto';

@Controller('autenticacion')
export class AutenticacionController {
  constructor(private autenticacionService: AutenticacionService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() inicioSesionDto: InicioSesionDto) {
    const usuario = await this.autenticacionService.validarUsuario(inicioSesionDto);
    return this.autenticacionService.login(usuario);
  }

  @Post('registro')
  async registro(@Body() registroDto: RegistroDto) {
    return this.autenticacionService.registro(registroDto);
  }
}
