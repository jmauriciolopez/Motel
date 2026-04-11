import { PartialType } from '@nestjs/mapped-types';
import { CrearConsumoDto } from './crear-consumo.dto';

export class ActualizarConsumoDto extends PartialType(CrearConsumoDto) {}
