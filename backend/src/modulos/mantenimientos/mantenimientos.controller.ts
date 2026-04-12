import { Controller, Post, Patch, Body, Param, Request, UseGuards, BadRequestException } from '@nestjs/common';
import { MantenimientosService } from './mantenimientos.service';
import { BaseController } from '../../compartido/bases/base.controller';
import { Mantenimiento } from '@prisma/client';
import { CrearMantenimientoDto } from './dto/crear-mantenimiento.dto';
import { ActualizarMantenimientoDto } from './dto/actualizar-mantenimiento.dto';
import { JwtAuthGuard } from '../autenticacion/guards/jwt-auth.guard';
import { TenantContext } from '../../compartido/interfaces/tenant-context.interface';

@Controller('mantenimientos')
export class MantenimientosController extends BaseController<Mantenimiento, CrearMantenimientoDto, ActualizarMantenimientoDto> {
  constructor(private readonly mantenimientosService: MantenimientosService) {
    super(mantenimientosService);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  override crear(@Request() req: any, @Body() body: any) {
    const tenant = req.tenant as TenantContext;
    if (!tenant?.motelId) throw new BadRequestException('Indicá un motel activo');

    const { habitacion, proveedor, usuario, motel, ...clean } = body;

    const data: CrearMantenimientoDto = {
      cuando: clean.Cuando ?? clean.cuando,
      observacion: clean.Observacion ?? clean.observacion,
      finalizado: clean.Finalizado ?? clean.finalizado ?? false,
      habitacionId: clean.habitacionId,
      motelId: tenant.motelId,
      usuarioId: req.user?.id ?? req.user?.sub,
      ...(clean.proveedorId ? { proveedorId: clean.proveedorId } : {}),
    };

    return this.mantenimientosService.crear(data);
  }

  @Patch(':id/finalizar')
  finalizar(@Param('id') id: string) {
    return this.mantenimientosService.finalizar(id);
  }
}
