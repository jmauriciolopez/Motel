import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CrearTransferenciaDto } from './crear-transferencia.dto';

export class ActualizarTransferenciaDto extends PartialType(
  OmitType(CrearTransferenciaDto, ['motelId', 'detalles'] as const),
) {}
