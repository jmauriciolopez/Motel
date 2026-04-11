import { PartialType } from '@nestjs/mapped-types';
import { CrearStockDto } from './crear-stock.dto';

export class ActualizarStockDto extends PartialType(CrearStockDto) {}
