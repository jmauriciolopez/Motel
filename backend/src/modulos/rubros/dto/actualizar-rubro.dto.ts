import { PartialType } from '@nestjs/mapped-types';
import { CrearRubroDto } from './crear-rubro.dto';

export class ActualizarRubroDto extends PartialType(CrearRubroDto) {}
