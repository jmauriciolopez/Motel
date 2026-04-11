import { PartialType } from '@nestjs/mapped-types';
import { CrearMantenimientoDto } from './crear-mantenimiento.dto';

export class ActualizarMantenimientoDto extends PartialType(CrearMantenimientoDto) {}
