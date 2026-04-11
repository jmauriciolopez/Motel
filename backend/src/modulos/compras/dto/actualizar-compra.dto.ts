import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CrearCompraDto } from './crear-compra.dto';

export class ActualizarCompraDto extends PartialType(
  OmitType(CrearCompraDto, ['motelId', 'detalles'] as const),
) {}
