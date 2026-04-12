import { Controller, Post, Body, Patch, Param, Request, UseGuards, BadRequestException } from '@nestjs/common';
import { LimpiezasService } from './limpiezas.service';
import { BaseController } from '../../compartido/bases/base.controller';
import { Limpieza } from '@prisma/client';
import { CrearLimpiezaDto } from './dto/crear-limpieza.dto';
import { ActualizarLimpiezaDto } from './dto/actualizar-limpieza.dto';
import { JwtAuthGuard } from '../autenticacion/guards/jwt-auth.guard';
import { TenantContext } from '../../compartido/interfaces/tenant-context.interface';

@Controller('limpiezas')
export class LimpiezasController extends BaseController<Limpieza, CrearLimpiezaDto, ActualizarLimpiezaDto> {
  constructor(private readonly limpiezasService: LimpiezasService) {
    super(limpiezasService);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  override crear(@Request() req: any, @Body() body: any) {
    const tenant = req.tenant as TenantContext;
    if (!tenant?.motelId) throw new BadRequestException('Indicá un motel activo');

    const { turno, habitacion, usuario, motel, ...clean } = body;

    const data: CrearLimpiezaDto = {
      turnoId: clean.turnoId,
      habitacionId: clean.habitacionId,
      usuarioId: clean.usuarioId ?? req.user?.id ?? req.user?.sub,
      motelId: tenant.motelId,
      Cuando: clean.Cuando ?? new Date().toISOString(),
      Observacion: clean.Observacion ?? clean.observacion,
      Finalizado: true,
    };

    return this.limpiezasService.crear(data);
  }
}
