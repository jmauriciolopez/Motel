import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CrearTransferenciaDetalleRecursoDto } from './crear-transferencia-detalle-recurso.dto';

export class ActualizarTransferenciaDetalleRecursoDto extends PartialType(
  OmitType(CrearTransferenciaDetalleRecursoDto, [
    'motelId',
    'transferenciaId',
  ] as const),
) {}
