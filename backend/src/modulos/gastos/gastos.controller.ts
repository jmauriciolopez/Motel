import { Controller } from '@nestjs/common';
import { GastosService } from './gastos.service';
import { BaseController } from '../../compartido/bases/base.controller';
import { Gasto } from '@prisma/client';
import { CrearGastoDto } from './dto/crear-gasto.dto';
import { ActualizarGastoDto } from './dto/actualizar-gasto.dto';

@Controller('gastos')
export class GastosController extends BaseController<Gasto, CrearGastoDto, ActualizarGastoDto> {
  constructor(private readonly gastosService: GastosService) {
    super(gastosService);
  }
}
