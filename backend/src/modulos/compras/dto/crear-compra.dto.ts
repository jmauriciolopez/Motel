import { IsString, IsNumber, IsBoolean, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CrearCompraDetalleDto } from './crear-compra-detalle.dto';

export class CrearCompraDto {
  @IsDateString()
  fecha: string;

  @IsNumber()
  total: number;

  @IsBoolean()
  finalizada: boolean;

  @IsString()
  depositoId: string;

  @IsString()
  motelId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CrearCompraDetalleDto)
  detalles: CrearCompraDetalleDto[];
}
