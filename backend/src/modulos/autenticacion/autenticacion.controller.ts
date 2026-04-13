import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { AutenticacionService } from './autenticacion.service';
import { InicioSesionDto } from './dto/inicio-sesion.dto';
import { RegistroDto } from './dto/registro.dto';
import { Public } from '../../compartido/decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AllowGlobal } from '../../compartido/decorators/allow-global.decorator';

@Controller('autenticacion')
export class AutenticacionController {
  constructor(private autenticacionService: AutenticacionService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() inicioSesionDto: InicioSesionDto) {
    const usuario = await this.autenticacionService.validarUsuario(inicioSesionDto);
    return this.autenticacionService.login(usuario);
  }

  @Public()
  @Post('registro')
  async registro(@Body() registroDto: RegistroDto) {
    return this.autenticacionService.registro(registroDto);
  }

  @AllowGlobal()
  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    return this.autenticacionService.refrescarToken(userId);
  }
}
