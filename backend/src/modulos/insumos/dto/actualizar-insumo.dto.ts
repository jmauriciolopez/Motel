import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CrearInsumoDto } from './crear-insumo.dto';

export class ActualizarInsumoDto extends PartialType(
  OmitType(CrearInsumoDto, ['motelId', 'detalles'] as const),
) {}
