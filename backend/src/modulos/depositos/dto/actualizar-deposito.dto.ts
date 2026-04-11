import { PartialType } from '@nestjs/mapped-types';
import { CrearDepositoDto } from './crear-deposito.dto';

export class ActualizarDepositoDto extends PartialType(CrearDepositoDto) {}
