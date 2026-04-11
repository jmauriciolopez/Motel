import { Controller, Patch, Param } from '@nestjs/common';
import { LimpiezasService } from './limpiezas.service';
import { BaseController } from '../../compartido/bases/base.controller';
import { Limpieza } from '@prisma/client';
import { CrearLimpiezaDto } from './dto/crear-limpieza.dto';
import { ActualizarLimpiezaDto } from './dto/actualizar-limpieza.dto';

@Controller('limpiezas')
export class LimpiezasController extends BaseController<Limpieza, CrearLimpiezaDto, ActualizarLimpiezaDto> {
  constructor(private readonly limpiezasService: LimpiezasService) {
    super(limpiezasService);
  }

  @Patch(':id/finalizar')
  finalizar(@Param('id') id: string) {
    return this.limpiezasService.finalizar(id);
  }
}
