import { Controller } from '@nestjs/common';
import { ConsumosService } from './consumos.service';
import { BaseController } from '../../compartido/bases/base.controller';
import { Consumo } from '@prisma/client';
import { CrearConsumoDto } from './dto/crear-consumo.dto';
import { ActualizarConsumoDto } from './dto/actualizar-consumo.dto';

@Controller('consumos')
export class ConsumosController extends BaseController<Consumo, CrearConsumoDto, ActualizarConsumoDto> {
  constructor(private readonly consumosService: ConsumosService) {
    super(consumosService);
  }
}
