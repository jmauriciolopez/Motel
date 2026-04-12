import { IsString, IsNumber, IsBoolean, IsDateString, IsArray, ValidateNested, IsOptional } from 'class-validator';
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

  @IsString()
  @IsOptional()
  usuarioId?: string;

  @IsString()
  @IsOptional()
  proveedorId?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CrearCompraDetalleDto)
  detalles?: CrearCompraDetalleDto[];
}
