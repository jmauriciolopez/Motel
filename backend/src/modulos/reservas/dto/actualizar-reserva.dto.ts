import { PartialType } from '@nestjs/mapped-types';
import { CrearReservaDto } from './crear-reserva.dto';

export class ActualizarReservaDto extends PartialType(CrearReservaDto) {}
