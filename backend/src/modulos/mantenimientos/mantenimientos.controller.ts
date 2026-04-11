import { Controller, Patch, Param } from '@nestjs/common';
import { MantenimientosService } from './mantenimientos.service';
import { BaseController } from '../../compartido/bases/base.controller';
import { Mantenimiento } from '@prisma/client';
import { CrearMantenimientoDto } from './dto/crear-mantenimiento.dto';
import { ActualizarMantenimientoDto } from './dto/actualizar-mantenimiento.dto';

@Controller('mantenimientos')
export class MantenimientosController extends BaseController<Mantenimiento, CrearMantenimientoDto, ActualizarMantenimientoDto> {
  constructor(private readonly mantenimientosService: MantenimientosService) {
    super(mantenimientosService);
  }

  @Patch(':id/finalizar')
  finalizar(@Param('id') id: string) {
    return this.mantenimientosService.finalizar(id);
  }
}
