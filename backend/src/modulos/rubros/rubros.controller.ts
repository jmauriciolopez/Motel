import { Controller } from '@nestjs/common';
import { RubrosService } from './rubros.service';
import { BaseController } from '../../compartido/bases/base.controller';
import { Rubro } from '@prisma/client';
import { CrearRubroDto } from './dto/crear-rubro.dto';
import { ActualizarRubroDto } from './dto/actualizar-rubro.dto';

@Controller('rubros')
export class RubrosController extends BaseController<Rubro, CrearRubroDto, ActualizarRubroDto> {
  constructor(private readonly rubrosService: RubrosService) {
    super(rubrosService);
  }
}
