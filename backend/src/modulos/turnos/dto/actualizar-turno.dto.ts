import { PartialType } from '@nestjs/mapped-types';
import { CrearTurnoDto } from './crear-turno.dto';

export class ActualizarTurnoDto extends PartialType(CrearTurnoDto) {}
