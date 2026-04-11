import { Controller } from '@nestjs/common';
import { MovilidadesService } from './movilidades.service';
import { BaseController } from '../../compartido/bases/base.controller';
import { Movilidad } from '@prisma/client';
import { CrearMovilidadDto } from './dto/crear-movilidad.dto';
import { ActualizarMovilidadDto } from './dto/actualizar-movilidad.dto';

@Controller('movilidades')
export class MovilidadesController extends BaseController<Movilidad, CrearMovilidadDto, ActualizarMovilidadDto> {
  constructor(private readonly movilidadesService: MovilidadesService) {
    super(movilidadesService);
  }
}
