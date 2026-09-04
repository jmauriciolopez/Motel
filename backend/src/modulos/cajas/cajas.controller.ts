import { Body, Controller, Post, Request, BadRequestException, UseGuards } from '@nestjs/common';
import { CajasService } from './cajas.service';
import { BaseController } from '../../compartido/bases/base.controller';
import { Caja } from '@prisma/client';
import { CrearCajaDto, ActualizarCajaDto } from './dto/cajas.dto';
import { JwtAuthGuard } from '../../modulos/autenticacion/guards/jwt-auth.guard';
import { TenantContext } from '../../compartido/interfaces/tenant-context.interface';

@Controller('cajas')
export class CajasController extends BaseController<Caja, CrearCajaDto, ActualizarCajaDto> {
  constructor(private readonly cajasService: CajasService) {
    super(cajasService);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  crear(@Request() req: any, @Body() createDto: CrearCajaDto) {
    const tenant = req.tenant as TenantContext;
    const usuarioId = req.user?.id ?? req.user?.sub;
    if (!tenant?.motelId) {
      throw new BadRequestException('Contexto de motel no disponible');
    }
    if (!usuarioId) {
      throw new BadRequestException('Usuario no identificado para registrar caja');
    }

    return this.cajasService.crear(
      { ...createDto, motelId: tenant.motelId },
      usuarioId,
    );
  }
}
