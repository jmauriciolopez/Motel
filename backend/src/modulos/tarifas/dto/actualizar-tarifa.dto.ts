import { PartialType } from '@nestjs/mapped-types';
import { CrearTarifaDto } from './crear-tarifa.dto';

export class ActualizarTarifaDto extends PartialType(CrearTarifaDto) {}
