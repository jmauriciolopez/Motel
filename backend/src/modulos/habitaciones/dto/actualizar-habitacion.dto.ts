import { PartialType } from '@nestjs/mapped-types';
import { CrearHabitacionDto } from './crear-habitacion.dto';

export class ActualizarHabitacionDto extends PartialType(CrearHabitacionDto) {}
