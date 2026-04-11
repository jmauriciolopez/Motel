import { PartialType } from '@nestjs/mapped-types';
import { CrearMovilidadDto } from './crear-movilidad.dto';

export class ActualizarMovilidadDto extends PartialType(CrearMovilidadDto) {}
