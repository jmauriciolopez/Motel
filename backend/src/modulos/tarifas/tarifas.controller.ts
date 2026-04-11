import { Controller } from '@nestjs/common';
import { TarifasService } from './tarifas.service';
import { BaseController } from '../../compartido/bases/base.controller';
import { Tarifa } from '@prisma/client';
import { CrearTarifaDto } from './dto/crear-tarifa.dto';
import { ActualizarTarifaDto } from './dto/actualizar-tarifa.dto';

@Controller('tarifas')
export class TarifasController extends BaseController<Tarifa, CrearTarifaDto, ActualizarTarifaDto> {
  constructor(private readonly tarifasService: TarifasService) {
    super(tarifasService);
  }
}
