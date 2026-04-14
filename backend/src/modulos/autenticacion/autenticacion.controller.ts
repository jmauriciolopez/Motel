import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Request, Res } from '@nestjs/common';
import { Response } from 'express';
import { AutenticacionService } from './autenticacion.service';
import { InicioSesionDto } from './dto/inicio-sesion.dto';
import { RegistroDto } from './dto/registro.dto';
import { Public } from '../../compartido/decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AllowGlobal } from '../../compartido/decorators/allow-global.decorator';

const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? ('none' as const) : ('lax' as const),
  maxAge: 24 * 60 * 60 * 1000, // 1 día
  path: '/',
};

@Controller('autenticacion')
export class AutenticacionController {
  constructor(private autenticacionService: AutenticacionService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() inicioSesionDto: InicioSesionDto, @Res({ passthrough: true }) res: Response) {
    const usuario = await this.autenticacionService.validarUsuario(inicioSesionDto);
    const result = await this.autenticacionService.login(usuario);
    res.cookie('token', result.token, COOKIE_OPTIONS);
    return { usuario: result.usuario };
  }

  @Public()
  @Post('registro')
  async registro(@Body() registroDto: RegistroDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.autenticacionService.registro(registroDto);
    res.cookie('token', result.token, COOKIE_OPTIONS);
    return { usuario: result.usuario };
  }

  @AllowGlobal()
  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    const userId = req.user?.sub || req.user?.id;
    const result = await this.autenticacionService.refrescarToken(userId);
    res.cookie('token', result.token, COOKIE_OPTIONS);
    return { usuario: result.usuario };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('token', { path: '/', sameSite: 'none', secure: true });
    return { message: 'Sesión cerrada' };
  }
}
