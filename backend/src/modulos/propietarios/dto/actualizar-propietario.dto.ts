import { PartialType } from '@nestjs/mapped-types';
import { CrearPropietarioDto } from './crear-propietario.dto';

export class ActualizarPropietarioDto extends PartialType(CrearPropietarioDto) {}
