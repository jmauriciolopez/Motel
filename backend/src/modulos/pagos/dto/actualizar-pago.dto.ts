import { PartialType } from '@nestjs/mapped-types';
import { CrearPagoDto } from './crear-pago.dto';

export class ActualizarPagoDto extends PartialType(CrearPagoDto) {}
