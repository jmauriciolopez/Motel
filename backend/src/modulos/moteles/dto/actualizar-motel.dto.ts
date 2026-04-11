import { PartialType } from '@nestjs/mapped-types';
import { CrearMotelDto } from './crear-motel.dto';

export class ActualizarMotelDto extends PartialType(CrearMotelDto) {}
