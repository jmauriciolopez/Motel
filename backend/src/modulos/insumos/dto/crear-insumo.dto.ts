import { IsString, IsBoolean, IsOptional, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CrearInsumoDetalleDto } from './crear-insumo-detalle.dto';

export class CrearInsumoDto {
  @IsDateString()
  fecha: string;

  @IsString()
  @IsOptional()
  observacion?: string;

  @IsBoolean()
  finalizada: boolean;

  @IsString()
  depositoId: string;

  @IsString()
  motelId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CrearInsumoDetalleDto)
  detalles: CrearInsumoDetalleDto[];
}
