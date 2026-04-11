import { PartialType } from '@nestjs/mapped-types';
import { CrearLimpiezaDto } from './crear-limpieza.dto';

export class ActualizarLimpiezaDto extends PartialType(CrearLimpiezaDto) {}
